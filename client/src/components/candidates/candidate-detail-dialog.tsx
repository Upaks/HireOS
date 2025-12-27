import React, { useState, useEffect } from "react";
import { uploadResume } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Candidate } from "@/types";
import {
  Loader2,
  ExternalLink,
  Plus,
  Download,
  Printer,
  MoreVertical,
  CalendarIcon,
} from "lucide-react";
import StarRating from "../ui/star-rating";
import { getStatusesForFilter, LEGACY_STATUS_MAPPING } from "@/lib/candidate-status";

// Helper function to normalize candidate status (legacy -> new format)
function normalizeCandidateStatus(status: string | null | undefined): string {
  if (!status) return "00_application_submitted";
  // Check if it's a legacy status and map it
  if (LEGACY_STATUS_MAPPING[status]) {
    return LEGACY_STATUS_MAPPING[status];
  }
  // If it's already in the new format, return as is
  return status;
}
import { getFinalDecisionDisplayLabel } from "@/lib/final-decision-utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Confirmation Modal Component
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  candidateName: string;
  action: "assessment" | "interview" | "offer" | "talent-pool" | "reject";
  isLoading?: boolean;
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  action,
  isLoading = false,
}: ConfirmationModalProps) {
  const getActionDetails = (action: string) => {
    switch (action) {
      case "assessment":
        return { status: "Assessment", actionText: "Assessment" };
      case "interview":
        return { status: "Interview", actionText: "Interview" };
      case "offer":
        return { status: "Offered", actionText: "Offer" };
      case "talent-pool":
        return { status: "Talent Pool", actionText: "Talent Pool" };
      case "reject":
        return { status: "Rejected", actionText: "Reject" };
      default:
        return { status: action, actionText: action };
    }
  };

  const { status, actionText } = getActionDetails(action);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to update status to <strong>{status}</strong>{" "}
            for <strong>{candidateName}</strong> and send{" "}
            <strong>{actionText}</strong> email?
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
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
  );
}

