import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function Notifications() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  // Fetch all notifications
  const { data: allNotifications = [], isLoading: isLoadingAll } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", "all"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications");
      return await res.json();
    },
  });

  // Fetch unread notifications
  const { data: unreadNotifications = [], isLoading: isLoadingUnread } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", "unread"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications?read=false");
      return await res.json();
    },
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

  const displayedNotifications = activeTab === "all" ? allNotifications : unreadNotifications;
  const isLoading = activeTab === "all" ? isLoadingAll : isLoadingUnread;

  return (
    <AppShell>
      <TopBar title="Notifications" showNewHiringButton={false} />
      <div className="bg-white p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
              <p className="text-sm text-slate-500 mt-1">
                Stay updated on all hiring activities
              </p>
            </div>
            {unreadNotifications.length > 0 && (
              <Button
                variant="outline"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                {markAllAsReadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Marking...
                  </>
                ) : (
                  "Mark all as read"
                )}
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "unread")}>
          <TabsList>
            <TabsTrigger value="all">
              All
              {allNotifications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {allNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadNotifications.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium">No notifications</p>
                <p className="text-sm mt-1">
                  {activeTab === "unread"
                    ? "You're all caught up!"
                    : "You don't have any notifications yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors hover:bg-accent ${
                      !notification.read
                        ? "bg-blue-50/50 border-blue-200"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl mt-1">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-base ${
                              !notification.read ? "font-semibold" : "font-medium"
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
                        <p className="text-xs text-muted-foreground mt-2">
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
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

