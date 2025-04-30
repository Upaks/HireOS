import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Job } from "@/types";
import { Link, useLocation } from "wouter";
import { CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import ReactMarkdown from "react-markdown";

// Zod schema for job validation - ensures all required fields exist
const jobViewSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  type: z.string().min(1, "Type is required"),
  department: z.string().optional(),
  urgency: z.string().optional(),
  skills: z.string().optional(),
  teamContext: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  hiPeopleLink: z.string().optional(),
  expressReview: z.boolean().optional(),
  submitterId: z.number().optional(),
  candidateCount: z.number().optional(),
});

interface JobViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  onClose: () => void;
}

export default function JobViewModal({ 
  open, 
  onOpenChange, 
  job, 
  onClose 
}: JobViewModalProps) {
  const { toast } = useToast();
  const startTime = performance.now();
  
  // Validate the job data with Zod
  const validationResult = jobViewSchema.safeParse(job);
  if (!validationResult.success) {
    console.error("Job validation failed:", validationResult.error);
    toast({
      title: "Data validation error",
      description: "Some required job information is missing",
      variant: "destructive",
    });
  }
  
  // Fetch submitter details if available
  const { data: submitterData } = useQuery<any>({
    queryKey: ['/api/user', job.submitterId],
    enabled: !!job.submitterId,
  });
  
  // Fetch candidates for this job
  const { data: candidatesData } = useQuery<any[]>({
    queryKey: ['/api/candidates', { jobId: job.id }],
    enabled: open, // Only fetch when modal is open
  });
  
  const endTime = performance.now();
  console.log(`JobViewModal data prepared in ${endTime - startTime}ms`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
          <DialogDescription>
            View complete information about this job posting
          </DialogDescription>
        </DialogHeader>
        
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-xl font-bold text-slate-900">{job.title}</h2>
          <div className="flex items-center gap-3 mt-2">
            <Badge>{job.type}</Badge>
            <Badge variant="outline">{job.department || 'No Department'}</Badge>
            <Badge className="bg-slate-100 text-slate-800">
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div>
            <h3 className="text-sm font-medium text-slate-500">Department</h3>
            <p className="mt-1">{job.department || '—'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-500">Urgency</h3>
            <p className="mt-1">{job.urgency || '—'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-500">Skills</h3>
            <p className="mt-1">{job.skills || '—'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-500">Team Context</h3>
            <p className="mt-1">{job.teamContext || '—'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-500">Express Review</h3>
            <p className="mt-1">{job.expressReview ? 'Yes' : 'No'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-500">Submitter</h3>
            <p className="mt-1">{submitterData && 'fullName' in submitterData ? submitterData.fullName : (job.submitterId ? `ID: ${job.submitterId}` : '—')}</p>
          </div>
        </div>
        
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Description</h3>
          <div className="prose max-w-none text-sm bg-slate-50 p-4 rounded-md">
            <ReactMarkdown>{job.description}</ReactMarkdown>
          </div>
        </div>
        
        {job.hiPeopleLink && (
          <div className="mt-4 bg-slate-50 p-4 rounded-md">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-slate-700">
                  HiPeople assessment link
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {job.hiPeopleLink}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {candidatesData && Array.isArray(candidatesData) && candidatesData.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Candidates</h3>
            <ul className="divide-y divide-slate-100">
              {candidatesData.map((candidate: any) => (
                <li key={candidate.id} className="py-2">
                  <Link href={`/candidates/${candidate.id}`}>
                    <Button variant="link" className="p-0">
                      {candidate.name}
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Link href={`/jobs/${job.id}/edit`}>
            <Button>
              Edit Job
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}