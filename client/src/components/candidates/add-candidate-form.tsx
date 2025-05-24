import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { Loader2, CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Define form schema with validations
const candidateFormSchema = z.object({
  jobId: z.string().min(1, { message: "Job role is required" }),
  name: z.string().min(2, { message: "Full name is required" }),
  email: z.string().email({ message: "Valid email is required" }),
  phone: z.string().optional(),
  location: z.string().optional(),
  source: z.string().optional(),
  hiPeopleCompletedAt: z.date().optional(),
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
      hiPeopleCompletedAt: undefined,
    },
  });

  // Handle form submission
  const addCandidateMutation = useMutation({
    mutationFn: async (data: CandidateFormValues) => {
      // First, handle file upload if a resume was provided
      let resumeUrl = undefined;
      
      // Prepare payload for API
      const payload = {
        jobId: parseInt(data.jobId),
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        location: data.location || "",
        source: data.source || "",
        hiPeopleCompletedAt: data.hiPeopleCompletedAt ? data.hiPeopleCompletedAt.toISOString() : undefined,
        hiPeopleScore: data.hiPeopleScore,
        hiPeoplePercentile: data.hiPeoplePercentile,
        experienceYears: data.experienceYears,
        expectedSalary: data.expectedSalary || "",
        skills: selectedSkills,
        resumeUrl,
        status: "new", // Default status for new candidates
      };

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
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add candidate");
      }
      
      return response.json();
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
    onError: (error) => {
      toast({
        title: "Error Adding Candidate",
        description: error instanceof Error ? error.message : "There was a problem adding the candidate. Please try again.",
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

              {/* HiPeople Completion Date */}
              <FormField
                control={form.control}
                name="hiPeopleCompletedAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Assessment Completion Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                  Add
                </Button>
              </div>
              {selectedSkills.length >= 3 && (
                <p className="text-amber-600 text-sm mt-1">Maximum 3 skills reached</p>
              )}
            </FormItem>

            {/* Resume Upload */}
            <FormItem>
              <FormLabel>Resume (PDF only)</FormLabel>
              <FormControl>
                <Input 
                  type="file" 
                  accept=".pdf" 
                  className="py-1.5"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.type === 'application/pdf') {
                      form.setValue('resumeFile', file);
                    } else if (file) {
                      form.setError('resumeFile', { 
                        message: 'Only PDF files are allowed'
                      });
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={addCandidateMutation.isPending}
              >
                {addCandidateMutation.isPending && (
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