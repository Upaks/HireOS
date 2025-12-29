import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Trash2, Send } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: number;
  userId: number;
  content: string;
  mentions: number[] | null;
  createdAt: string;
  user?: {
    id: number;
    fullName: string;
    email: string;
    role: string;
  };
}

interface CommentsSectionProps {
  entityType: "candidate" | "job";
  entityId: number;
}

export default function CommentsSection({ entityType, entityId }: CommentsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ["/api/comments", entityType, entityId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/comments?entityType=${entityType}&entityId=${entityId}`);
      return await res.json();
    },
  });

  // Fetch users for mention autocomplete
  const { data: mentionUsers = [] } = useQuery({
    queryKey: ["/api/users/mention-autocomplete", mentionQuery],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/mention-autocomplete${mentionQuery ? `?q=${encodeURIComponent(mentionQuery)}` : ""}`);
      return await res.json();
    },
    enabled: showMentionPopover && mentionQuery.length > 0,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/comments", {
        entityType,
        entityId,
        content,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", entityType, entityId] });
      setCommentText("");
      toast({
        title: "Comment posted",
        description: "Your comment has been added.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to post comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", entityType, entityId] });
      toast({
        title: "Comment deleted",
        description: "The comment has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle @mention detection
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCommentText(value);

    // Check for @mention
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's a space after @ (meaning mention is complete)
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setMentionStartIndex(lastAtIndex);
        setMentionQuery(textAfterAt);
        setShowMentionPopover(true);
      } else {
        setShowMentionPopover(false);
      }
    } else {
      setShowMentionPopover(false);
    }
  };

  // Insert mention into text
  const insertMention = (username: string) => {
    if (mentionStartIndex === -1) return;

    const beforeMention = commentText.substring(0, mentionStartIndex);
    const afterMention = commentText.substring(mentionStartIndex + 1 + mentionQuery.length);
    const newText = `${beforeMention}@${username} ${afterMention}`;
    
    setCommentText(newText);
    setShowMentionPopover(false);
    setMentionQuery("");
    setMentionStartIndex(-1);

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = beforeMention.length + username.length + 2; // +2 for @ and space
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Highlight mentions in comment content
  const highlightMentions = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span key={index} className="text-blue-600 font-medium">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          placeholder="Add a comment... Use @ to mention someone"
          value={commentText}
          onChange={handleTextChange}
          className="min-h-[100px]"
          disabled={createCommentMutation.isPending}
        />
        <div className="flex justify-end">
          <Button
            onClick={() => createCommentMutation.mutate(commentText)}
            disabled={!commentText.trim() || createCommentMutation.isPending}
            size="sm"
          >
            {createCommentMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Post Comment
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mention Autocomplete Popover */}
      {showMentionPopover && (
        <Popover open={showMentionPopover} onOpenChange={setShowMentionPopover}>
          <PopoverTrigger asChild>
            <div className="hidden" />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <ScrollArea className="h-48">
              {mentionUsers.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No users found
                </div>
              ) : (
                <div className="py-1">
                  {mentionUsers.map((mentionUser: any) => (
                    <button
                      key={mentionUser.id}
                      onClick={() => insertMention(mentionUser.username || mentionUser.fullName)}
                      className="w-full px-4 py-2 text-left hover:bg-accent flex items-center space-x-2"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(mentionUser.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {mentionUser.fullName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {mentionUser.email}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {comment.user ? getInitials(comment.user.fullName) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
                    {comment.user?.fullName || "Unknown User"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                  {(user?.id === comment.userId || user?.role === "admin" || user?.role === "ceo" || user?.role === "coo") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this comment?")) {
                          deleteCommentMutation.mutate(comment.id);
                        }
                      }}
                      disabled={deleteCommentMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="text-sm text-foreground">
                  {highlightMentions(comment.content)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

