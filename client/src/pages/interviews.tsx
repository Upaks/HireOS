import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import { Interview } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CalendarClock, Clock, User, Check, AlertCircle, Trash2 } from "lucide-react";
import React from "react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Interviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch interviews from the API
  const { data: interviews = [], isLoading } = useQuery<Interview[]>({
    queryKey: ['/api/interviews'],
    queryFn: async () => {
      const response = await fetch('/api/interviews', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch interviews');
      return await response.json();
    }
  });

  // Delete interview mutation
  const deleteInterviewMutation = useMutation({
    mutationFn: async (interviewId: number) => {
      const response = await fetch(`/api/interviews/${interviewId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete interview');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      toast({
        title: "Interview deleted",
        description: "The cancelled interview has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete interview. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const renderInterviewStatus = (status: string) => {
    switch(status) {
      case 'scheduled':
        return <Badge variant="outline" className="flex items-center gap-1 text-blue-500 bg-blue-50 border-blue-200">
          <CalendarClock className="w-3 h-3" /> Scheduled
        </Badge>;
      case 'completed':
        return <Badge variant="outline" className="flex items-center gap-1 text-green-500 bg-green-50 border-green-200">
          <Check className="w-3 h-3" /> Completed
        </Badge>;
      case 'pending':
        return <Badge variant="outline" className="flex items-center gap-1 text-amber-500 bg-amber-50 border-amber-200">
          <Clock className="w-3 h-3" /> Pending
        </Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="flex items-center gap-1 text-red-500 bg-red-50 border-red-200">
          <AlertCircle className="w-3 h-3" /> Cancelled
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <AppShell>
      <TopBar title="Interviews" />
      
      <div className="bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Interview Schedule</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage candidate interviews and evaluations
          </p>
        </div>
        
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            <TabsTrigger value="all">All Interviews</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ? (
                <p className="col-span-full text-center py-8 text-slate-500">Loading interviews...</p>
              ) : interviews.filter(i => i.status === 'scheduled' || i.status === 'pending').length > 0 ? (
                interviews
                  .filter(interview => interview.status === 'scheduled' || interview.status === 'pending')
                  .map(interview => (
                    <InterviewCard 
                      key={interview.id} 
                      interview={interview} 
                      renderStatus={renderInterviewStatus} 
                    />
                  ))
              ) : (
                <p className="col-span-full text-center py-8 text-slate-500">
                  No upcoming interviews scheduled
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="completed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ? (
                <p className="col-span-full text-center py-8 text-slate-500">Loading interviews...</p>
              ) : interviews.filter(i => i.status === 'completed').length > 0 ? (
                interviews
                  .filter(interview => interview.status === 'completed')
                  .map(interview => (
                    <InterviewCard 
                      key={interview.id} 
                      interview={interview} 
                      renderStatus={renderInterviewStatus} 
                    />
                  ))
              ) : (
                <p className="col-span-full text-center py-8 text-slate-500">
                  No completed interviews found
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="cancelled">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ? (
                <p className="col-span-full text-center py-8 text-slate-500">Loading interviews...</p>
              ) : interviews.filter(i => i.status === 'cancelled').length > 0 ? (
                interviews
                  .filter(interview => interview.status === 'cancelled')
                  .map(interview => (
                    <InterviewCard 
                      key={interview.id} 
                      interview={interview} 
                      renderStatus={renderInterviewStatus}
                      onDelete={deleteInterviewMutation.mutate}
                      isDeleting={deleteInterviewMutation.isPending}
                    />
                  ))
              ) : (
                <p className="col-span-full text-center py-8 text-slate-500">
                  No cancelled interviews found
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ? (
                <p className="col-span-full text-center py-8 text-slate-500">Loading interviews...</p>
              ) : interviews.length > 0 ? (
                interviews.map(interview => (
                  <InterviewCard 
                    key={interview.id} 
                    interview={interview} 
                    renderStatus={renderInterviewStatus}
                    onDelete={interview.status === 'cancelled' ? deleteInterviewMutation.mutate : undefined}
                    isDeleting={deleteInterviewMutation.isPending}
                  />
                ))
              ) : (
                <p className="col-span-full text-center py-8 text-slate-500">
                  No interviews found
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

interface InterviewCardProps {
  interview: Interview;
  renderStatus: (status: string) => React.ReactNode;
  onDelete?: (interviewId: number) => void;
  isDeleting?: boolean;
}

function InterviewCard({ interview, renderStatus, onDelete, isDeleting }: InterviewCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const scheduledDate = interview.scheduledDate ? new Date(interview.scheduledDate) : null;
  const formattedDate = scheduledDate ? 
    `${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
    : 'Not scheduled';
  
  const timeAgo = scheduledDate && scheduledDate > new Date() ?
    `${formatDistanceToNow(scheduledDate)} from now` :
    scheduledDate ? `${formatDistanceToNow(scheduledDate)} ago` : '';
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-slate-50 pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-medium">
            {interview.candidate?.name || 'Candidate'}
          </CardTitle>
          {renderStatus(interview.status)}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center text-slate-700">
              <Clock className="w-4 h-4 mr-1.5" /> 
              {formattedDate}
            </div>
            {timeAgo && <span className="text-slate-500 text-xs">{timeAgo}</span>}
          </div>
          
          {interview.interviewer && (
            <div className="flex items-center text-sm text-slate-700">
              <User className="w-4 h-4 mr-1.5" /> 
              Interviewer: {interview.interviewer.fullName}
            </div>
          )}
          
          <div className="flex items-center text-sm text-slate-700">
            <CalendarClock className="w-4 h-4 mr-1.5" /> 
            Type: {interview.type.charAt(0).toUpperCase() + interview.type.slice(1)} Interview
          </div>
          
          <div className="pt-3 flex justify-between items-center gap-2">
            <Link href={`/interviews/${interview.id}`}>
              <Button variant="outline" size="sm">View Details</Button>
            </Link>
            
            <div className="flex gap-2">
              {interview.status === 'completed' && (
                <Link href={`/interviews/${interview.id}`}>
                  <Button size="sm">Grade Interview</Button>
                </Link>
              )}
              
              {interview.status === 'cancelled' && onDelete && (
                <>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isDeleting}
                    className="p-2"
                    title="Delete interview"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  
                  <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Interview?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this cancelled interview? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            onDelete(interview.id);
                            setShowDeleteDialog(false);
                          }}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}