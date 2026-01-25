import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  CheckCircle, 
  Calendar, 
  Mail,
  TrendingUp,
  Loader2
} from "lucide-react";
import { Candidate, Interview } from "@/types";
import { isThisWeek, parseISO } from "date-fns";

export default function ThisWeekActivity() {
  // Fetch candidates
  const { data: candidates, isLoading: isLoadingCandidates } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates'],
    queryFn: async () => {
      const res = await fetch('/api/candidates');
      if (!res.ok) throw new Error('Failed to fetch candidates');
      return res.json();
    },
  });

  // Fetch interviews
  const { data: interviews, isLoading: isLoadingInterviews } = useQuery<Interview[]>({
    queryKey: ['/api/interviews'],
    queryFn: async () => {
      const res = await fetch('/api/interviews');
      if (!res.ok) throw new Error('Failed to fetch interviews');
      return res.json();
    },
  });

  const isLoading = isLoadingCandidates || isLoadingInterviews;

  // Calculate this week's activity
  const thisWeekApps = candidates?.filter(c => {
    try {
      return isThisWeek(parseISO(c.createdAt), { weekStartsOn: 1 });
    } catch { return false; }
  }).length || 0;

  const thisWeekAssessments = candidates?.filter(c => {
    try {
      return c.hiPeopleCompletedAt && isThisWeek(parseISO(c.hiPeopleCompletedAt), { weekStartsOn: 1 });
    } catch { return false; }
  }).length || 0;

  const thisWeekInterviews = interviews?.filter(i => {
    try {
      return i.status === 'completed' && i.conductedDate && 
             isThisWeek(parseISO(i.conductedDate), { weekStartsOn: 1 });
    } catch { return false; }
  }).length || 0;

  const thisWeekOffers = candidates?.filter(c => {
    try {
      return c.finalDecisionStatus === 'offer_sent' && 
             isThisWeek(parseISO(c.updatedAt), { weekStartsOn: 1 });
    } catch { return false; }
  }).length || 0;

  const activityItems = [
    {
      icon: <FileText className="h-4 w-4" />,
      value: thisWeekApps,
      label: "New Applications",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: <CheckCircle className="h-4 w-4" />,
      value: thisWeekAssessments,
      label: "Assessments Done",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      value: thisWeekInterviews,
      label: "Interviews",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      icon: <Mail className="h-4 w-4" />,
      value: thisWeekOffers,
      label: "Offers Sent",
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    }
  ];

  const totalActivity = thisWeekApps + thisWeekAssessments + thisWeekInterviews + thisWeekOffers;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">This Week's Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {activityItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.bgColor} ${item.color}`}>
                    {item.icon}
                  </div>
                  <span className="text-sm text-slate-600">{item.label}</span>
                </div>
                <span className="text-lg font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}

            {/* Summary */}
            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  {totalActivity} total actions
                </span>
                <span className="text-sm text-slate-500">this week</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
