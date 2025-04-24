import { useState } from "react";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import JobPostingsTable from "@/components/jobs/job-postings-table";
import HiringIntakeForm from "@/components/jobs/hiring-intake-form";

export default function Jobs() {
  const [hiringFormOpen, setHiringFormOpen] = useState(false);
  
  // Handle new hiring request button click
  const handleNewHiring = () => {
    setHiringFormOpen(true);
  };
  
  return (
    <AppShell>
      <TopBar 
        title="Job Postings" 
        onNewHiring={handleNewHiring} 
      />
      
      <div className="bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Job Postings</h1>
          <p className="text-sm text-slate-500 mt-1">
            View and manage all job postings across your organization
          </p>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <JobPostingsTable />
        </div>
      </div>
      
      {/* Hiring Intake Form Modal */}
      <HiringIntakeForm 
        open={hiringFormOpen} 
        onOpenChange={setHiringFormOpen} 
      />
    </AppShell>
  );
}