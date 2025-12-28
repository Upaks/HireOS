import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Candidate } from "@/types";
import { Loader2 } from "lucide-react";

interface InterviewFormProps {
  candidate: Candidate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InterviewForm({ 
  candidate, 
  open, 
  onOpenChange 
}: InterviewFormProps) {
  const { toast } = useToast();
  const [interviewType, setInterviewType] = useState("video");
  const [scheduledDate, setScheduledDate] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [notes, setNotes] = useState("");
  
  const createInterviewMutation = useMutation({
    mutationFn: async (interviewData: {
      candidateId: number;
      type: string;
      scheduledDate?: string;
      videoUrl?: string;
      notes?: string;
    }) => {
      const res = await apiRequest("POST", "/api/interviews", interviewData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      
      toast({
        title: "Interview scheduled",
        description: `Interview for ${candidate.name} has been scheduled successfully.`
      });
      
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to schedule interview",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleSubmit = () => {
    const interviewData = {
      candidateId: candidate.id,
      type: interviewType,
      ...(scheduledDate && { scheduledDate }),
      ...(videoUrl && { videoUrl }),
      ...(notes && { notes }),
    };
    
    createInterviewMutation.mutate(interviewData);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>
            Schedule an interview for {candidate.name} for the {candidate.job?.title} position.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="interview-type">Interview Type</Label>
            <Select 
              value={interviewType} 
              onValueChange={setInterviewType}
            >
              <SelectTrigger id="interview-type">
                <SelectValue placeholder="Select interview type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="scheduled-date">Scheduled Date</Label>
            <Input 
              id="scheduled-date"
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="video-url">Interview Recording URL (Optional)</Label>
            <Input 
              id="video-url"
              type="url"
              placeholder="https://zoom.us/recording/... or https://youtube.com/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Paste the recording link here after the interview. Works with Zoom, Google Meet, YouTube, Vimeo, etc.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes"
              placeholder="Any special instructions or preparation for the candidate..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createInterviewMutation.isPending}
          >
            {createInterviewMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              "Schedule Interview"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
