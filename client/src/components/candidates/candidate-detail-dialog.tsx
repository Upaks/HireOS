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
import { Loader2, ExternalLink, Plus, Download, Printer, MoreVertical } from "lucide-react";
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
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  
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
    "pending" | "offer_sent" | "rejected" | "talent_pool"
  >("pending");
  
  // Check if the candidate is rejected (status 200_rejected or finalDecisionStatus is rejected)
  const isRejected = 
    candidate?.status === "200_rejected" || 
    candidate?.finalDecisionStatus === "rejected";
  
  // Check if user has permission to edit (CEO or COO)
  // Candidate cannot be edited if rejected, unless by admin/CEO/COO
  const canEdit = (user?.role === 'ceo' || user?.role === 'coo' || user?.role === 'admin') && !isRejected;

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
      setFinalDecisionStatus(candidate.finalDecisionStatus || "pending");
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

  // Handle resume upload
  const handleResumeUpload = async () => {
    if (!resumeFile || !candidate?.id) return;
    
    try {
      setIsUploading(true);
      const resumeUrl = await uploadResume(resumeFile, candidate.id);
      
      // Update candidate with resume URL
      await apiRequest("PATCH", `/api/candidates/${candidate.id}`, {
        resumeUrl
      });
      
      toast({
        title: "Resume uploaded",
        description: "The resume has been attached to the candidate's profile."
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      setResumeFile(null);
      
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload the resume.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
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
      finalDecisionStatus: updatedFinalDecisionStatus, // Synchronized value
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
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-2xl">{candidate.name}</DialogTitle>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-sm text-muted-foreground">{candidate.email}</span>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{candidate.location || 'No location'}</span>
          </div>
        </DialogHeader>

        <div className="flex h-[calc(90vh-180px)]">
          {/* Left side: Candidate information in a scrollable container */}
          <div className="w-[400px] border-r overflow-y-auto p-4">
            <Tabs defaultValue="evaluation" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="evaluation" className="space-y-4">
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
                
                <div>
                  <Label>Final Decision Status</Label>
                  <Select
                    disabled={!canEdit}
                    value={finalDecisionStatus}
                    onValueChange={(value) => setFinalDecisionStatus(value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
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

                <div>
                  <h3 className="text-lg font-medium mb-3">Evaluation Criteria</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between">
                        <Label htmlFor="technical">Technical Proficiency</Label>
                        <span className="text-sm text-muted-foreground">{technicalProficiency || 0}/5</span>
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
                        <span className="text-sm text-muted-foreground">{leadershipInitiative || 0}/5</span>
                      </div>
                      <StarRating
                        value={leadershipInitiative || 0}
                        onChange={setLeadershipInitiative}
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <Label htmlFor="problem-solving">Problem Solving</Label>
                        <span className="text-sm text-muted-foreground">{problemSolving || 0}/5</span>
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
                        <span className="text-sm text-muted-foreground">{communicationSkills || 0}/5</span>
                      </div>
                      <StarRating
                        value={communicationSkills || 0}
                        onChange={setCommunicationSkills}
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <Label htmlFor="cultural-fit">Cultural Fit</Label>
                        <span className="text-sm text-muted-foreground">{culturalFit || 0}/5</span>
                      </div>
                      <StarRating
                        value={culturalFit || 0}
                        onChange={setCulturalFit}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div>
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="experience">Experience (years)</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    value={experienceYears || ""}
                    onChange={(e) => setExperienceYears(parseInt(e.target.value) || undefined)}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="expected-salary">Expected Salary</Label>
                  <Input
                    id="expected-salary"
                    value={expectedSalary}
                    onChange={(e) => setExpectedSalary(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label>Skills</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {skills.map(skill => (
                      <Badge 
                        key={skill} 
                        variant="secondary"
                        className="flex items-center gap-1 py-1"
                      >
                        {skill}
                        {canEdit && (
                          <button 
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="text-xs ml-1 hover:text-destructive rounded-full"
                          >
                            ×
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                  {canEdit && skills.length < 3 && (
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

          {/* Right side: Resume viewer (takes all remaining space) */}
          <div className="flex-1 h-full overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="bg-gray-800 px-4 py-2 flex justify-between items-center">
                <h3 className="text-lg text-white font-medium">Resume</h3>
                <div className="flex gap-2">
                  {candidate.resumeUrl && (
                    <>
                      <a 
                        href={getResumeUrl() || ''}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
                        title="Download Resume"
                      >
                        <Download className="h-5 w-5" />
                      </a>
                      <button 
                        className="p-1 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
                        title="Print Resume"
                        onClick={() => {
                          const iframe = document.querySelector('iframe');
                          if (iframe) {
                            iframe.contentWindow?.print();
                          }
                        }}
                      >
                        <Printer className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex-1 bg-white overflow-hidden">
                {candidate.resumeUrl ? (
                  <iframe 
                    src={getResumeUrl() || ''} 
                    className="w-full h-full" 
                    title={`${candidate.name}'s Resume`}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4">
                    <p className="text-muted-foreground mb-4">No resume uploaded</p>
                    {canEdit && (
                      <>
                        <Input
                          type="file"
                          accept="application/pdf"
                          className="max-w-xs mb-2"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setResumeFile(e.target.files[0]);
                            }
                          }}
                        />
                        <Button 
                          onClick={handleResumeUpload}
                          disabled={!resumeFile || isUploading}
                          className="max-w-xs"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>Upload Resume</>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-0 flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 md:space-x-4 p-4 border-t">
          <div className="flex flex-wrap gap-2">
            {!isRejected && user && (user.role === 'ceo' || user.role === 'coo' || user.role === 'admin') && (
              <>
                <Button
                  className="bg-red-100 text-red-800 border border-transparent hover:border-red-400 hover:bg-red-100 hover:scale-105 transition-transform"
                  size="sm"
                  onClick={() => handleQuickStatusUpdate("reject")}
                  disabled={updateCandidateMutation.isPending}
                >
                  Reject
                </Button>
                <Button
                  className="bg-purple-100 text-purple-800 border border-transparent hover:border-purple-400 hover:bg-purple-100 hover:scale-105 transition-transform"
                  size="sm"
                  onClick={() => handleQuickStatusUpdate("talent-pool")}
                  disabled={updateCandidateMutation.isPending}
                >
                  Talent Pool
                </Button>
                <Button
                  className="bg-orange-100 text-orange-800 border border-transparent hover:border-orange-400 hover:bg-orange-100 hover:scale-105 transition-transform"
                  size="sm"
                  onClick={() => handleQuickStatusUpdate("interview")}
                  disabled={updateCandidateMutation.isPending}
                >
                  Interview
                </Button>
                <Button
                  className="bg-green-100 text-green-800 border border-transparent hover:border-green-400 hover:bg-green-100 hover:scale-105 transition-transform"
                  size="sm"
                  onClick={() => handleQuickStatusUpdate("offer")}
                  disabled={updateCandidateMutation.isPending}
                >
                  Send Offer
                </Button>
              </>
            )}

            {isRejected && (
              <div className="text-sm text-red-600 italic">
                This candidate has been rejected. No further actions are available.
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={updateCandidateMutation.isPending}
            >
              {isRejected ? "Close" : "Cancel"}
            </Button>
            {canEdit && (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={updateCandidateMutation.isPending || isRejected}
              >
                {updateCandidateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}