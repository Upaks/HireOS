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
import { Loader2, CheckCircle, Upload, ChevronRight, ChevronLeft } from "lucide-react";
import { uploadResume } from "@/lib/supabase";

interface FormField {
  id: string;
  type: "text" | "email" | "phone" | "textarea" | "number" | "select" | "multiselect" | "radio" | "checkbox" | "file" | "date" | "time" | "datetime" | "rating" | "scale" | "url" | "section" | "pagebreak";
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  settings?: {
    allowMultiple?: boolean;
    accept?: string;
    min?: number;
    max?: number;
    step?: number;
    rows?: number;
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
  const [currentPage, setCurrentPage] = useState(0);

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

  // Reset to first page when template changes
  useEffect(() => {
    if (formTemplate) {
      setCurrentPage(0);
    }
  }, [formTemplate]);

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

    // Validate required fields (only non-pagebreak, non-section fields)
    if (formTemplate) {
      for (const field of formTemplate.fields) {
        if (field.type !== 'pagebreak' && field.type !== 'section' && field.required && !formData[field.id] && field.type !== 'file') {
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

    // Prepare application data (exclude pagebreak and section fields)
    const applicationData: Record<string, any> = {};
    if (formTemplate) {
      for (const field of formTemplate.fields) {
        if (field.type !== 'file' && field.type !== 'pagebreak' && field.type !== 'section') {
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

  // Split fields into pages based on pagebreaks
  const pages = formTemplate ? formTemplate.fields.reduce((acc: FormField[][], field) => {
    if (field.type === "pagebreak") {
      acc.push([]); // Start new page
    } else if (acc.length === 0) {
      acc.push([field]); // First page
    } else {
      acc[acc.length - 1].push(field); // Add to current page
    }
    return acc;
  }, []) : [];

  const totalPages = pages.length || 1;
  const currentFields = pages[currentPage] || [];
  const isLastPage = currentPage === totalPages - 1;

  // Validate current page before moving forward
  const validateCurrentPage = () => {
    for (const field of currentFields) {
      if (field.type !== 'pagebreak' && field.type !== 'section' && field.required && !formData[field.id] && field.type !== 'file') {
        return { valid: false, field: field.label };
      }
    }
    return { valid: true };
  };

  const handleNext = () => {
    const validation = validateCurrentPage();
    if (!validation.valid) {
      toast({
        title: "Validation error",
        description: `${validation.field} is required`,
        variant: "destructive",
      });
      return;
    }
    setCurrentPage(Math.min(totalPages - 1, currentPage + 1));
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevious = () => {
    setCurrentPage(Math.max(0, currentPage - 1));
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderField = (field: FormField) => {
    if (field.type === "section") {
      return (
        <div key={field.id} className="py-4">
          <div className="border-t my-4"></div>
          <h3 className="text-lg font-semibold text-slate-900">{field.label}</h3>
          {field.description && (
            <p className="text-sm text-slate-500 mt-1">{field.description}</p>
          )}
          <div className="border-t my-4"></div>
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={field.id}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {field.description && (
          <p className="text-xs text-slate-500">{field.description}</p>
        )}
        
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
            rows={field.settings?.rows || 4}
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

        {field.type === "multiselect" && field.options && (
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

        {field.type === "radio" && field.options && (
          <div className="mt-2 space-y-2">
            {field.options.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${field.id}-${option}`}
                  name={field.id}
                  value={option}
                  checked={formData[field.id] === option}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor={`${field.id}-${option}`} className="font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </div>
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
              accept={field.settings?.accept || ".pdf,.doc,.docx"}
              multiple={field.settings?.allowMultiple || false}
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

        {field.type === "date" && (
          <Input
            id={field.id}
            type="date"
            value={formData[field.id] || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            className="mt-1"
          />
        )}

        {field.type === "time" && (
          <Input
            id={field.id}
            type="time"
            value={formData[field.id] || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            className="mt-1"
          />
        )}

        {field.type === "datetime" && (
          <Input
            id={field.id}
            type="datetime-local"
            value={formData[field.id] || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            className="mt-1"
          />
        )}

        {field.type === "rating" && (
          <div className="flex items-center gap-2 mt-2">
            {Array.from({ length: field.settings?.max || 5 }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleFieldChange(field.id, idx + 1)}
                className={`transition-colors ${
                  (formData[field.id] || 0) > idx
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-slate-300"
                }`}
              >
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {field.type === "scale" && (
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{field.settings?.min || 0}</span>
              <span>{field.settings?.max || 10}</span>
            </div>
            <input
              type="range"
              min={field.settings?.min || 0}
              max={field.settings?.max || 10}
              step={field.settings?.step || 1}
              value={formData[field.id] || field.settings?.min || 0}
              onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm text-slate-600">
              {formData[field.id] || field.settings?.min || 0}
            </div>
          </div>
        )}

        {field.type === "url" && (
          <Input
            id={field.id}
            type="url"
            value={formData[field.id] || ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder || "https://example.com"}
            required={field.required}
            className="mt-1"
          />
        )}
      </div>
    );
  };

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
              {/* Progress Indicator */}
              {totalPages > 1 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <span className="text-xs text-slate-500">
                      {Math.round(((currentPage + 1) / totalPages) * 100)}% Complete
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-2 flex-1 rounded-full transition-colors ${
                          idx === currentPage
                            ? "bg-primary"
                            : idx < currentPage
                            ? "bg-primary/50"
                            : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Current Page Fields */}
              {currentFields.map((field) => renderField(field))}

              {/* Navigation Buttons */}
              <div className="pt-6 border-t">
                {totalPages > 1 ? (
                  <div className="flex items-center justify-between gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentPage === 0}
                      size="lg"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                    
                    {isLastPage ? (
                      <Button
                        type="submit"
                        className="flex-1"
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
                    ) : (
                      <Button
                        type="button"
                        onClick={handleNext}
                        size="lg"
                        className="flex-1"
                      >
                        Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : (
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
                )}
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
