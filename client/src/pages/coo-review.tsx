import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import OfferForm from "@/components/offers/offer-form";
import { Candidate, Interview, Evaluation } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { shouldShowInFinalApprovals, getFinalDecisionDisplayLabel } from "@/lib/final-decision-utils";
import { getStatusDisplay, normalizeCandidateStatus } from "@/lib/candidate-status";

export default function CooReview() {
  const { toast } = useToast();
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [offerFormOpen, setOfferFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "talent-pool" | "reject" | null;
    candidate: Candidate | null;
  }>({
    open: false,
    action: null,
    candidate: null,
  });
  
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
  
  // Fetch evaluations for all interviews
  const { data: evaluations } = useQuery<Evaluation[]>({
    queryKey: ['/api/evaluations'],
    enabled: !!interviews && interviews.length > 0,
    queryFn: async () => {
      if (!interviews) return [];
      const evaluationPromises = interviews.map(async (interview) => {
        try {
          const res = await apiRequest("GET", `/api/interviews/${interview.id}/evaluation`);
          if (res.ok) {
            return await res.json();
          }
          return null;
        } catch {
          return null;
        }
      });
      const results = await Promise.all(evaluationPromises);
      return results.filter((evaluation): evaluation is Evaluation => evaluation !== null);
    },
  });

  // Combine interviews with their evaluations
  const interviewsWithEvaluations = useMemo(() => {
    if (!interviews || !evaluations) return interviews || [];
    return interviews.map(interview => ({
      ...interview,
      evaluation: evaluations.find(evaluation => evaluation.interviewId === interview.id)
    })) as (Interview & { evaluation?: Evaluation })[];
  }, [interviews, evaluations]);
  
  // Filter candidates by active tab
  const finalCandidates = useMemo(() => {
    if (activeTab === "all") return candidates;
    
    return candidates.filter(candidate => {
      const normalizedStatus = normalizeCandidateStatus(candidate.status);
      
      switch (activeTab) {
        case "offers":
          return normalizedStatus === "95_offer_sent";
        case "accepted":
          return normalizedStatus === "100_offer_accepted";
        case "talent-pool":
          return normalizedStatus === "90_talent_pool";
        case "rejected":
          return normalizedStatus === "200_rejected";
        default:
          return true;
      }
    });
  }, [candidates, activeTab]);

  // Count candidates by category for tab badges
  const candidateCounts = useMemo(() => {
    const counts = {
      all: candidates.length,
      offers: candidates.filter(c => normalizeCandidateStatus(c.status) === "95_offer_sent").length,
      accepted: candidates.filter(c => normalizeCandidateStatus(c.status) === "100_offer_accepted").length,
      "talent-pool": candidates.filter(c => normalizeCandidateStatus(c.status) === "90_talent_pool").length,
      rejected: candidates.filter(c => normalizeCandidateStatus(c.status) === "200_rejected").length,
    };
    return counts;
  }, [candidates]);
  
  // Function to get interviews for a specific candidate
  const getInterviewsForCandidate = (candidateId: number) => {
    if (!interviewsWithEvaluations) return [];
    return interviewsWithEvaluations.filter(interview => interview.candidateId === candidateId);
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
  
  const handleAddToTalentPool = (candidate: Candidate) => {
    setConfirmDialog({
      open: true,
      action: "talent-pool",
      candidate,
    });
  };
  
  const handleReject = (candidate: Candidate) => {
    setConfirmDialog({
      open: true,
      action: "reject",
      candidate,
    });
  };

  const handleConfirmAction = () => {
    if (!confirmDialog.candidate || !confirmDialog.action) return;

    if (confirmDialog.action === "talent-pool") {
      talentPoolMutation.mutate(confirmDialog.candidate.id);
    } else if (confirmDialog.action === "reject") {
      rejectMutation.mutate(confirmDialog.candidate.id);
    }

    setConfirmDialog({ open: false, action: null, candidate: null });
  };

  const getActionDetails = (action: "talent-pool" | "reject") => {
    if (action === "talent-pool") {
      return {
        title: "Add to Talent Pool",
        description: `Are you sure you want to add ${confirmDialog.candidate?.name} to the talent pool?`,
        details: [
          "A talent pool email will be sent to the candidate",
        ],
      };
    } else {
      return {
        title: "Reject Candidate",
        description: `Are you sure you want to reject ${confirmDialog.candidate?.name}?`,
        details: [
          "A rejection email will be sent to the candidate",
        ],
        variant: "destructive" as const,
      };
    }
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
        ) : candidates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No candidates pending final review.
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="all">
                  All
                  {candidateCounts.all > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {candidateCounts.all}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="offers">
                  Offers Sent
                  {candidateCounts.offers > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {candidateCounts.offers}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="accepted">
                  Accepted Offers
                  {candidateCounts.accepted > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {candidateCounts.accepted}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="talent-pool">
                  Talent Pool
                  {candidateCounts["talent-pool"] > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {candidateCounts["talent-pool"]}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected
                  {candidateCounts.rejected > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {candidateCounts.rejected}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-0">
                {finalCandidates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No candidates in this category.
                  </div>
                ) : (
            <ul className="space-y-6">
              {finalCandidates.map(candidate => {
                      const statusDisplay = getStatusDisplay(candidate.status);
                const candidateInterviews = getInterviewsForCandidate(candidate.id);
                
                return (
                  <li key={candidate.id}>
                    <Card className="overflow-hidden">
                      <CardHeader className="px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-medium text-slate-900">{candidate.name}</h2>
                              <Badge className={`${statusDisplay.bgColor} ${statusDisplay.textColor}`}>
                                {statusDisplay.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500">{candidate.job?.title || `Job ID: ${candidate.jobId}`}</p>
                          </div>
                          <div className="flex items-center gap-2">
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
                                  onClick={() => handleAddToTalentPool(candidate)}
                                  disabled={talentPoolMutation.isPending || rejectMutation.isPending}
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
                                  onClick={() => handleReject(candidate)}
                                  disabled={talentPoolMutation.isPending || rejectMutation.isPending}
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
                )}
              </TabsContent>
            </Tabs>
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

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => {
        if (!open) {
          setConfirmDialog({ open: false, action: null, candidate: null });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action && getActionDetails(confirmDialog.action).title}
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <p>{confirmDialog.action && getActionDetails(confirmDialog.action).description}</p>
              <div className="mt-4 space-y-2">
                <p className="font-medium text-sm text-slate-900">What will happen:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                  {confirmDialog.action && getActionDetails(confirmDialog.action).details.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ open: false, action: null, candidate: null })}
              disabled={talentPoolMutation.isPending || rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              variant={confirmDialog.action === "reject" ? "destructive" : "default"}
              disabled={talentPoolMutation.isPending || rejectMutation.isPending}
            >
              {(talentPoolMutation.isPending || rejectMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
