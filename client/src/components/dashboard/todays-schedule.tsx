import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Video,
  CalendarDays,
  User,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import { Interview } from "@/types";
import { format, isToday, isTomorrow, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from "date-fns";

export default function TodaysSchedule() {
  const queryClient = useQueryClient();
  
  const { data: interviews, isLoading, refetch } = useQuery<Interview[]>({
    queryKey: ['/api/interviews'],
    queryFn: async () => {
      const res = await fetch('/api/interviews');
      if (!res.ok) throw new Error('Failed to fetch interviews');
      return res.json();
    },
  });

  // Filter interviews for today
  const todaysInterviews = interviews?.filter(interview => {
    if (!interview.scheduledDate) return false;
    const scheduledDate = new Date(interview.scheduledDate);
    return isToday(scheduledDate) && interview.status === 'scheduled';
  }).sort((a, b) => {
    const dateA = new Date(a.scheduledDate!);
    const dateB = new Date(b.scheduledDate!);
    return dateA.getTime() - dateB.getTime();
  }) || [];

  // Count tomorrow's interviews
  const tomorrowsInterviews = interviews?.filter(interview => {
    if (!interview.scheduledDate) return false;
    const scheduledDate = new Date(interview.scheduledDate);
    return isTomorrow(scheduledDate) && interview.status === 'scheduled';
  }) || [];

  // Count this week's interviews (excluding today)
  const now = new Date();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const thisWeeksInterviews = interviews?.filter(interview => {
    if (!interview.scheduledDate) return false;
    const scheduledDate = new Date(interview.scheduledDate);
    return scheduledDate > endOfDay(now) && 
           scheduledDate <= weekEnd && 
           interview.status === 'scheduled';
  }) || [];

  const getInterviewTypeBadge = (type: string) => {
    const typeStyles: Record<string, { bg: string; text: string }> = {
      'screening': { bg: 'bg-blue-100', text: 'text-blue-700' },
      'technical': { bg: 'bg-purple-100', text: 'text-purple-700' },
      'cultural': { bg: 'bg-green-100', text: 'text-green-700' },
      'final': { bg: 'bg-amber-100', text: 'text-amber-700' },
      'phone': { bg: 'bg-slate-100', text: 'text-slate-700' },
    };
    const style = typeStyles[type.toLowerCase()] || typeStyles['phone'];
    return (
      <Badge variant="secondary" className={`${style.bg} ${style.text} text-xs font-medium`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Calendar className="h-5 w-5 text-primary" />
            Today's Interviews
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : todaysInterviews.length === 0 ? (
          <div className="text-center py-6">
            <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No interviews scheduled for today</p>
            <Link href="/interviews">
              <Button variant="link" size="sm" className="mt-2">
                View all interviews
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {todaysInterviews.map((interview) => (
              <div
                key={interview.id}
                className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {format(new Date(interview.scheduledDate!), 'h:mm a')}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <p className="text-sm text-slate-600 truncate">
                          {interview.candidate?.name || 'Unknown Candidate'}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {interview.candidate?.job?.title || 'Position not specified'}
                      </p>
                      <div className="mt-2">
                        {getInterviewTypeBadge(interview.type)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {interview.videoUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => window.open(interview.videoUrl, '_blank')}
                      >
                        <Video className="h-3 w-3 mr-1" />
                        Join
                      </Button>
                    )}
                    <Link href={`/interviews`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs w-full">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Summary section */}
        <div className="border-t border-slate-200 pt-3 mt-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <CalendarDays className="h-4 w-4" />
              <span>Tomorrow:</span>
              <span className="font-medium text-slate-900">{tomorrowsInterviews.length}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span>This week:</span>
              <span className="font-medium text-slate-900">{thisWeeksInterviews.length}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
