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
import { CheckCircle, Link2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import { logger } from "@/lib/logger";
import EditJobModal from "./edit-job-modal";
import { queryClient } from "@/lib/queryClient";
import CandidateDetailDialog from "@/components/candidates/candidate-detail-dialog";


const jobViewSchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.string().min(1),
  department: z.string().nullish(), // Can be null, undefined, or string
  urgency: z.string().nullish(),
  skills: z.string().nullish(),
  teamContext: z.string().nullish(),
  status: z.string().min(1),
  hiPeopleLink: z.string().nullish(),
  expressReview: z.boolean().nullish(),
  submitterId: z.number().nullish(),
  candidateCount: z.number().nullish(),
});

interface JobViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  onClose: () => void;
}

export default function JobViewModal({ open, onOpenChange, job, onClose }: JobViewModalProps) {
  const { toast } = useToast();
  const [applicationLinkCopied, setApplicationLinkCopied] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [candidateDetailOpen, setCandidateDetailOpen] = useState(false);
  const loggingState = React.useRef({ validationLogged: false, submitterLogged: false, candidatesLogged: false });
  
  // Generate application link
  const applicationLink = `${window.location.origin}/apply/${job.id}`;
  
  const handleCopyApplicationLink = () => {
    navigator.clipboard.writeText(applicationLink);
    setApplicationLinkCopied(true);
    toast({
      title: "Link copied",
      description: "Application link copied to clipboard",
    });
    setTimeout(() => setApplicationLinkCopied(false), 2000);
  };

  React.useEffect(() => {
    if (loggingState.current.validationLogged) return;
    const modalTimer = logger.timeOperation("Job view modal rendering");
    const validationResult = jobViewSchema.safeParse(job);

    if (!validationResult.success) {
      logger.error("Job validation failed", { errors: validationResult.error.errors, jobId: job.id });
      toast({ title: "Data validation error", description: "Some required job information is missing", variant: "destructive" });
    } else {
      logger.info("Job data validated successfully", { jobId: job.id });
    }

    modalTimer.end("success", { jobId: job.id });
    loggingState.current.validationLogged = true;
  }, [job.id, toast]);

  const { data: submitterData } = useQuery<any>({ queryKey: ['/api/user', job.submitterId], enabled: !!job.submitterId });

  React.useEffect(() => {
    if (submitterData && job.submitterId && !loggingState.current.submitterLogged) {
      const submitterTimer = logger.timeOperation("Fetch submitter data");
      submitterTimer.end("success", { submitterId: job.submitterId });
      loggingState.current.submitterLogged = true;
    }
  }, [submitterData, job.submitterId]);

  // Fetch candidates for this job (filtered by jobId)
  const { data: candidatesData } = useQuery<any[]>({
    queryKey: ['/api/candidates', { jobId: job.id }],
    queryFn: async () => {
      const res = await fetch(`/api/candidates?jobId=${job.id}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch candidates');
      return res.json();
    },
    enabled: open // Only fetch when modal is open
  });

  // Fetch platforms for this job - DISABLED: Job posting API not currently available
  // const { data: platformsData } = useQuery<any[]>({
  //   queryKey: ['/api/jobs', job.id, 'platforms'],
  //   queryFn: async () => {
  //     const res = await fetch(`/api/jobs/${job.id}/platforms`, {
  //       credentials: 'include'
  //     });
  //     if (!res.ok) throw new Error('Failed to fetch platforms');
  //     return res.json();
  //   },
  //   enabled: open && job.status === 'active'
  // });
  const platformsData = undefined as any[] | undefined; // Placeholder - remove when API is available

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
      <DialogContent className="max-w-[95vw] lg:max-w-5xl max-h-[90vh] overflow-y-auto overflow-x-hidden w-full mx-auto my-4">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
          <DialogDescription>View complete information about this job posting</DialogDescription>
        </DialogHeader>

        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-xl font-bold text-slate-900">{job.title}</h2>
          <div className="flex items-center gap-3 mt-2">
            <Badge>{job.type}</Badge>
            <Badge variant="outline">{job.department || 'No Department'}</Badge>
            <Badge className="bg-slate-100 text-slate-800">{job.status.charAt(0).toUpperCase() + job.status.slice(1)}</Badge>
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          {/* Row 1: Department + Urgency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-500">Department</h3>
              <p className="mt-1 break-words">{job.department || '—'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-500">Urgency</h3>
              <p className="mt-1 break-words">{job.urgency || '—'}</p>
            </div>
          </div>

          {/* Row 2: Express Review + Submitter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-500">Express Review</h3>
              <p className="mt-1">{job.expressReview ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-500">Submitter</h3>
              <p className="mt-1 break-words">
                {submitterData && 'fullName' in submitterData
                  ? submitterData.fullName
                  : job.submitterId
                    ? `ID: ${job.submitterId}`
                    : '—'}
              </p>
            </div>
          </div>

          {/* Row 3: Skills + Team Context */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Skills */}
            <div>
              <h3 className="text-sm font-medium text-slate-500">Skills</h3>
              <div className="mt-1 max-h-40 overflow-y-auto p-2 bg-slate-50 border rounded">
                <p className="break-words whitespace-pre-wrap text-sm text-slate-700">{job.skills || '—'}</p>
              </div>
            </div>

            {/* Team Context */}
            <div>
              <h3 className="text-sm font-medium text-slate-500">Team Context</h3>
              <div className="mt-1 p-2 bg-slate-50 border rounded max-h-40 overflow-y-auto">
                <p className="break-words whitespace-pre-wrap text-sm text-slate-700">{job.teamContext || '—'}</p>
              </div>
            </div>
          </div>
        </div>


        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Description</h3>
            <div className="prose prose-sm prose-slate max-w-none text-slate-800 bg-white border border-slate-200 p-5 rounded-md max-h-[400px] overflow-y-auto overflow-x-hidden break-words shadow-sm">
            <ReactMarkdown 
                components={{
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

                  // 🔧 Replace both code and pre with this:
                  code: (props: any) => {
                    const { node, inline, className, children, ...rest } = props as { node?: any; inline?: boolean; className?: string; children?: React.ReactNode; [key: string]: any };
                    return inline ? (
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-sm" {...rest}>
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-slate-100 p-3 rounded text-slate-800 font-mono text-sm my-3 whitespace-pre-wrap break-words overflow-x-auto" {...rest}>
                        {children}
                      </pre>
                    );
                  }
                }}
              >{job.description}
            </ReactMarkdown>
          </div>
        </div>

        {job.hiPeopleLink && (
          <div className="mt-4 bg-white border border-slate-200 p-4 rounded-md shadow-sm">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">HiPeople Assessment Link</p>
                <a href={job.hiPeopleLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 break-all inline-block">
                  {job.hiPeopleLink}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Application Link Section */}
        <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start flex-1 min-w-0">
              <Link2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-900">
                  Application Link
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Share this link in your job postings. Candidates will apply directly through HireOS.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-900 flex-1 break-all min-w-0">
                    {applicationLink}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyApplicationLink}
                    className="shrink-0"
                  >
                    {applicationLinkCopied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posted Platforms Section */}
        {platformsData && Array.isArray(platformsData) && platformsData.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Posted Platforms</h3>
            <div className="space-y-2">
              {platformsData.map((platform: any) => {
                const getStatusColor = (status: string) => {
                  switch (status?.toLowerCase()) {
                    case 'posted':
                      return 'bg-green-100 text-green-800 border-green-200';
                    case 'pending':
                      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                    case 'failed':
                      return 'bg-red-100 text-red-800 border-red-200';
                    default:
                      return 'bg-slate-100 text-slate-800 border-slate-200';
                  }
                };

                return (
                  <div key={platform.id} className="bg-white border border-slate-200 rounded-md p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{platform.platform}</p>
                          {platform.postUrl && (
                            <a 
                              href={platform.postUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline mt-1 break-all inline-block"
                            >
                              {platform.postUrl}
                            </a>
                          )}
                          {platform.errorMessage && (
                            <p className="text-xs text-red-600 mt-1">{platform.errorMessage}</p>
                          )}
                        </div>
                        <Badge className={`shrink-0 ${getStatusColor(platform.status)}`}>
                          {platform.status?.charAt(0).toUpperCase() + platform.status?.slice(1) || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                    <div 
                      className="block py-3 px-4 cursor-pointer"
                      onClick={() => {
                        logger.info("Opening candidate details", { candidateId: candidate.id });
                        setSelectedCandidate(candidate);
                        setCandidateDetailOpen(true);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-blue-600 truncate">{candidate.name}</p>
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
                    </div>
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
          <Button 
            onClick={() => {
              logger.info("Edit job clicked", { jobId: job.id });
              setEditModalOpen(true);
            }}
          >
              Edit Job
            </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Edit Job Modal */}
      <EditJobModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        job={job}
        onSuccess={() => {
          // Refresh job data when edit is successful
          queryClient.invalidateQueries({ queryKey: [`/api/jobs/${job.id}`] });
          queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
        }}
      />
      
      {/* Candidate Detail Dialog */}
      {selectedCandidate && (
        <CandidateDetailDialog
          candidate={selectedCandidate}
          isOpen={candidateDetailOpen}
          onClose={() => {
            setCandidateDetailOpen(false);
            setSelectedCandidate(null);
          }}
        />
      )}
    </Dialog>
  );
}


