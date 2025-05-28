import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import OfferForm from "@/components/offers/offer-form";
import { Candidate, Interview, Evaluation } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { shouldShowInFinalApprovals, getFinalDecisionDisplayLabel } from "@/lib/final-decision-utils";

export default function CooReview() {
  const { toast } = useToast();
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [offerFormOpen, setOfferFormOpen] = useState(false);
  
  // Fetch candidates for final approvals based on your business rules:
  // Status: rejected, 90_offer_sent, 80_talent_pool OR
  // Final Decision Status: rejected, 90_offer_sent, 80_talent_pool, pending
  const { data: allCandidates, isLoading: isLoadingCandidates } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates'],
  });
  
  // Filter candidates for Final Approvals tab
  const candidates = allCandidates?.filter(candidate => shouldShowInFinalApprovals(candidate)) || [];
  
  // Fetch interviews for candidates
  const { data: interviews, isLoading: isLoadingInterviews } = useQuery<Interview[]>({
    queryKey: ['/api/interviews', { status: 'completed' }],
    enabled: !!candidates,
  });
  
  // Get candidates with completed interviews and evaluations
  const getCandidatesWithInterviews = () => {
    if (!candidates || !interviews) return [];
    
    return candidates.filter(candidate => {
      const candidateInterviews = interviews.filter(
        interview => interview.candidateId === candidate.id && interview.status === 'completed'
      );
      return candidateInterviews.length > 0;
    });
  };
  
  const finalCandidates = getCandidatesWithInterviews();
  
  // Function to get interviews for a specific candidate
  const getInterviewsForCandidate = (candidateId: number) => {
    if (!interviews) return [];
    return interviews.filter(interview => interview.candidateId === candidateId);
  };
  
  // Mutations for candidate actions
  const talentPoolMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const res = await apiRequest("POST", `/api/candidates/${candidateId}/talent-pool`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: "Added to talent pool",
        description: "Candidate has been added to the talent pool."
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
  
  const rejectMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const res = await apiRequest("POST", `/api/candidates/${candidateId}/reject`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: "Candidate rejected",
        description: "Candidate has been rejected."
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
  
  const handleSendOffer = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setOfferFormOpen(true);
  };
  
  const handleAddToTalentPool = (candidateId: number) => {
    talentPoolMutation.mutate(candidateId);
  };
  
  const handleReject = (candidateId: number) => {
    rejectMutation.mutate(candidateId);
  };
  
  return (
    <AppShell>
      <TopBar 
        title="Executive Review - Final Approvals" 
        showNewHiringButton={false} 
      />
      
      <div className="px-4 sm:px-6 lg:px-8 py-6 bg-slate-50">
        {isLoadingCandidates || isLoadingInterviews ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : finalCandidates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No candidates pending final review.
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            <ul className="space-y-6">
              {finalCandidates.map(candidate => {
                const candidateInterviews = getInterviewsForCandidate(candidate.id);
                
                return (
                  <li key={candidate.id}>
                    <Card className="overflow-hidden">
                      <CardHeader className="px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-medium text-slate-900">{candidate.name}</h2>
                            <p className="text-sm text-slate-500">{candidate.job?.title || `Job ID: ${candidate.jobId}`}</p>
                          </div>
                          <div className="flex items-center">
                            {candidateInterviews[0]?.evaluation?.overallRating && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-green-100 text-green-800">
                                Recommended: {candidateInterviews[0].evaluation.overallRating}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column - Candidate Details */}
                        <div>
                          <div className="mb-6">
                            <h3 className="text-sm font-medium text-slate-500 mb-2">Candidate Information</h3>
                            <div className="border border-slate-200 rounded-md">
                              <dl>
                                <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-slate-200">
                                  <dt className="text-sm font-medium text-slate-500">Email</dt>
                                  <dd className="text-sm text-slate-900 col-span-2">{candidate.email}</dd>
                                </div>
                                <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-slate-200">
                                  <dt className="text-sm font-medium text-slate-500">Location</dt>
                                  <dd className="text-sm text-slate-900 col-span-2">{candidate.location || 'Not specified'}</dd>
                                </div>
                                <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-slate-200">
                                  <dt className="text-sm font-medium text-slate-500">Experience</dt>
                                  <dd className="text-sm text-slate-900 col-span-2">{candidate.experienceYears ? `${candidate.experienceYears} years` : 'Not specified'}</dd>
                                </div>
                                <div className="px-4 py-3 grid grid-cols-3 gap-4">
                                  <dt className="text-sm font-medium text-slate-500">Expected Salary</dt>
                                  <dd className="text-sm text-slate-900 col-span-2">{candidate.expectedSalary || 'Not specified'}</dd>
                                </div>
                              </dl>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-sm font-medium text-slate-500 mb-2">Assessment & Interview Scores</h3>
                            <div className="border border-slate-200 rounded-md">
                              <dl>
                                {candidate.hiPeoplePercentile && (
                                  <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-slate-200">
                                    <dt className="text-sm font-medium text-slate-500">HiPeople Score</dt>
                                    <dd className="text-sm text-slate-900 col-span-2">
                                      <div className="flex items-center">
                                        <Progress 
                                          value={candidate.hiPeoplePercentile} 
                                          className="h-2 flex-1 mr-2" 
                                        />
                                        <span className="text-sm font-medium text-slate-900">{candidate.hiPeoplePercentile}%</span>
                                      </div>
                                    </dd>
                                  </div>
                                )}
                                
                                {candidateInterviews[0]?.evaluation?.technicalScore && (
                                  <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-slate-200">
                                    <dt className="text-sm font-medium text-slate-500">Technical</dt>
                                    <dd className="text-sm text-slate-900 col-span-2">
                                      <div className="flex items-center">
                                        <Progress 
                                          value={candidateInterviews[0].evaluation.technicalScore * 20} 
                                          className="h-2 flex-1 mr-2" 
                                        />
                                        <span className="text-sm font-medium text-slate-900">{candidateInterviews[0].evaluation.technicalScore}/5</span>
                                      </div>
                                    </dd>
                                  </div>
                                )}
                                
                                {candidateInterviews[0]?.evaluation?.communicationScore && (
                                  <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-slate-200">
                                    <dt className="text-sm font-medium text-slate-500">Communication</dt>
                                    <dd className="text-sm text-slate-900 col-span-2">
                                      <div className="flex items-center">
                                        <Progress 
                                          value={candidateInterviews[0].evaluation.communicationScore * 20} 
                                          className="h-2 flex-1 mr-2" 
                                        />
                                        <span className="text-sm font-medium text-slate-900">{candidateInterviews[0].evaluation.communicationScore}/5</span>
                                      </div>
                                    </dd>
                                  </div>
                                )}
                                
                                {candidateInterviews[0]?.evaluation?.problemSolvingScore && (
                                  <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-slate-200">
                                    <dt className="text-sm font-medium text-slate-500">Problem Solving</dt>
                                    <dd className="text-sm text-slate-900 col-span-2">
                                      <div className="flex items-center">
                                        <Progress 
                                          value={candidateInterviews[0].evaluation.problemSolvingScore * 20} 
                                          className="h-2 flex-1 mr-2" 
                                        />
                                        <span className="text-sm font-medium text-slate-900">{candidateInterviews[0].evaluation.problemSolvingScore}/5</span>
                                      </div>
                                    </dd>
                                  </div>
                                )}
                                
                                {candidateInterviews[0]?.evaluation?.culturalFitScore && (
                                  <div className="px-4 py-3 grid grid-cols-3 gap-4">
                                    <dt className="text-sm font-medium text-slate-500">Cultural Fit</dt>
                                    <dd className="text-sm text-slate-900 col-span-2">
                                      <div className="flex items-center">
                                        <Progress 
                                          value={candidateInterviews[0].evaluation.culturalFitScore * 20} 
                                          className="h-2 flex-1 mr-2" 
                                        />
                                        <span className="text-sm font-medium text-slate-900">{candidateInterviews[0].evaluation.culturalFitScore}/5</span>
                                      </div>
                                    </dd>
                                  </div>
                                )}
                              </dl>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right Column - Interviewer Comments & Decision */}
                        <div>
                          <div className="mb-6">
                            <h3 className="text-sm font-medium text-slate-500 mb-2">Interview Feedback</h3>
                            {candidateInterviews[0]?.evaluation?.overallComments ? (
                              <div className="border border-slate-200 rounded-md p-4 bg-slate-50">
                                <p className="text-sm text-slate-900">
                                  {candidateInterviews[0].evaluation.overallComments}
                                </p>
                                {candidateInterviews[0].interviewer && (
                                  <div className="mt-3 text-sm text-slate-500">
                                    Interviewer: {candidateInterviews[0].interviewer.fullName} - {new Date(candidateInterviews[0].conductedDate || candidateInterviews[0].createdAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="border border-slate-200 rounded-md p-4 bg-slate-50">
                                <p className="text-sm text-slate-500">No detailed feedback available.</p>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <h3 className="text-sm font-medium text-slate-500 mb-2">Executive Decision</h3>
                            <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                              <div className="flex space-x-3">
                                <Button
                                  onClick={() => handleSendOffer(candidate)}
                                  disabled={talentPoolMutation.isPending || rejectMutation.isPending}
                                >
                                  Send Offer
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => handleAddToTalentPool(candidate.id)}
                                  disabled={talentPoolMutation.isPending}
                                >
                                  {talentPoolMutation.isPending ? (
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
                                  onClick={() => handleReject(candidate.id)}
                                  disabled={rejectMutation.isPending}
                                >
                                  {rejectMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Rejecting...
                                    </>
                                  ) : (
                                    "Reject"
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      
      {selectedCandidate && (
        <OfferForm
          candidate={selectedCandidate}
          open={offerFormOpen}
          onOpenChange={setOfferFormOpen}
        />
      )}
    </AppShell>
  );
}
