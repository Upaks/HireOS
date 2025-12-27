import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle, Upload } from "lucide-react";
import { uploadResume } from "@/lib/supabase";

interface FormField {
  id: string;
  type: "text" | "email" | "phone" | "textarea" | "number" | "select" | "file" | "checkbox";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface FormTemplate {
  id: number;
  name: string;
  description?: string;
  fields: FormField[];
  isDefault: boolean;
}

interface Job {
  id: number;
  title: string;
  description: string;
  type: string;
  department?: string;
  formTemplateId?: number;
}

export default function ApplyPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const jobId = params?.jobId ? parseInt(params.jobId) : null;
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch job details
  const { data: job, isLoading: isLoadingJob } = useQuery<Job>({
    queryKey: ['/api/jobs', jobId],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Job not found');
      return res.json();
    },
    enabled: !!jobId,
  });

  // Fetch form template (either job-specific or default)
  const { data: formTemplate, isLoading: isLoadingTemplate } = useQuery<FormTemplate>({
    queryKey: ['/api/form-templates', job?.formTemplateId || 'default'],
    queryFn: async () => {
      if (job?.formTemplateId) {
        const res = await fetch(`/api/form-templates/${job.formTemplateId}`, { credentials: 'include' });
        if (res.ok) return res.json();
      }
      // Fallback to default template
      const res = await fetch('/api/form-templates/default');
      if (!res.ok) throw new Error('No form template found');
      return res.json();
    },
    enabled: !!job,
  });

  // Submit application mutation
  const submitApplicationMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/applications", data);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Application submitted",
        description: "Thank you for your application! We'll be in touch soon.",
      });
      // Redirect after 3 seconds
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit application",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData({ ...formData, [fieldId]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Resume must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setResumeFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobId) {
      toast({
        title: "Error",
        description: "Invalid job application link",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (formTemplate) {
      for (const field of formTemplate.fields) {
        if (field.required && !formData[field.id] && field.type !== 'file') {
          toast({
            title: "Validation error",
            description: `${field.label} is required`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Upload resume if provided (via backend to avoid CORS issues)
    let resumeUrl: string | null = null;
    if (resumeFile) {
      setIsUploading(true);
      try {
        console.log("Starting resume upload...", { fileName: resumeFile.name, fileSize: resumeFile.size });
        
        // Upload via backend endpoint to avoid CORS issues
        const formData = new FormData();
        formData.append('resume', resumeFile);
        
        const uploadResponse = await fetch('/api/upload/resume', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({ message: 'Upload failed' }));
          throw new Error(errorData.message || `Upload failed: ${uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();
        resumeUrl = uploadResult.url;
        
        console.log("Resume uploaded successfully:", resumeUrl);
        toast({
          title: "Resume uploaded",
          description: "Your resume has been uploaded successfully.",
        });
      } catch (error: any) {
        console.error("Resume upload error:", error);
        // Show detailed error message
        const errorMessage = error?.message || error?.toString() || "Unknown error occurred";
        toast({
          title: "Failed to upload resume",
          description: errorMessage + " Please check the browser console for more details.",
          variant: "destructive",
        });
        // Resume upload is REQUIRED - block form submission
        setIsUploading(false);
        return; // Stop form submission - resume is required
      } finally {
        setIsUploading(false);
      }
    }

    // Prepare application data
    const applicationData: Record<string, any> = {};
    if (formTemplate) {
      for (const field of formTemplate.fields) {
        if (field.type !== 'file') {
          applicationData[field.id] = formData[field.id] || null;
        }
      }
    }

    // Submit application
    submitApplicationMutation.mutate({
      jobId,
      name: formData.name || "",
      email: formData.email || "",
      phone: formData.phone || "",
      location: formData.location || "",
      resumeUrl,
      applicationData,
      source: "website",
    });
  };

  if (!jobId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Application Link</h1>
          <p className="text-slate-600">The application link you used is invalid or expired.</p>
        </div>
      </div>
    );
  }

  if (isLoadingJob || isLoadingTemplate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Job Not Found</h1>
          <p className="text-slate-600">This job posting is no longer available.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h1>
          <p className="text-slate-600 mb-4">
            Thank you for applying to <strong>{job.title}</strong>. We've received your application and will review it shortly.
          </p>
          <p className="text-sm text-slate-500">You'll be redirected shortly...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Job Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{job.title}</h1>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>{job.type}</span>
            {job.department && <span>• {job.department}</span>}
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Application Form</h2>
          
          {formTemplate ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {formTemplate.fields.map((field) => (
                <div key={field.id}>
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  
                  {field.type === "text" && (
                    <Input
                      id={field.id}
                      value={formData[field.id] || ""}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="mt-1"
                    />
                  )}

                  {field.type === "email" && (
                    <Input
                      id={field.id}
                      type="email"
                      value={formData[field.id] || ""}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="mt-1"
                    />
                  )}

                  {field.type === "phone" && (
                    <Input
                      id={field.id}
                      type="tel"
                      value={formData[field.id] || ""}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="mt-1"
                    />
                  )}

                  {field.type === "textarea" && (
                    <Textarea
                      id={field.id}
                      value={formData[field.id] || ""}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      rows={4}
                      className="mt-1"
                    />
                  )}

                  {field.type === "number" && (
                    <Input
                      id={field.id}
                      type="number"
                      value={formData[field.id] || ""}
                      onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value) || "")}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="mt-1"
                    />
                  )}

                  {field.type === "select" && field.options && (
                    <Select
                      value={formData[field.id] || ""}
                      onValueChange={(value) => handleFieldChange(field.id, value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={field.placeholder || "Select an option"} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {field.type === "checkbox" && field.options && (
                    <div className="mt-2 space-y-2">
                      {field.options.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${field.id}-${option}`}
                            checked={(formData[field.id] || []).includes(option)}
                            onCheckedChange={(checked) => {
                              const current = formData[field.id] || [];
                              if (checked) {
                                handleFieldChange(field.id, [...current, option]);
                              } else {
                                handleFieldChange(field.id, current.filter((v: string) => v !== option));
                              }
                            }}
                          />
                          <Label htmlFor={`${field.id}-${option}`} className="font-normal">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {field.type === "file" && (
                    <div className="mt-1">
                      <Input
                        id={field.id}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        required={field.required}
                        className="cursor-pointer"
                      />
                      {resumeFile && (
                        <p className="text-sm text-slate-500 mt-1">
                          Selected: {resumeFile.name}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-4 border-t">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitApplicationMutation.isPending || isUploading}
                  size="lg"
                >
                  {submitApplicationMutation.isPending || isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isUploading ? "Uploading resume..." : "Submitting..."}
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading application form...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

