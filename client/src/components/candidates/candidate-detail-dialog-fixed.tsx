import React, { useState, useEffect } from "react";
import { uploadResume } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Candidate } from "@/types";
import { Loader2, ExternalLink, Plus } from "lucide-react";
import StarRating from "../ui/star-rating";
import { getStatusesForFilter } from "@/lib/candidate-status";

interface CandidateDetailDialogProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CandidateDetailDialog({
  candidate,
  isOpen,
  onClose
}: CandidateDetailDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  
  // Candidate state values
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [experienceYears, setExperienceYears] = useState<number | undefined>(undefined);
  const [expectedSalary, setExpectedSalary] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  
  // Assessment and evaluation state
  const [candidateStatus, setCandidateStatus] = useState("");
  const [hiPeopleScore, setHiPeopleScore] = useState<number | undefined>(undefined);
  const [hiPeoplePercentile, setHiPeoplePercentile] = useState<number | undefined>(undefined);
  const [technicalProficiency, setTechnicalProficiency] = useState<number | undefined>(undefined);
  const [leadershipInitiative, setLeadershipInitiative] = useState<number | undefined>(undefined);
  const [problemSolving, setProblemSolving] = useState<number | undefined>(undefined);
  const [communicationSkills, setCommunicationSkills] = useState<number | undefined>(undefined);
  const [culturalFit, setCulturalFit] = useState<number | undefined>(undefined);
  const [finalDecisionStatus, setFinalDecisionStatus] = useState<
    "pending" | "offer_sent" | "rejected" | "talent_pool" | null
  >(null);
  
  // Check if the candidate is rejected (status 200_rejected or finalDecisionStatus is rejected)
  const isRejected = 
    candidate?.status === "200_rejected" || 
    candidate?.finalDecisionStatus === "rejected";
  
  // Check if user has permission to edit (CEO, COO, or Director)
  // Candidate cannot be edited if rejected, unless by admin/CEO/COO/Director
  const canEdit = (user?.role === 'ceo' || user?.role === 'coo' || user?.role === 'director' || user?.role === 'admin') && !isRejected;

  // Update form fields when candidate changes
  useEffect(() => {
    if (candidate) {
      // Candidate details
      setName(candidate.name || "");
      setEmail(candidate.email || "");
      setPhone(candidate.phone || "");
      setLocation(candidate.location || "");
      setExperienceYears(candidate.experienceYears);
      setExpectedSalary(candidate.expectedSalary || "");
      
      // Handle skills data - ensure it's an array
      if (Array.isArray(candidate.skills)) {
        setSkills(candidate.skills);
      } else if (typeof candidate.skills === 'object' && candidate.skills !== null) {
        setSkills(Object.keys(candidate.skills));
      } else {
        setSkills([]);
      }
      
      // Notes and status
      setNotes(candidate.notes || "");
      setCandidateStatus(candidate.status || "new");
      
      // Assessment data
      setHiPeopleScore(candidate.hiPeopleScore);
      setHiPeoplePercentile(candidate.hiPeoplePercentile);
      
      // Evaluation data
      setTechnicalProficiency(candidate.technicalProficiency);
      setLeadershipInitiative(candidate.leadershipInitiative);
      setProblemSolving(candidate.problemSolving);
      setCommunicationSkills(candidate.communicationSkills);
      setCulturalFit(candidate.culturalFit);
      setFinalDecisionStatus(candidate.finalDecisionStatus ?? null);
    }
  }, [candidate]);

  // Update candidate mutation
  const updateCandidateMutation = useMutation({
    mutationFn: async (data: Partial<Candidate>) => {
      if (!candidate) return null;
      const response = await apiRequest(
        "PATCH",
        `/api/candidates/${candidate.id}`,
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Candidate updated",
        description: "The candidate information has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating candidate",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleQuickStatusUpdate = async (action: "reject" | "talent-pool" | "interview" | "offer") => {
    if (!candidate) return;

    const actionMap: Record<string, { endpoint: string; newStatus: string; finalDecisionStatus?: string }> = {
      "reject": { endpoint: "reject", newStatus: "200_rejected", finalDecisionStatus: "rejected" },
      "talent-pool": { endpoint: "talent-pool", newStatus: "90_talent_pool", finalDecisionStatus: "talent_pool" },
      "interview": { endpoint: "invite-to-interview", newStatus: "45_1st_interview_sent" },
      "offer": { endpoint: "send-offer", newStatus: "95_offer_sent", finalDecisionStatus: "offer_sent" }
    };

    const selected = actionMap[action];

    try {
      const response = await apiRequest("POST", `/api/candidates/${candidate.id}/${selected.endpoint}`, 
        action === "offer"
          ? {
              offerType: "Standard",
              compensation: candidate.expectedSalary || "TBD",
            }
          : undefined
      );

      // Check if the response is OK
      if (!response.ok) {
        const errorData = await response.json();
        
        // Special handling for email errors
        if (errorData.errorType === "non_existent_email") {
          // Even with email error, the status was still updated on the server
          // Update local state to match
          setCandidateStatus(selected.newStatus);
          if (selected.finalDecisionStatus) {
            setFinalDecisionStatus(selected.finalDecisionStatus as any);
          }
          
          // Show user-friendly error message but still invalidate queries
          toast({
            title: "Unable to Send Email",
            description: "We've updated the candidate's status, but couldn't send the notification email because the email address appears to be invalid.",
            variant: "destructive",
          });
          
          queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
          onClose();
          return;
        }
        
        // Handle other errors
        throw new Error(errorData.message || "Failed to update status");
      }

      const updated = await response.json();
      setCandidateStatus(selected.newStatus);
      
      // Update final decision status if applicable
      if (selected.finalDecisionStatus) {
        setFinalDecisionStatus(selected.finalDecisionStatus as any);
      }

      toast({
        title: "Candidate status updated",
        description: `Set to ${selected.newStatus.replace(/^\d+_/, "").replace(/_/g, " ")}`,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      onClose(); // close modal after success
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status.",
        variant: "destructive",
      });
    }
  };

  // Handle adding a skill
  const addSkill = () => {
    if (skillInput.trim() && skills.length < 3 && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  // Handle removing a skill
  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  // Handle skill input keydown events
  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const handleSubmit = () => {
    if (!candidate) return;
    
    // IMPORTANT: Keep both status fields synchronized
    let updatedFinalDecisionStatus = finalDecisionStatus;
    let updatedStatus = candidateStatus;
    
    // If current status is rejected, make sure final decision status matches
    if (candidateStatus === "200_rejected" && finalDecisionStatus !== "rejected") {
      updatedFinalDecisionStatus = "rejected";
    }
    // If current status is offer sent, make sure final decision status matches
    else if (candidateStatus === "95_offer_sent" && finalDecisionStatus !== "offer_sent") {
      updatedFinalDecisionStatus = "offer_sent";
    }
    
    // The other direction - if final decision status changes, update current status
    if (finalDecisionStatus === "rejected" && candidateStatus !== "200_rejected") {
      updatedStatus = "200_rejected"; 
      setCandidateStatus("200_rejected");
    }
    // If final decision status is offer sent, update current status
    else if (finalDecisionStatus === "offer_sent" && candidateStatus !== "95_offer_sent") {
      updatedStatus = "95_offer_sent";
      setCandidateStatus("95_offer_sent");
    }
    
    updateCandidateMutation.mutate({
      // Candidate details (only update if user can edit)
      ...(canEdit ? {
        name,
        email,
        phone,
        location,
        experienceYears,
        expectedSalary,
        skills,
      } : {}),
      // Assessment and evaluation data
      status: updatedStatus, // Use synchronized value
      notes,
      hiPeopleScore,
      hiPeoplePercentile,
      technicalProficiency,
      leadershipInitiative,
      problemSolving,
      communicationSkills,
      finalDecisionStatus: updatedFinalDecisionStatus === null ? undefined : updatedFinalDecisionStatus, // Convert null to undefined for API
      culturalFit
    });
  };

  // Function to get resume URL for the candidate
  const getResumeUrl = () => {
    if (!candidate?.id) return null;
    return `https://xrzblucvpnyknupragco.supabase.co/storage/v1/object/public/resumes/candidate-${candidate.id}.pdf`;
  };

  if (!candidate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{candidate.name}</DialogTitle>
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-sm text-muted-foreground">{candidate.email}</span>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{candidate.location || 'No location'}</span>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left side: Candidate information (3/5 of width) */}
          <div className="lg:col-span-3 space-y-4">
            <Tabs defaultValue="evaluation" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                <TabsTrigger value="details">Candidate Details</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="evaluation" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Assessment Status</h3>
                      <div className="mt-2">
                        <Label htmlFor="status">Current Status</Label>
                        <Select
                          disabled={!canEdit}
                          value={candidateStatus}
                          onValueChange={setCandidateStatus}
                        >
                          <SelectTrigger id="status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {getStatusesForFilter().map(status => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label>Final Decision Status</Label>
                      <Select
                        disabled={!canEdit}
                        value={finalDecisionStatus === null ? "not_applicable" : finalDecisionStatus}
                        onValueChange={(value) => setFinalDecisionStatus(value === "not_applicable" ? null : value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_applicable">Not Applicable</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="offer_sent">Offer Sent</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="talent_pool">Talent Pool</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium">HiPeople Metrics</h3>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <Label htmlFor="score">Score</Label>
                          <Input
                            id="score"
                            type="number"
                            min="0"
                            max="100"
                            value={hiPeopleScore || ""}
                            onChange={(e) => setHiPeopleScore(parseInt(e.target.value) || undefined)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div>
                          <Label htmlFor="percentile">Percentile</Label>
                          <Input
                            id="percentile"
                            type="number"
                            min="0"
                            max="100"
                            value={hiPeoplePercentile || ""}
                            onChange={(e) => setHiPeoplePercentile(parseInt(e.target.value) || undefined)}
                            disabled={!canEdit}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Evaluation Criteria</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between">
                          <Label htmlFor="technical">Technical Proficiency</Label>
                          <span className="text-sm text-muted-foreground">
                            {technicalProficiency !== undefined ? `${technicalProficiency}/5` : '0/5 (Not rated)'}
                          </span>
                        </div>
                        <StarRating 
                          value={technicalProficiency || 0} 
                          onChange={setTechnicalProficiency} 
                          disabled={!canEdit}
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between">
                          <Label htmlFor="leadership">Leadership & Initiative</Label>
                          <span className="text-sm text-muted-foreground">
                            {leadershipInitiative !== undefined ? `${leadershipInitiative}/5` : '0/5 (Not rated)'}
                          </span>
                        </div>
                        <StarRating 
                          value={leadershipInitiative || 0} 
                          onChange={setLeadershipInitiative} 
                          disabled={!canEdit}
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between">
                          <Label htmlFor="problem">Problem Solving</Label>
                          <span className="text-sm text-muted-foreground">
                            {problemSolving !== undefined ? `${problemSolving}/5` : '0/5 (Not rated)'}
                          </span>
                        </div>
                        <StarRating 
                          value={problemSolving || 0} 
                          onChange={setProblemSolving} 
                          disabled={!canEdit}
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between">
                          <Label htmlFor="communication">Communication Skills</Label>
                          <span className="text-sm text-muted-foreground">
                            {communicationSkills !== undefined ? `${communicationSkills}/5` : '0/5 (Not rated)'}
                          </span>
                        </div>
                        <StarRating 
                          value={communicationSkills || 0} 
                          onChange={setCommunicationSkills} 
                          disabled={!canEdit}
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between">
                          <Label htmlFor="culture">Cultural Fit</Label>
                          <span className="text-sm text-muted-foreground">
                            {culturalFit !== undefined ? `${culturalFit}/5` : '0/5 (Not rated)'}
                          </span>
                        </div>
                        <StarRating 
                          value={culturalFit || 0} 
                          onChange={setCulturalFit} 
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        disabled={!canEdit} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={!canEdit} 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input 
                        id="phone" 
                        value={phone || ""} 
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={!canEdit} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input 
                        id="location" 
                        value={location || ""} 
                        onChange={(e) => setLocation(e.target.value)}
                        disabled={!canEdit} 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="experience">Experience (years)</Label>
                      <Input 
                        id="experience" 
                        type="number"
                        value={experienceYears || ""} 
                        onChange={(e) => setExperienceYears(e.target.value ? parseInt(e.target.value) : undefined)}
                        disabled={!canEdit} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="salary">Expected Salary</Label>
                      <Input 
                        id="salary" 
                        value={expectedSalary || ""} 
                        onChange={(e) => setExpectedSalary(e.target.value)}
                        disabled={!canEdit} 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="skills">Skills (Max 3)</Label>
                    {!canEdit ? (
                      <div className="p-3 border rounded-md bg-slate-50">
                        {skills.length > 0 ? skills.join(", ") : "No skills listed"}
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {skills.map(skill => (
                            <Badge 
                              key={skill} 
                              variant="secondary"
                              className="flex items-center gap-1 py-1"
                            >
                              {skill}
                              <button 
                                type="button"
                                onClick={() => removeSkill(skill)}
                                className="text-xs ml-1 hover:text-destructive rounded-full"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex">
                          <Input
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyDown={handleSkillKeyDown}
                            placeholder="Add a skill and press Enter"
                            disabled={skills.length >= 3}
                            className="flex-1"
                          />
                          <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={addSkill}
                            disabled={skills.length >= 3 || !skillInput.trim()}
                            className="ml-2"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        {skills.length >= 3 && (
                          <p className="text-amber-600 text-sm mt-1">Maximum 3 skills reached</p>
                        )}
                      </>
                    )}
                  </div>
                  
                  {canEdit && (
                    <div className="space-y-2">
                      <Label>Upload Resume (PDF only)</Label>
                      <Input
                        type="file"
                        accept="application/pdf"
                        disabled={isUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !candidate?.id) return;

                          // Block non-PDFs
                          if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
                            toast({
                              title: "Only PDF files are supported",
                              description: "Please upload a PDF file for viewing in the resume viewer.",
                              variant: "destructive"
                            });
                            return;
                          }

                          try {
                            setIsUploading(true);
                            await uploadResume(file, candidate.id);
                            toast({ 
                              title: "Resume uploaded successfully",
                              description: "The resume has been attached to the candidate's profile."
                            });
                            
                            // Force refresh to show the new resume
                            queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
                          } catch (err) {
                            toast({
                              title: "Upload failed",
                              description: String(err),
                              variant: "destructive",
                            });
                          } finally {
                            setIsUploading(false);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="notes">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this candidate..."
                      className="min-h-[200px]"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Right side: Resume viewer (2/5 of width) */}
          <div className="lg:col-span-2 h-full bg-slate-50 rounded-md border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-medium">Resume</h3>
            </div>
            
            <div className="flex-1 overflow-hidden flex items-center justify-center">
              {getResumeUrl() ? (
                <iframe
                  src={getResumeUrl() || ""}
                  className="w-full h-full min-h-[500px]"
                  title={`${candidate.name}'s Resume`}
                />
              ) : (
                <div className="text-center p-6 text-slate-500">
                  <p className="mb-2">No resume uploaded yet</p>
                  {canEdit && (
                    <p className="text-sm">Upload a resume in the Candidate Details tab</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="space-x-2 flex justify-between mt-6">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => handleQuickStatusUpdate("reject")}
              disabled={updateCandidateMutation.isPending}
              className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700"
            >
              Reject
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickStatusUpdate("talent-pool")}
              disabled={updateCandidateMutation.isPending}
              className="bg-purple-50 hover:bg-purple-100 text-purple-600 hover:text-purple-700"
            >
              Talent Pool
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickStatusUpdate("interview")}
              disabled={updateCandidateMutation.isPending}
              className="bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700"
            >
              Interview
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickStatusUpdate("offer")}
              disabled={updateCandidateMutation.isPending}
              className="bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700"
            >
              Send Offer
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={updateCandidateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={updateCandidateMutation.isPending}
            >
              {updateCandidateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}