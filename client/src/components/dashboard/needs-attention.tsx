import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertTriangle, 
  Clock, 
  MessageSquare, 
  FileText,
  CheckCircle,
  ChevronRight,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { Candidate, Interview } from "@/types";

interface AttentionItem {
  id: string;
  type: "critical" | "warning" | "success";
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  linkText: string;
}

export default function NeedsAttention() {
  // Fetch candidates to check for pending reviews and offers
  const { data: candidates, isLoading: isLoadingCandidates } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates'],
    queryFn: async () => {
      const res = await fetch('/api/candidates');
      if (!res.ok) throw new Error('Failed to fetch candidates');
      return res.json();
    },
  });

  // Fetch interviews to check for pending feedback
  const { data: interviews, isLoading: isLoadingInterviews } = useQuery<Interview[]>({
    queryKey: ['/api/interviews'],
    queryFn: async () => {
      const res = await fetch('/api/interviews');
      if (!res.ok) throw new Error('Failed to fetch interviews');
      return res.json();
    },
  });

  const isLoading = isLoadingCandidates || isLoadingInterviews;

  // Calculate attention items
  const attentionItems: AttentionItem[] = [];

  if (!isLoading) {
    // Check for candidates waiting for review (in "applied" status for more than 5 days)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    const awaitingReview = candidates?.filter(c => {
      const createdAt = new Date(c.createdAt);
      return c.status === 'applied' && createdAt < fiveDaysAgo;
    }) || [];

    if (awaitingReview.length > 0) {
      attentionItems.push({
        id: "awaiting-review",
        type: "critical",
        icon: <Clock className="h-4 w-4" />,
        title: `${awaitingReview.length} candidate${awaitingReview.length > 1 ? 's' : ''} awaiting review`,
        description: "Waiting over 5 days for review",
        link: "/candidates",
        linkText: "Review now"
      });
    }

    // Check for interviews without evaluations (completed but no feedback)
    const pendingFeedback = interviews?.filter(i => 
      i.status === 'completed' && !i.evaluation
    ) || [];

    if (pendingFeedback.length > 0) {
      attentionItems.push({
        id: "pending-feedback",
        type: "warning",
        icon: <MessageSquare className="h-4 w-4" />,
        title: `${pendingFeedback.length} interview${pendingFeedback.length > 1 ? 's' : ''} pending feedback`,
        description: "Feedback submission required",
        link: "/interviews",
        linkText: "Add feedback"
      });
    }

    // Check for candidates with pending offers (offer_sent status for more than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const pendingOffers = candidates?.filter(c => {
      if (c.finalDecisionStatus !== 'offer_sent') return false;
      const updatedAt = new Date(c.updatedAt);
      return updatedAt < sevenDaysAgo;
    }) || [];

    if (pendingOffers.length > 0) {
      attentionItems.push({
        id: "pending-offers",
        type: "warning",
        icon: <FileText className="h-4 w-4" />,
        title: `${pendingOffers.length} offer${pendingOffers.length > 1 ? 's' : ''} awaiting response`,
        description: "Pending for over 7 days",
        link: "/reviews",
        linkText: "Follow up"
      });
    }

    // If everything is good, show success message
    if (attentionItems.length === 0) {
      attentionItems.push({
        id: "all-good",
        type: "success",
        icon: <CheckCircle className="h-4 w-4" />,
        title: "All caught up!",
        description: "No items require your attention",
        link: "/candidates",
        linkText: "View candidates"
      });
    }
  }

  const getItemStyles = (type: AttentionItem["type"]) => {
    switch (type) {
      case "critical":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          icon: "bg-red-100 text-red-600",
          text: "text-red-800",
          desc: "text-red-600",
          link: "text-red-700 hover:text-red-800"
        };
      case "warning":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
          icon: "bg-amber-100 text-amber-600",
          text: "text-amber-800",
          desc: "text-amber-600",
          link: "text-amber-700 hover:text-amber-800"
        };
      case "success":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          icon: "bg-green-100 text-green-600",
          text: "text-green-800",
          desc: "text-green-600",
          link: "text-green-700 hover:text-green-800"
        };
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Needs Your Attention
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          attentionItems.map((item) => {
            const styles = getItemStyles(item.type);
            return (
              <div
                key={item.id}
                className={`rounded-lg border p-3 ${styles.bg} ${styles.border}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-full p-1.5 ${styles.icon}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${styles.text}`}>
                      {item.title}
                    </p>
                    <p className={`text-xs mt-0.5 ${styles.desc}`}>
                      {item.description}
                    </p>
                    <Link 
                      href={item.link}
                      className={`inline-flex items-center gap-1 text-xs font-medium mt-2 ${styles.link}`}
                    >
                      {item.linkText}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
