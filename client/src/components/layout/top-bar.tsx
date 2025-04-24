import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import HiringIntakeForm from "../jobs/hiring-intake-form";

interface TopBarProps {
  title: string;
  showNewHiringButton?: boolean;
  onNewHiring?: () => void;
}

export default function TopBar({ 
  title, 
  showNewHiringButton = true, 
  onNewHiring
}: TopBarProps) {
  const [hiringFormOpen, setHiringFormOpen] = useState(false);
  
  const handleNewHiring = () => {
    if (onNewHiring) {
      onNewHiring();
    } else {
      setHiringFormOpen(true);
    }
  };
  
  return (
    <div className="bg-white shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          
          {showNewHiringButton && (
            <div className="ml-4 flex items-center md:ml-6">
              <Button
                className="flex items-center"
                onClick={handleNewHiring}
              >
                <Plus className="h-5 w-5 mr-1" />
                New Hiring Request
              </Button>
            </div>
          )}
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
