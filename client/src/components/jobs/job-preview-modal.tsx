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
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import { Job } from "@/types";

interface JobPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  onClose: () => void;
}

export default function JobPreviewModal({ 
  open, 
  onOpenChange, 
  job, 
  onClose 
}: JobPreviewModalProps) {
  const { toast } = useToast();

  const approveJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/approve`, {});
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate jobs query to refresh jobs list
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      
      toast({
        title: "Job posting approved",
        description: "The job has been posted to configured platforms.",
      });
      
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve job posting",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApproveAndPost = () => {
    approveJobMutation.mutate(job.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generated Job Description - Preview</DialogTitle>
          <DialogDescription>
            Review the generated job description before posting.
          </DialogDescription>
        </DialogHeader>
        
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-xl font-bold text-slate-900">{job.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{job.type}</p>
        </div>
        
        <div className="py-4 prose max-w-none">
          {job.description.split('\n').map((line, index) => {
            if (line.startsWith('# ')) {
              return <h1 key={index} className="text-2xl font-bold mt-4">{line.substring(2)}</h1>;
            } else if (line.startsWith('## ')) {
              return <h2 key={index} className="text-xl font-bold mt-4">{line.substring(3)}</h2>;
            } else if (line.startsWith('- ')) {
              return <li key={index} className="ml-4">{line.substring(2)}</li>;
            } else if (line.trim() === '') {
              return <br key={index} />;
            } else {
              return <p key={index}>{line}</p>;
            }
          })}
        </div>
        
        <div className="mt-4 bg-slate-50 p-4 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-700">
                HiPeople assessment link automatically generated
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {job.hiPeopleLink}
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Edit Description
          </Button>
          <Button 
            onClick={handleApproveAndPost}
            disabled={approveJobMutation.isPending}
          >
            {approveJobMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              "Approve & Post Job"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
