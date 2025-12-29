import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Fetch unread count
  const { data: unreadCount = { count: 0 } } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications/unread-count");
      return await res.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Fetch recent notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", { limit: 10 }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications?limit=10");
      return await res.json();
    },
    enabled: open, // Only fetch when popover is open
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "All notifications marked as read",
      });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to link if available
    if (notification.link) {
      setLocation(notification.link);
      setOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "interview_scheduled":
        return "📅";
      case "offer_sent":
        return "📧";
      case "offer_accepted":
        return "✅";
      case "offer_rejected":
        return "❌";
      case "job_posted":
        return "📢";
      case "new_application":
        return "👤";
      case "candidate_status_changed":
        return "🔄";
      case "interview_evaluated":
        return "📝";
      default:
        return "🔔";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount.count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount.count > 9 ? "9+" : unreadCount.count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.filter((n) => !n.read).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              {markAllAsReadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Mark all read"
              )}
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left p-4 hover:bg-accent transition-colors ${
                    !notification.read ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl mt-1">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-sm font-medium ${
                            !notification.read ? "font-semibold" : ""
                          }`}
                        >
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="h-2 w-2 bg-blue-600 rounded-full ml-2 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setLocation("/notifications");
              setOpen(false);
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

