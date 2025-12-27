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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Link2, Copy } from "lucide-react";
import { Job } from "@/types";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

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
  const [applicationLinkCopied, setApplicationLinkCopied] = useState(false);
  
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
  
  // Fetch available platform integrations
  const { data: integrations = [] } = useQuery<any[]>({
    queryKey: ['/api/platform-integrations'],
  });

  // Build available platforms from integrations
  const availablePlatforms = [
    { id: 'linkedin', name: 'LinkedIn', enabled: integrations.some(i => i.platformId === 'linkedin' && i.status === 'connected') },
    { id: 'onlinejobs', name: 'onlinejobs.ph', enabled: integrations.some(i => i.platformId === 'onlinejobs' && i.status === 'connected') },
    // Add custom platforms
    ...integrations
      .filter(i => i.platformType === 'custom' && i.status === 'connected')
      .map(i => ({ id: i.platformId, name: i.platformName, enabled: true }))
  ];
  
  // Selected platforms state - default to all enabled platforms
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  
  // Update selected platforms when integrations change
  useEffect(() => {
    const enabledPlatforms = availablePlatforms.filter(p => p.enabled).map(p => p.id);
    if (enabledPlatforms.length > 0 && selectedPlatforms.length === 0) {
      setSelectedPlatforms(enabledPlatforms);
    }
  }, [integrations]);

  const approveJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/approve`, {
        platforms: selectedPlatforms
      });
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
    if (selectedPlatforms.length === 0) {
      toast({
        title: "No platforms selected",
        description: "Please select at least one platform to post this job.",
        variant: "destructive",
      });
      return;
    }
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

        {/* Application Link Section */}
        <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <Link2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-blue-900">
                  Application Link
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Share this link in your job postings. Candidates will apply directly through HireOS.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-900 flex-1 break-all">
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

        {/* Platform Selection Section */}
        <div className="mt-4 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Select Platforms to Post</h3>
          <div className="space-y-3">
            {availablePlatforms.map((platform) => (
              <div key={platform.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`platform-${platform.id}`}
                  checked={selectedPlatforms.includes(platform.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedPlatforms([...selectedPlatforms, platform.id]);
                    } else {
                      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.id));
                    }
                  }}
                  disabled={!platform.enabled}
                />
                <Label 
                  htmlFor={`platform-${platform.id}`}
                  className={`text-sm font-medium cursor-pointer ${
                    !platform.enabled ? 'text-slate-400' : 'text-slate-700'
                  }`}
                >
                  {platform.name}
                  {!platform.enabled && (
                    <span className="ml-2 text-xs text-slate-400">(Not connected)</span>
                  )}
                </Label>
              </div>
            ))}
            {selectedPlatforms.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Please select at least one platform to post this job.
              </p>
            )}
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
