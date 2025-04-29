import { useState } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Candidate } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CandidateDetailDialog from "./candidate-detail-dialog";
import { getStatusDisplay } from "@/lib/candidate-status";

interface CandidateCardProps {
  candidate: Candidate;
}

export default function CandidateCard({ candidate }: CandidateCardProps) {
  const { toast } = useToast();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
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
    const { code, label, bgColor, textColor } = getStatusDisplay(status);
    return <Badge className={`${bgColor} ${textColor}`}>{code} {label}</Badge>;
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
    <>
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
          
          {/* Show evaluation criteria if they exist */}
          {(candidate.technicalProficiency || 
            candidate.leadershipInitiative || 
            candidate.problemSolving || 
            candidate.communicationSkills || 
            candidate.culturalFit) && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-900 mb-1">Evaluation</h4>
              <div className="grid grid-cols-2 gap-2">
                {candidate.technicalProficiency !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Technical:</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i}
                          size={12}
                          className={i < candidate.technicalProficiency! ? "text-yellow-400 fill-yellow-400" : "text-slate-300"}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {candidate.leadershipInitiative !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Leadership:</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i}
                          size={12}
                          className={i < candidate.leadershipInitiative! ? "text-yellow-400 fill-yellow-400" : "text-slate-300"}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
          
          <div className="flex justify-between space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsDetailOpen(true)}
              className="flex-1"
            >
              View Details
            </Button>
            
            {showActions && (
              <>
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
              </>
            )}
          </div>
          
          {showActions && (
            <div className="flex justify-between space-x-3 mt-3">
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
                  "Add to Talent Pool"
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
      
      <CandidateDetailDialog
        candidate={candidate}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </>
  );
}
