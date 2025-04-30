import React from "react";
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
import { logger } from "@/lib/logger";

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
  
  // Use useRef to track if we've already logged things
  const loggingState = React.useRef({
    validationLogged: false,
    submitterLogged: false,
    candidatesLogged: false,
    renderingLogged: false
  });
  
  // Validate the job data with Zod - only do this once
  React.useEffect(() => {
    if (loggingState.current.validationLogged) return;
    
    const modalTimer = logger.timeOperation("Job view modal rendering");
    const validationResult = jobViewSchema.safeParse(job);
    
    if (!validationResult.success) {
      logger.error("Job validation failed", { 
        errors: validationResult.error.errors,
        jobId: job.id 
      });
      
      toast({
        title: "Data validation error",
        description: "Some required job information is missing",
        variant: "destructive",
      });
    } else {
      logger.info("Job data validated successfully", { jobId: job.id });
    }
    
    modalTimer.end("success", { jobId: job.id });
    loggingState.current.validationLogged = true;
    loggingState.current.renderingLogged = true;
  }, [job.id, toast]);
  
  // Fetch submitter details if available
  const { data: submitterData } = useQuery<any>({
    queryKey: ['/api/user', job.submitterId],
    enabled: !!job.submitterId
  });
  
  // Log submitter data fetching - in an effect to avoid re-renders
  React.useEffect(() => {
    if (submitterData && job.submitterId && !loggingState.current.submitterLogged) {
      const submitterTimer = logger.timeOperation("Fetch submitter data");
      submitterTimer.end("success", { submitterId: job.submitterId });
      loggingState.current.submitterLogged = true;
    }
  }, [submitterData, job.submitterId]);
  
  // Fetch candidates for this job
  const { data: candidatesData } = useQuery<any[]>({
    queryKey: ['/api/candidates', { jobId: job.id }],
    enabled: open // Only fetch when modal is open
  });
  
  // Log candidates data fetching - in an effect to avoid re-renders
  React.useEffect(() => {
    if (candidatesData && Array.isArray(candidatesData) && !loggingState.current.candidatesLogged) {
      const candidatesTimer = logger.timeOperation("Fetch job candidates");
      candidatesTimer.end("success", { 
        count: candidatesData.length,
        jobId: job.id 
      });
      loggingState.current.candidatesLogged = true;
    }
  }, [candidatesData, job.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[85vw] md:max-w-[75vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto w-full mx-auto my-4">
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
            <p className="mt-1 break-words">{job.department || '—'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-500">Urgency</h3>
            <p className="mt-1 break-words">{job.urgency || '—'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-500">Skills</h3>
            <p className="mt-1 break-words">{job.skills || '—'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-500">Team Context</h3>
            <p className="mt-1 break-words">{job.teamContext || '—'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-500">Express Review</h3>
            <p className="mt-1 break-words">{job.expressReview ? 'Yes' : 'No'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-500">Submitter</h3>
            <p className="mt-1 break-words">{submitterData && 'fullName' in submitterData ? submitterData.fullName : (job.submitterId ? `ID: ${job.submitterId}` : '—')}</p>
          </div>
        </div>
        
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Description</h3>
          <div className="prose prose-sm prose-slate max-w-none text-slate-800 bg-white border border-slate-200 p-5 rounded-md overflow-hidden break-words shadow-sm">
            <ReactMarkdown 
              components={{
                // Override default components to ensure proper styling with stronger semantic contrast
                h1: ({node, ...props}) => <h1 className="text-xl font-bold my-3 text-slate-900 border-b pb-2" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-bold my-3 text-slate-900" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-base font-semibold my-2 text-slate-900" {...props} />,
                p: ({node, ...props}) => <p className="my-2 whitespace-normal break-words text-slate-800 leading-relaxed" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 my-3 space-y-1" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-3 space-y-1" {...props} />,
                li: ({node, ...props}) => <li className="my-1 text-slate-800" {...props} />,
                a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                em: ({node, ...props}) => <em className="italic text-slate-800" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-slate-300 pl-4 italic my-3 text-slate-700" {...props} />,
                code: ({node, className, ...props}) => 
                  className?.includes("inline")
                    ? <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-sm" {...props} />
                    : <code className="block bg-slate-100 p-3 rounded text-slate-800 font-mono text-sm overflow-x-auto my-3" {...props} />,
                pre: ({node, ...props}) => <pre className="bg-slate-100 p-3 rounded my-3 overflow-x-auto font-mono text-sm" {...props} />
              }}
            >
              {job.description}
            </ReactMarkdown>
          </div>
        </div>
        
        {job.hiPeopleLink && (
          <div className="mt-4 bg-white border border-slate-200 p-4 rounded-md shadow-sm">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  HiPeople Assessment Link
                </p>
                <a 
                  href={job.hiPeopleLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 break-all inline-block"
                >
                  {job.hiPeopleLink}
                </a>
              </div>
            </div>
          </div>
        )}
        
        {candidatesData && Array.isArray(candidatesData) && candidatesData.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Candidates ({candidatesData.length})</h3>
            <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
              <ul className="divide-y divide-slate-100 w-full">
                {candidatesData.map((candidate: any) => (
                  <li key={candidate.id} className="hover:bg-slate-50 transition-colors">
                    <Link href={`/candidates/${candidate.id}`} className="block py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-blue-600 truncate hover:underline">{candidate.name}</p>
                          {candidate.email && (
                            <p className="text-xs text-slate-500 truncate mt-1">{candidate.email}</p>
                          )}
                        </div>
                        {candidate.status && (
                          <Badge className="shrink-0 bg-slate-100 text-slate-800 capitalize">
                            {candidate.status}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        <DialogFooter className="mt-6">
          <Button 
            variant="outline" 
            onClick={() => {
              logger.info("Closing job view modal", { jobId: job.id });
              onClose();
            }}
          >
            Close
          </Button>
          <Link href={`/jobs/${job.id}/edit`}>
            <Button onClick={() => logger.info("Navigating to edit job", { jobId: job.id })}>
              Edit Job
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}