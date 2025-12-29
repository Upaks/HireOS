import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import HiringIntakeForm from "../jobs/hiring-intake-form";
import NotificationBell from "../notifications/notification-bell";

interface TopBarProps {
  title: string;
  showNewHiringButton?: boolean;
  showAddCandidateButton?: boolean;
  onNewHiring?: () => void;
  onAddCandidate?: () => void;
}

export default function TopBar({ 
  title, 
  showNewHiringButton = true,
  showAddCandidateButton = false,
  onNewHiring,
  onAddCandidate
}: TopBarProps) {
  const [hiringFormOpen, setHiringFormOpen] = useState(false);
  
  const handleNewHiring = () => {
    if (onNewHiring) {
      onNewHiring();
    } else {
      setHiringFormOpen(true);
    }
  };

  const handleAddCandidate = () => {
    if (onAddCandidate) {
      onAddCandidate();
    }
  };
  
  return (
    <div className="bg-white shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          
          <div className="ml-4 flex items-center space-x-3 md:ml-6">
            <NotificationBell />
            
            {showAddCandidateButton && (
              <Button
                className="flex items-center"
                onClick={handleAddCandidate}
              >
                <Plus className="h-5 w-5 mr-1" />
                Add Candidate
              </Button>
            )}
            
            {showNewHiringButton && (
              <Button
                className="flex items-center"
                onClick={handleNewHiring}
              >
                <Plus className="h-5 w-5 mr-1" />
                New Hiring Request
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {hiringFormOpen && (
        <HiringIntakeForm 
          open={hiringFormOpen} 
          onOpenChange={setHiringFormOpen} 
        />
      )}
    </div>
  );
}
