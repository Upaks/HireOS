import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Candidate } from "@/types";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface OfferFormProps {
  candidate: Candidate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OfferForm({ 
  candidate, 
  open, 
  onOpenChange 
}: OfferFormProps) {
  const { toast } = useToast();
  const [offerType, setOfferType] = useState("Full-time");
  const [compensation, setCompensation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  
  const sendOfferMutation = useMutation({
    mutationFn: async (offerData: {
      offerType: string;
      compensation: string;
      startDate?: string;
      notes?: string;
    }) => {
      const res = await apiRequest("POST", `/api/candidates/${candidate.id}/send-offer`, offerData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      
      toast({
        title: "Offer sent",
        description: `Offer has been sent to ${candidate.name}.`
      });
      
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send offer",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleSubmit = () => {
    if (!compensation) {
      toast({
        title: "Validation error",
        description: "Compensation is required",
        variant: "destructive",
      });
      return;
    }
    
    const offerData = {
      offerType,
      compensation,
      ...(startDate && { startDate }),
      ...(notes && { notes }),
    };
    
    sendOfferMutation.mutate(offerData);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Offer</DialogTitle>
          <DialogDescription>
            Create and send an offer to {candidate.name} for the {candidate.job?.title} position.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="offer-type">Offer Type</Label>
            <Select 
              value={offerType} 
              onValueChange={setOfferType}
            >
              <SelectTrigger id="offer-type">
                <SelectValue placeholder="Select offer type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Part-time">Part-time</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="compensation">Compensation</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <Input
                id="compensation"
                type="text"
                className="pl-7 pr-12"
                placeholder="0.00"
                value={compensation}
                onChange={(e) => setCompensation(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">USD</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes for Offer Letter</Label>
            <Textarea
              id="notes"
              placeholder="Any special terms or notes to include..."
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
            disabled={sendOfferMutation.isPending}
          >
            {sendOfferMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Offer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
