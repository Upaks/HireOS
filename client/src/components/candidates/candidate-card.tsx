import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Candidate } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CandidateCardProps {
  candidate: Candidate;
}

export default function CandidateCard({ candidate }: CandidateCardProps) {
  const { toast } = useToast();
  
  const inviteToInterviewMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const res = await apiRequest("POST", `/api/candidates/${candidateId}/invite-to-interview`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: "Interview invitation sent",
        description: `${candidate.name} has been invited to an interview.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to invite candidate",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const addToTalentPoolMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const res = await apiRequest("POST", `/api/candidates/${candidateId}/talent-pool`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: "Added to talent pool",
        description: `${candidate.name} has been added to the talent pool.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add to talent pool",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const rejectCandidateMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const res = await apiRequest("POST", `/api/candidates/${candidateId}/reject`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: "Candidate rejected",
        description: `${candidate.name} has been rejected.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject candidate",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-blue-100 text-blue-800">New</Badge>;
      case 'assessment_sent':
        return <Badge className="bg-yellow-100 text-yellow-800">Assessment Sent</Badge>;
      case 'assessment_completed':
        return <Badge className="bg-green-100 text-green-800">Assessment Completed</Badge>;
      case 'interview_scheduled':
        return <Badge className="bg-purple-100 text-purple-800">Interview Scheduled</Badge>;
      case 'talent_pool':
        return <Badge className="bg-indigo-100 text-indigo-800">Talent Pool</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'offer_sent':
        return <Badge className="bg-teal-100 text-teal-800">Offer Sent</Badge>;
      case 'hired':
        return <Badge className="bg-emerald-100 text-emerald-800">Hired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const handleInviteToInterview = () => {
    inviteToInterviewMutation.mutate(candidate.id);
  };
  
  const handleAddToTalentPool = () => {
    addToTalentPoolMutation.mutate(candidate.id);
  };
  
  const handleReject = () => {
    rejectCandidateMutation.mutate(candidate.id);
  };
  
  // Only show action buttons for candidates who have completed assessment and are awaiting review
  const showActions = candidate.status === 'assessment_completed';
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-6 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-slate-900">{candidate.name}</h3>
            <p className="text-sm text-slate-500">{candidate.job?.title || `Job ID: ${candidate.jobId}`}</p>
          </div>
          {getStatusBadge(candidate.status)}
        </div>
      </CardHeader>
      
      <CardContent className="px-6 py-5">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-slate-900">{candidate.email}</div>
            <div className="text-sm text-slate-500">{candidate.location || 'Location not specified'}</div>
          </div>
        </div>
        
        {candidate.hiPeoplePercentile !== undefined && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-slate-900 mb-1">HiPeople Assessment</h4>
            <div className="flex items-center">
              <div className="flex-1 bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full" 
                  style={{ width: `${candidate.hiPeoplePercentile}%` }}
                ></div>
              </div>
              <span className="ml-3 text-sm font-medium text-slate-900">{candidate.hiPeoplePercentile}%</span>
            </div>
            {candidate.hiPeopleCompletedAt && (
              <p className="text-xs text-slate-500 mt-1">
                Completed on {new Date(candidate.hiPeopleCompletedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
        
        {candidate.skills && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-slate-900 mb-1">Key Skills</h4>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(candidate.skills)
                ? candidate.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                      {skill}
                    </Badge>
                  ))
                : typeof candidate.skills === 'object' && candidate.skills !== null
                  ? Object.keys(candidate.skills).map((skill) => (
                      <Badge key={skill} variant="secondary" className="bg-blue-100 text-blue-800">
                        {skill}
                      </Badge>
                    ))
                  : <span className="text-sm text-slate-500">No skills listed</span>
              }
            </div>
          </div>
        )}
        
        {showActions && (
          <div className="flex justify-between space-x-3 mt-6">
            <Button
              onClick={handleInviteToInterview}
              disabled={inviteToInterviewMutation.isPending}
              className="flex-1"
            >
              {inviteToInterviewMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inviting...
                </>
              ) : (
                "Invite to Interview"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleAddToTalentPool}
              disabled={addToTalentPoolMutation.isPending}
              className="flex-1"
            >
              {addToTalentPoolMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Talent Pool"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={rejectCandidateMutation.isPending}
              className="flex-1"
            >
              {rejectCandidateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
