import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Job } from "@/types";

interface EditJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  onSuccess?: () => void;
}

export default function EditJobModal({ 
  open, 
  onOpenChange, 
  job,
  onSuccess 
}: EditJobModalProps) {
  const { toast } = useToast();
  const [jobTitle, setJobTitle] = useState("");
  const [roleType, setRoleType] = useState("Full-time");
  const [department, setDepartment] = useState("");
  const [urgency, setUrgency] = useState("Normal (Within a month)");
  const [skills, setSkills] = useState("");
  const [teamContext, setTeamContext] = useState("");
  const [description, setDescription] = useState("");
  const [expressReview, setExpressReview] = useState(false);

  // Initialize form with job data when modal opens
  useEffect(() => {
    if (open && job) {
      setJobTitle(job.title || "");
      setRoleType(job.type || "Full-time");
      setDepartment(job.department || "");
      setUrgency(job.urgency || "Normal (Within a month)");
      setSkills(job.skills || "");
      setTeamContext(job.teamContext || "");
      setDescription(job.description || "");
      setExpressReview(job.expressReview || false);
    }
  }, [open, job]);

  const updateJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      const res = await apiRequest("PATCH", `/api/jobs/${job.id}`, jobData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${job.id}`] });
      
      toast({
        title: "Job updated",
        description: "The job has been successfully updated.",
      });
      
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!jobTitle.trim()) {
      toast({
        title: "Validation error",
        description: "Job title is required",
        variant: "destructive",
      });
      return;
    }

    updateJobMutation.mutate({
      title: jobTitle,
      type: roleType,
      department: department || null,
      urgency: urgency || null,
      skills: skills || null,
      teamContext: teamContext || null,
      description: description || null,
      expressReview: expressReview,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
          <DialogDescription>
            Update the job details below. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-4 overflow-y-auto flex-1 pr-2">
          <div>
            <Label htmlFor="edit-job-title">Job Title</Label>
            <Input
              id="edit-job-title"
              placeholder="e.g. Senior Full Stack Developer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="edit-role-type">Role Type</Label>
            <Select value={roleType} onValueChange={setRoleType}>
              <SelectTrigger id="edit-role-type">
                <SelectValue placeholder="Select role type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Part-time">Part-time</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="edit-department">Department</Label>
            <Input
              id="edit-department"
              placeholder="e.g. Engineering, Sales, Marketing"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="edit-urgency">Hiring Urgency</Label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger id="edit-urgency">
                <SelectValue placeholder="Select urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Critical (Need ASAP)">Critical (Need ASAP)</SelectItem>
                <SelectItem value="High (Within 2 weeks)">High (Within 2 weeks)</SelectItem>
                <SelectItem value="Normal (Within a month)">Normal (Within a month)</SelectItem>
                <SelectItem value="Low (Ongoing)">Low (Ongoing)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="edit-skills">Required Skills / KPIs</Label>
            <Textarea
              id="edit-skills"
              placeholder="List key skills, experience, and performance indicators"
              rows={3}
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="edit-team-context">Team Context</Label>
            <Textarea
              id="edit-team-context"
              placeholder="Briefly describe the team this person will join"
              rows={2}
              value={teamContext}
              onChange={(e) => setTeamContext(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="edit-description">Job Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Full job description (markdown supported)"
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              You can use markdown formatting in the job description
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="edit-express-review"
              checked={expressReview}
              onCheckedChange={setExpressReview}
            />
            <Label htmlFor="edit-express-review">
              Express Review (Skip 3-hour delay for assessment delivery)
            </Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={updateJobMutation.isPending}
          >
            {updateJobMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

