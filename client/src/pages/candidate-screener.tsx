import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Candidate } from "@/types";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import CandidateCard from "@/components/candidates/candidate-card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function CandidateScreener() {
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("assessment_completed");
  
  // Fetch jobs for the filter dropdown
  const { data: jobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['/api/jobs'],
  });
  
  // Fetch candidates based on filters
  const { data: candidates, isLoading: isLoadingCandidates } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates', { jobId: jobFilter !== "all" ? jobFilter : undefined, status: statusFilter }],
  });
  
  // Handle job filter change
  const handleJobFilterChange = (value: string) => {
    setJobFilter(value);
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };
  
  // Get qualified candidates
  const getQualifiedCandidates = () => {
    if (!candidates) return [];
    
    // If filtering by qualified candidates, we're interested in candidates who:
    // 1. Have completed the assessment
    // 2. Have a percentile score > 50 (if we're specifically looking at qualified candidates)
    return candidates.filter(candidate => {
      if (statusFilter === "assessment_completed") {
        return candidate.hiPeoplePercentile && candidate.hiPeoplePercentile >= 50;
      }
      return true;
    });
  };

  const qualifiedCandidates = getQualifiedCandidates();
  
  return (
    <AppShell>
      <TopBar 
        title="Candidate Screener" 
        showNewHiringButton={false} 
      />
      
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-4">
          <div>
            <Label htmlFor="job-filter" className="sr-only">Filter by job</Label>
            <Select 
              value={jobFilter} 
              onValueChange={handleJobFilterChange}
            >
              <SelectTrigger id="job-filter" className="w-[200px]">
                <SelectValue placeholder="All Jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs?.map(job => (
                  <SelectItem key={job.id} value={job.id.toString()}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="status-filter" className="sr-only">Filter by status</Label>
            <Select 
              value={statusFilter} 
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger id="status-filter" className="w-[200px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="assessment_sent">Assessment Sent</SelectItem>
                <SelectItem value="assessment_completed">Assessment Completed</SelectItem>
                <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                <SelectItem value="talent_pool">Talent Pool</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6 bg-slate-50">
        {isLoadingCandidates ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : qualifiedCandidates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No candidates found matching the current filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {qualifiedCandidates.map(candidate => (
              <CandidateCard 
                key={candidate.id} 
                candidate={candidate} 
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
