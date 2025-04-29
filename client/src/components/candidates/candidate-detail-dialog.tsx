import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Candidate } from "@/types";
import { Loader2, ExternalLink } from "lucide-react";
import StarRating from "../ui/star-rating";
import { getStatusDisplay, getStatusesForFilter } from "@/lib/candidate-status";

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
  const [notes, setNotes] = useState("");
  const [candidateStatus, setCandidateStatus] = useState("");
  const [hiPeopleScore, setHiPeopleScore] = useState<number | undefined>(undefined);
  const [hiPeoplePercentile, setHiPeoplePercentile] = useState<number | undefined>(undefined);
  const [technicalProficiency, setTechnicalProficiency] = useState<number | undefined>(undefined);
  const [leadershipInitiative, setLeadershipInitiative] = useState<number | undefined>(undefined);
  const [problemSolving, setProblemSolving] = useState<number | undefined>(undefined);
  const [communicationSkills, setCommunicationSkills] = useState<number | undefined>(undefined);
  const [culturalFit, setCulturalFit] = useState<number | undefined>(undefined);
  
  // Check if user has permission to edit (CEO or COO)
  const canEdit = user?.role === 'ceo' || user?.role === 'coo' || user?.role === 'admin';

  // Update form fields when candidate changes
  useEffect(() => {
    if (candidate) {
      setNotes(candidate.notes || "");
      setCandidateStatus(candidate.status || "new");
      setHiPeopleScore(candidate.hiPeopleScore);
      setHiPeoplePercentile(candidate.hiPeoplePercentile);
      setTechnicalProficiency(candidate.technicalProficiency);
      setLeadershipInitiative(candidate.leadershipInitiative);
      setProblemSolving(candidate.problemSolving);
      setCommunicationSkills(candidate.communicationSkills);
      setCulturalFit(candidate.culturalFit);
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

  const handleSubmit = () => {
    if (!candidate) return;
    
    updateCandidateMutation.mutate({
      status: candidateStatus,
      notes,
      hiPeopleScore,
      hiPeoplePercentile,
      technicalProficiency,
      leadershipInitiative,
      problemSolving,
      communicationSkills,
      culturalFit
    });
  };

  // Format status for display
  const formatStatus = (status: string): string => {
    switch(status) {
      case 'new': return 'New';
      case 'assessment_sent': return 'Assessment Sent';
      case 'assessment_completed': return 'Assessment Completed';
      case 'interview_scheduled': return 'Interview Scheduled';
      case 'talent_pool': return 'Talent Pool';
      case 'rejected': return 'Rejected';
      case 'offer_sent': return 'Offer Sent';
      case 'hired': return 'Hired';
      default: return status;
    }
  };

  if (!candidate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{candidate.name}</DialogTitle>
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-sm text-muted-foreground">{candidate.email}</span>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{candidate.location || 'No location'}</span>
          </div>
        </DialogHeader>

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
                        {technicalProficiency !== undefined ? `${technicalProficiency}/5` : 'Not rated'}
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
                        {leadershipInitiative !== undefined ? `${leadershipInitiative}/5` : 'Not rated'}
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
                        {problemSolving !== undefined ? `${problemSolving}/5` : 'Not rated'}
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
                        {communicationSkills !== undefined ? `${communicationSkills}/5` : 'Not rated'}
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
                      <Label htmlFor="cultural">Cultural Fit</Label>
                      <span className="text-sm text-muted-foreground">
                        {culturalFit !== undefined ? `${culturalFit}/5` : 'Not rated'}
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
                  <Input id="name" value={candidate.name} disabled />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={candidate.email} disabled />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={candidate.phone || ""} disabled />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={candidate.location || ""} disabled />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="experience">Experience (years)</Label>
                  <Input id="experience" value={candidate.experienceYears || ""} disabled />
                </div>
                <div>
                  <Label htmlFor="salary">Expected Salary</Label>
                  <Input id="salary" value={candidate.expectedSalary || ""} disabled />
                </div>
              </div>
              
              <div>
                <Label htmlFor="skills">Skills</Label>
                <div className="p-3 border rounded-md bg-slate-50">
                  {Array.isArray(candidate.skills)
                    ? candidate.skills.join(", ")
                    : typeof candidate.skills === 'object' && candidate.skills !== null
                      ? Object.keys(candidate.skills).join(", ")
                      : "No skills listed"}
                </div>
              </div>
              
              {candidate.resumeUrl && (
                <div>
                  <Label htmlFor="resume">Resume</Label>
                  <div className="flex items-center mt-1">
                    <a 
                      href={candidate.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center space-x-1"
                    >
                      <span>View Resume</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 rounded-md p-4 border border-blue-100">
                <h4 className="font-medium text-blue-800 flex items-center gap-2 mb-2">
                  <span>Resume URL</span>
                </h4>
                <div className="flex items-center">
                  <Input 
                    value={candidate.resumeUrl || ""} 
                    readOnly 
                    className="bg-white mr-2"
                  />
                  {candidate.resumeUrl && (
                    <a 
                      href={candidate.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md flex items-center"
                    >
                      <ExternalLink size={18} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes">
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">General Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this candidate..."
                  rows={10}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!canEdit}
                  className="resize-none"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          {canEdit && (
            <Button 
              onClick={handleSubmit}
              disabled={updateCandidateMutation.isPending}
            >
              {updateCandidateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}