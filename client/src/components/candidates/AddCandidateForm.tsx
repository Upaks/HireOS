import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { uploadResume } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Job } from "@/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, CalendarIcon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Define form schema with validations
const candidateFormSchema = z.object({
  jobId: z.string().min(1, { message: "Job role is required" }),
  name: z.string().min(2, { message: "Full name is required" }),
  email: z.string().email({ message: "Valid email is required" }),
  phone: z.string().optional(),
  location: z.string().optional(),
  source: z.string().optional(),
  hiPeopleScore: z.number().int().min(0).max(100).optional(),
  hiPeoplePercentile: z.number().int().min(0).max(100).optional(),
  experienceYears: z.number().int().min(0).optional(),
  expectedSalary: z.string().optional(),
  skills: z.array(z.string()).max(3, { message: "Maximum 3 skills allowed" }).optional(),
  resumeFile: z.instanceof(File).optional(),
});

type CandidateFormValues = z.infer<typeof candidateFormSchema>;

interface AddCandidateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddCandidateForm({ open, onOpenChange }: AddCandidateFormProps) {
  const { toast } = useToast();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Fetch jobs for the dropdown
  const { data: jobs, isLoading: isLoadingJobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
  });

  // Form setup
  const form = useForm<CandidateFormValues>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: {
      jobId: "",
      name: "",
      email: "",
      phone: "",
      location: "",
      source: "",
      experienceYears: 0,
      expectedSalary: "",
      skills: [],
      hiPeopleScore: undefined,
      hiPeoplePercentile: undefined,
    },
  });

  // Handle form submission
  const addCandidateMutation = useMutation({
    mutationFn: async (data: CandidateFormValues) => {
      // Prepare payload for API with all required fields
      const payload = {
        jobId: parseInt(data.jobId),
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        location: data.location || "",
        source: data.source || "",
        hiPeopleScore: data.hiPeopleScore !== undefined ? data.hiPeopleScore : 0,
        hiPeoplePercentile: data.hiPeoplePercentile !== undefined ? data.hiPeoplePercentile : 0,
        experienceYears: data.experienceYears !== undefined ? data.experienceYears : 0,
        expectedSalary: data.expectedSalary || "",
        skills: selectedSkills || [],
        status: "new", // Default status for new candidates
        technicalProficiency: 0, // Default score
        leadershipInitiative: 0, // Default score
        problemSolving: 0, // Default score
        communicationSkills: 0, // Default score
        culturalFit: 0, // Default score
        notes: "", // Empty notes to start
        resumeUrl: null, // We'll update this after file upload
      };

      // Add debugging
      console.log("Sending candidate data:", payload);
      
      // Send data to API
      const response = await fetch("/api/candidates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include"
      });
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error("Server error response:", errorData);
          // Log validation errors if they exist
          if (errorData.errors) {
            console.error("Validation errors:", errorData.errors);
          }
          throw new Error(errorData.message || `Failed to add candidate: ${response.status} ${response.statusText}`);
        } catch (parseError) {
          console.error("Error parsing server response:", parseError);
          throw new Error(`Failed to add candidate: ${response.status} ${response.statusText}`);
        }
      }
      
      const newCandidate = await response.json();
      
      // Handle file upload if provided
      if (data.resumeFile && newCandidate.id) {
        try {
          setIsUploading(true);
          const resumeUrl = await uploadResume(data.resumeFile, newCandidate.id);
          
          // Update the candidate with the resume URL
          await fetch(`/api/candidates/${newCandidate.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ resumeUrl }),
            credentials: "include"
          });
          
          toast({
            title: "Resume uploaded",
            description: "The resume has been attached to the candidate's profile.",
          });
        } catch (err) {
          console.error("Resume upload failed:", err);
          toast({
            title: "Resume upload failed",
            description: "The candidate was added but we couldn't upload the resume.",
            variant: "destructive",
          });
        } finally {
          setIsUploading(false);
        }
      }
      
      return newCandidate;
    },
    onSuccess: () => {
      toast({
        title: "Candidate Added",
        description: "The candidate has been successfully added to the system.",
      });
      
      // Close the form and reset it
      onOpenChange(false);
      form.reset();
      setSelectedSkills([]);
      
      // Invalidate the candidates query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Adding Candidate",
        description: error.message || "There was a problem adding the candidate. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: CandidateFormValues) => {
    // Add the skills to the form data
    data.skills = selectedSkills;
    addCandidateMutation.mutate(data);
  };

  // Handle adding a skill
  const addSkill = () => {
    if (skillInput.trim() && selectedSkills.length < 3 && !selectedSkills.includes(skillInput.trim())) {
      setSelectedSkills([...selectedSkills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  // Handle removing a skill
  const removeSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter(s => s !== skill));
  };

  // Handle skill input keydown events
  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add New Candidate</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Job Role */}
            <FormField
              control={form.control}
              name="jobId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    Job Role <span className="text-red-500 ml-1">*</span>
                  </FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={isLoadingJobs}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a job position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {jobs?.map(job => (
                        <SelectItem key={job.id} value={job.id.toString()}>
                          {job.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      Full Name <span className="text-red-500 ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      Email <span className="text-red-500 ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="johndoe@example.com" type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+1 (555) 123-4567" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="New York, NY" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Source */}
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="LinkedIn, Indeed, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Experience Years */}
              <FormField
                control={form.control}
                name="experienceYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience (Years)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                        min="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Expected Salary */}
              <FormField
                control={form.control}
                name="expectedSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Salary</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="$75,000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* HiPeople Score */}
              <FormField
                control={form.control}
                name="hiPeopleScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HiPeople Score</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                        min="0"
                        max="100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* HiPeople Percentile */}
              <FormField
                control={form.control}
                name="hiPeoplePercentile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HiPeople Percentile</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                        min="0"
                        max="100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Skills - Multi-select with max 3 */}
            <FormItem>
              <FormLabel>Skills (Max 3)</FormLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedSkills.map(skill => (
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
                  disabled={selectedSkills.length >= 3}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={addSkill}
                  disabled={selectedSkills.length >= 3 || !skillInput.trim()}
                  className="ml-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              {selectedSkills.length >= 3 && (
                <p className="text-amber-600 text-sm mt-1">Maximum 3 skills reached</p>
              )}
            </FormItem>

            {/* Resume Upload */}
            <FormField
              control={form.control}
              name="resumeFile"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Resume (PDF only)</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      accept="application/pdf" 
                      className="py-1.5"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
                          onChange(file);
                        } else if (file) {
                          form.setError('resumeFile', { 
                            message: 'Only PDF files are allowed'
                          });
                          e.target.value = '';
                        }
                      }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={addCandidateMutation.isPending || isUploading}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={addCandidateMutation.isPending || isUploading}
              >
                {(addCandidateMutation.isPending || isUploading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Candidate
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}