interface CandidateDetailDialogProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CandidateDetailDialog({
  candidate,
  isOpen,
  onClose,
}: CandidateDetailDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isGHLSyncing, setIsGHLSyncing] = useState(false);

  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    action: "assessment" | "interview" | "offer" | "talent-pool" | "reject";
    isLoading: boolean;
  }>({
    isOpen: false,
    action: "assessment",
    isLoading: false,
  });

  // Candidate state values
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [experienceYears, setExperienceYears] = useState<number | undefined>(
    undefined,
  );
  const [expectedSalary, setExpectedSalary] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  // Assessment and evaluation state
  const [candidateStatus, setCandidateStatus] = useState("");
  const [hiPeopleScore, setHiPeopleScore] = useState<number | undefined>(
    undefined,
  );
  const [hiPeoplePercentile, setHiPeoplePercentile] = useState<
    number | undefined
  >(undefined);
  const [hiPeopleAssessmentLink, setHiPeopleAssessmentLink] = useState("");
  const [technicalProficiency, setTechnicalProficiency] = useState<
    number | undefined
  >(undefined);
  const [leadershipInitiative, setLeadershipInitiative] = useState<
    number | undefined
  >(undefined);
  const [problemSolving, setProblemSolving] = useState<number | undefined>(
    undefined,
  );
  const [communicationSkills, setCommunicationSkills] = useState<
    number | undefined
  >(undefined);
  const [culturalFit, setCulturalFit] = useState<number | undefined>(undefined);
  const [finalDecisionStatus, setFinalDecisionStatus] = useState<
    | "pending"
    | "offer_sent"
    | "rejected"
    | "talent_pool"
    | "not_applicable"
    | null
  >(null);

  // Track whether the user has interacted with the final decision dropdown
  const [finalDecisionTouched, setFinalDecisionTouched] = useState(false);
  const [lastInterviewDate, setLastInterviewDate] = useState<Date | undefined>(
    undefined,
  );

  // Check if the candidate is rejected (status 200_rejected or finalDecisionStatus is rejected)
  const isRejected =
    candidate?.status === "200_rejected" ||
    candidate?.finalDecisionStatus === "rejected";

  // Check if user has permission to edit (CEO, COO, or Director)
  // Candidate cannot be edited if rejected, unless by admin/CEO/COO/Director
  const canEdit =
    (user?.role === "ceo" ||
      user?.role === "coo" ||
      user?.role === "director" ||
      user?.role === "admin") &&
    !isRejected;

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
      } else if (
        typeof candidate.skills === "object" &&
        candidate.skills !== null
      ) {
        setSkills(Object.keys(candidate.skills));
      } else {
        setSkills([]);
      }

      // Notes and status
      setNotes(candidate.notes || "");
      // Normalize status to ensure it matches dropdown values
      setCandidateStatus(normalizeCandidateStatus(candidate.status));

      // Assessment data
      setHiPeopleScore(candidate.hiPeopleScore);
      setHiPeoplePercentile(candidate.hiPeoplePercentile);
      setHiPeopleAssessmentLink(
        (candidate as any).hiPeopleAssessmentLink || "",
      );

      // Evaluation data
      setTechnicalProficiency(candidate.technicalProficiency);
      setLeadershipInitiative(candidate.leadershipInitiative);
      setProblemSolving(candidate.problemSolving);
      setCommunicationSkills(candidate.communicationSkills);
      setCulturalFit(candidate.culturalFit);
      setFinalDecisionStatus(candidate.finalDecisionStatus || null);
      setFinalDecisionTouched(false); // Reset touch state when candidate changes
      setLastInterviewDate(
        (candidate as any).lastInterviewDate
          ? new Date((candidate as any).lastInterviewDate)
          : undefined,
      );
    }
  }, [candidate]);

  // Update candidate mutation
  const updateCandidateMutation = useMutation({
    mutationFn: async (data: Partial<Candidate>) => {
      if (!candidate) return null;
      const response = await apiRequest(
        "PATCH",
        `/api/candidates/${candidate.id}`,
        data,
      );
      return await response.json();
    },
    onSuccess: async (updatedCandidate) => {
      toast({
        title: "Candidate updated",
        description: "The candidate information has been updated successfully.",
      });

      // Note: CRM sync (Airtable, GHL) is now handled automatically by the backend
      // when the candidate is updated. No need for separate sync calls here.

      // Invalidate all candidate-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      if (candidate?.jobId) {
        queryClient.invalidateQueries({ queryKey: ["/api/candidates", { jobId: candidate.jobId }] });
      }
      
      // Update the local candidate object if it exists
      if (updatedCandidate) {
        queryClient.setQueryData(["/api/candidates"], (oldData: any) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          return oldData.map((c: any) => 
            c.id === updatedCandidate.id ? updatedCandidate : c
          );
        });
      }
      
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

  // Show confirmation modal for actions
  const showConfirmationModal = (
    action: "assessment" | "reject" | "talent-pool" | "interview" | "offer",
  ) => {
    setConfirmationModal({
      isOpen: true,
      action,
      isLoading: false,
    });
  };

  // Close confirmation modal
  const closeConfirmationModal = () => {
    setConfirmationModal({
      isOpen: false,
      action: "assessment",
      isLoading: false,
    });
  };

  // Handle confirmed action
  const handleConfirmedAction = async () => {
    if (!candidate) return;

    const action = confirmationModal.action;

    // Define actions with workflow mapping
    const actionMap: Record<
      string,
      {
        workflowAction: string | null; // corresponds to ghlAutomation workflowMap
        newStatus: string;
        finalDecisionStatus?: string;
        successTitle: string;
        successDescription: (name: string) => string;
      }
    > = {
      assessment: {
        workflowAction: "assessment",
        newStatus: "15_assessment_sent",
        successTitle: "Assessment started",
        successDescription: (name) =>
          `Assessment process initiated for ${name}.`,
      },
      reject: {
        workflowAction: "reject",
        newStatus: "200_rejected",
        finalDecisionStatus: "rejected",
        successTitle: "Candidate Rejected",
        successDescription: (name) => `${name} has been rejected and notified.`,
      },
      "talent-pool": {
        workflowAction: null, // no workflow in GHL
        newStatus: "90_talent_pool",
        finalDecisionStatus: "talent_pool",
        successTitle: "Moved to Talent Pool",
        successDescription: (name) =>
          `${name} has been added to the Talent Pool.`,
      },
      interview: {
        workflowAction: "interview",
        newStatus: "45_1st_interview_sent",
        successTitle: "Interview Invited",
        successDescription: (name) =>
          `${name} has been invited to an interview and an email has been sent.`,
      },
      offer: {
        workflowAction: "offer",
        newStatus: "95_offer_sent",
        finalDecisionStatus: "offer_sent",
        successTitle: "Offer Sent",
        successDescription: (name) => `An offer has been sent to ${name}.`,
      },
    };

    const selected = actionMap[action];
    if (!selected) return;

    // Set loading
    setConfirmationModal((prev) => ({ ...prev, isLoading: true }));

    try {
      // Special handling for interview action - call invite-to-interview endpoint
      if (action === "interview") {
        try {
          const inviteResponse = await apiRequest(
            "POST",
            `/api/candidates/${candidate.id}/invite-to-interview`,
            {},
          );

          if (!inviteResponse.ok) {
            const errorData = await inviteResponse.json();
            // Check if this is the email validation error
            if (errorData.errorType === "non_existent_email") {
              throw new Error("Candidate email does not exist. Cannot send interview invitation.");
            }
            throw new Error(errorData.message || "Failed to send interview invitation");
          }

          const updatedCandidate = await inviteResponse.json();
          
          // Update local state
          setCandidateStatus(selected.newStatus);
          
          toast({
            title: selected.successTitle,
            description: selected.successDescription(candidate.name),
          });

          queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
          if (candidate.jobId) {
            queryClient.invalidateQueries({ queryKey: ["/api/candidates", { jobId: candidate.jobId }] });
          }
          closeConfirmationModal();
          onClose();
          return; // Exit early since invite-to-interview already updates status
        } catch (inviteError: any) {
          // Check if this is the missing calendar link error
          if (inviteError.message?.includes("Calendar link not configured") || 
              (inviteError as any)?.errorType === "missing_calendar_link") {
            toast({
              title: "Calendar Link Required",
              description: "Please set your calendar scheduling link in Settings > User Management before sending interview invitations.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Failed to send interview invitation",
              description: inviteError.message || "An error occurred while sending the interview invitation.",
              variant: "destructive",
            });
          }
          setConfirmationModal((prev) => ({ ...prev, isLoading: false }));
          return;
        }
      }

      // For non-interview actions, proceed with normal workflow
      // If there is a mapped GHL workflow, call the automation API
      if (selected.workflowAction && candidate.ghlContactId) {
        const response = await apiRequest(
          "POST",
          "/api/ghl-automation/add-to-workflow",
          {
            contactId: candidate.ghlContactId,
            action: selected.workflowAction,
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to trigger GHL workflow",
          );
        }

        await response.json();
      }

      // Update candidate status via PATCH endpoint for non-interview actions
      const updateResponse = await apiRequest(
        "PATCH",
        `/api/candidates/${candidate.id}`,
        {
          status: normalizeCandidateStatus(selected.newStatus),
          ...(selected.finalDecisionStatus && {
            finalDecisionStatus: selected.finalDecisionStatus,
          }),
        },
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.message || "Failed to update candidate status");
      }

      // Update local state
      setCandidateStatus(selected.newStatus);
      if (selected.finalDecisionStatus) {
        setFinalDecisionStatus(selected.finalDecisionStatus as any);
      }

      toast({
        title: selected.successTitle,
        description: selected.successDescription(candidate.name),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      if (candidate.jobId) {
        queryClient.invalidateQueries({ queryKey: ["/api/candidates", { jobId: candidate.jobId }] });
      }
      closeConfirmationModal();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status.",
        variant: "destructive",
      });
      setConfirmationModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Handle adding a skill
  const addSkill = () => {
    if (
      skillInput.trim() &&
      skills.length < 3 &&
      !skills.includes(skillInput.trim())
    ) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  // Handle removing a skill
  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  // Handle skill input keydown events
  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
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
        resumeUrl,
      });

      toast({
        title: "Resume uploaded",
        description: "The resume has been attached to the candidate's profile.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setResumeFile(null);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload the resume.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const SHOW_ACTION_BUTTONS = true;
  const handleSubmit = () => {
    if (!candidate) return;

    // IMPORTANT: Keep both status fields synchronized
    let updatedFinalDecisionStatus = finalDecisionStatus;
    let updatedStatus = candidateStatus;

    // If current status is rejected, make sure final decision status matches
    if (
      candidateStatus === "200_rejected" &&
      finalDecisionStatus !== "rejected"
    ) {
      updatedFinalDecisionStatus = "rejected";
    }
    // If current status is offer sent, make sure final decision status matches
    else if (
      candidateStatus === "95_offer_sent" &&
      finalDecisionStatus !== "offer_sent"
    ) {
      updatedFinalDecisionStatus = "offer_sent";
    }

    // The other direction - if final decision status changes, update current status
    if (
      finalDecisionStatus === "rejected" &&
      candidateStatus !== "200_rejected"
    ) {
      updatedStatus = "200_rejected";
      setCandidateStatus("200_rejected");
    }
    // If final decision status is offer sent, update current status
    else if (
      finalDecisionStatus === "offer_sent" &&
      candidateStatus !== "95_offer_sent"
    ) {
      updatedStatus = "95_offer_sent";
      setCandidateStatus("95_offer_sent");
    }

    const updateData: any = {
      // Candidate details (only update if user can edit)
      ...(canEdit
        ? {
            name,
            email,
            phone,
            location,
            experienceYears,
            expectedSalary,
            skills,
          }
        : {}),
      // Assessment and evaluation data
      status: normalizeCandidateStatus(updatedStatus), // Normalize status before sending
      notes,
      hiPeopleScore,
      hiPeoplePercentile,
      hiPeopleAssessmentLink,
      technicalProficiency,
      leadershipInitiative,
      problemSolving,
      communicationSkills,
      culturalFit,
    };

    // Only include finalDecisionStatus if user touched the dropdown OR if it needs synchronization
    if (
      finalDecisionTouched ||
      (candidateStatus === "200_rejected" &&
        finalDecisionStatus !== "rejected") ||
      (candidateStatus === "95_offer_sent" &&
        finalDecisionStatus !== "offer_sent")
    ) {
      updateData.finalDecisionStatus = updatedFinalDecisionStatus;
    }

    // Add lastInterviewDate if set - convert to ISO string for API
    if (lastInterviewDate) {
      updateData.lastInterviewDate = lastInterviewDate.toISOString();
    }

    updateCandidateMutation.mutate(updateData);
  };

  // Function to get resume URL for the candidate
  const getResumeUrl = () => {
    // Use the stored resumeUrl if it exists (from application form uploads)
    if (candidate?.resumeUrl) {
      return candidate.resumeUrl;
    }
    // Fallback to constructed URL for legacy candidates
    if (!candidate?.id) return null;
    // Use the correct Supabase project URL (matches your DATABASE_URL project)
    return `https://ubpfvxmzjdspzykfnjzs.supabase.co/storage/v1/object/public/resumes/candidate-${candidate.id}.pdf`;
  };

  if (!candidate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[95vh] h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-2xl">{candidate.name}</DialogTitle>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-sm text-muted-foreground">
              {candidate.email}
            </span>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">
              {candidate.location || "No location"}
            </span>
            {candidate.ghlContactId && (
              <>
                <span className="text-sm text-muted-foreground">•</span>
                <Badge variant="secondary" className="text-xs">
                  GHL Synced
                </Badge>
              </>
            )}
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

                  {/* Last Interview Date Field */}
                  <div className="mt-2">
                    <Label htmlFor="lastInterviewDate">
                      Last Interview Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={`w-full justify-start text-left font-normal ${
                            !lastInterviewDate && "text-muted-foreground"
                          }`}
                          disabled={!canEdit}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {lastInterviewDate ? (
                            format(lastInterviewDate, "PPP")
                          ) : (
                            <span>Select date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={lastInterviewDate}
                          onSelect={setLastInterviewDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="mt-4">
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
                        {getStatusesForFilter().map((status) => (
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
                    value={
                      finalDecisionStatus === null
                        ? "not_applicable"
                        : finalDecisionStatus
                    }
                    onValueChange={(value) => {
                      setFinalDecisionTouched(true);
                      setFinalDecisionStatus(
                        value === "not_applicable" ? null : (value as any),
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_applicable">
                        Not Applicable
                      </SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="offer_sent">Offer</SelectItem>
                      <SelectItem value="talent_pool">Talent Pool</SelectItem>
                      <SelectItem value="rejected">Reject</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Display Final Decision Status Label */}
                  <div className="mt-2 text-sm text-muted-foreground">
                    Display:{" "}
                    {getFinalDecisionDisplayLabel(
                      candidate?.finalDecisionStatus,
                    )}
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
                        onChange={(e) =>
                          setHiPeopleScore(
                            parseInt(e.target.value) || undefined,
                          )
                        }
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
                        onChange={(e) =>
                          setHiPeoplePercentile(
                            parseInt(e.target.value) || undefined,
                          )
                        }
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label htmlFor="hiPeopleAssessmentLink">
                      HiPeople Assessment Link
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="hiPeopleAssessmentLink"
                        type="url"
                        placeholder="https://hipeople.io/assessment/..."
                        value={hiPeopleAssessmentLink}
                        onChange={(e) =>
                          setHiPeopleAssessmentLink(e.target.value)
                        }
                        disabled={!canEdit}
                        className="flex-1"
                      />
                      {hiPeopleAssessmentLink &&
                        hiPeopleAssessmentLink.trim() !== "" &&
                        hiPeopleAssessmentLink !== "N/A" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              window.open(
                                hiPeopleAssessmentLink,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                            title="Open assessment link in new tab"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">
                    Evaluation Criteria
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between">
                        <Label htmlFor="technical">Technical Proficiency</Label>
                        <span className="text-sm text-muted-foreground">
                          {technicalProficiency || 0}/5
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
                        <Label htmlFor="leadership">
                          Leadership & Initiative
                        </Label>
                        <span className="text-sm text-muted-foreground">
                          {leadershipInitiative || 0}/5
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
                        <Label htmlFor="problem-solving">Problem Solving</Label>
                        <span className="text-sm text-muted-foreground">
                          {problemSolving || 0}/5
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
                        <Label htmlFor="communication">
                          Communication Skills
                        </Label>
                        <span className="text-sm text-muted-foreground">
                          {communicationSkills || 0}/5
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
                        <Label htmlFor="cultural-fit">Cultural Fit</Label>
                        <span className="text-sm text-muted-foreground">
                          {culturalFit || 0}/5
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
                    onChange={(e) =>
                      setExperienceYears(parseInt(e.target.value) || undefined)
                    }
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
                    {skills.map((skill) => (
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
                        href={getResumeUrl() || ""}
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
                          const iframe = document.querySelector("iframe");
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
                    src={getResumeUrl() || ""}
                    className="w-full h-full"
                    title={`${candidate.name}'s Resume`}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4">
                    <p className="text-muted-foreground mb-4">
                      No resume uploaded
                    </p>
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

        <DialogFooter className="sticky bottom-0 bg-white z-10 mt-6 px-6 py-4 border-t flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          {SHOW_ACTION_BUTTONS && (
            <div className="flex flex-wrap gap-3">
              {!isRejected &&
                user &&
                (user.role === "ceo" ||
                  user.role === "coo" ||
                  user.role === "director" ||
                  user.role === "admin") && (
                  <>
                    <Button
                      className="bg-green-100 text-green-800 border border-transparent hover:border-green-400 hover:bg-green-100 hover:scale-105 transition-transform px-5 py-2 text-base"
                      onClick={() => showConfirmationModal("assessment")}
                    >
                      Assessment
                    </Button>

                    <Button
                      className="bg-orange-100 text-orange-800 border border-transparent hover:border-orange-400 hover:bg-orange-100 hover:scale-105 transition-transform px-5 py-2 text-base"
                      onClick={() => showConfirmationModal("interview")}
                    >
                      Interview
                    </Button>

                    <Button
                      className="bg-yellow-100 text-yellow-800 border border-transparent hover:border-yellow-400 hover:bg-yellow-100 hover:scale-105 transition-transform px-5 py-2 text-base"
                      onClick={() => showConfirmationModal("offer")}
                    >
                      Offer
                    </Button>

                    <Button
                      className="bg-purple-100 text-purple-800 border border-transparent hover:border-purple-400 hover:bg-purple-100 hover:scale-105 transition-transform px-5 py-2 text-base"
                      onClick={() => showConfirmationModal("talent-pool")}
                    >
                      Talent Pool
                    </Button>

                    <Button
                      className="bg-red-100 text-red-800 border border-transparent hover:border-red-400 hover:bg-red-100 hover:scale-105 transition-transform px-5 py-2 text-base"
                      onClick={() => showConfirmationModal("reject")}
                    >
                      Reject
                    </Button>
                  </>
                )}

              {isRejected && (
                <div className="text-sm text-red-600 italic">
                  This candidate has been rejected. No further actions are
                  available.
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-5 py-2 text-base"
            >
              {isRejected ? "Close" : "Cancel"}
            </Button>
            {canEdit && (
              <Button
                onClick={handleSubmit}
                disabled={
                  updateCandidateMutation.isPending ||
                  isRejected ||
                  isGHLSyncing
                }
                className="px-5 py-2 text-base"
              >
                {updateCandidateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isGHLSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing to GHL...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={closeConfirmationModal}
        onConfirm={handleConfirmedAction}
        candidateName={candidate?.name || ""}
        action={confirmationModal.action}
        isLoading={confirmationModal.isLoading}
      />
    </Dialog>
  );
}
