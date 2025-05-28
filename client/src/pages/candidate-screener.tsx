import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Candidate, Job } from "@/types";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import CandidateCard from "@/components/candidates/candidate-card";
import CandidateListItem from "@/components/candidates/candidate-list-item";
import AddCandidateForm from "@/components/candidates/AddCandidateForm";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Search, 
  Grid, 
  List, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw,
  SlidersHorizontal,
  Plus
} from "lucide-react";
import { 
  getStatusesForFilter, 
  getStatusDisplay, 
  sortCandidatesByStatus 
} from "@/lib/candidate-status";
import { shouldExcludeFromRegularTab } from "@/lib/final-decision-utils";

export default function CandidateScreener() {
  // Filters and search
  const [jobFilter, setJobFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // View options
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [showFilters, setShowFilters] = useState(true);
  
  // Add Candidate Form
  const [showAddCandidateForm, setShowAddCandidateForm] = useState(false);
  
  // Fetch jobs for the filter dropdown
  const { data: jobs, isLoading: isLoadingJobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
  });
  
  // Fetch candidates based on filters
  const { data: candidates, isLoading: isLoadingCandidates } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates'],
  });
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [jobFilter, statusFilter, searchQuery, itemsPerPage]);

  // Filter and sort candidates
  const filteredCandidates = useMemo(() => {
    if (!candidates) return [];

    // Start with all candidates, excluding those that appear in Final Approvals
    let filtered = candidates.filter(candidate => !shouldExcludeFromRegularTab(candidate));
    
    // Apply job filter
    if (jobFilter !== "all") {
      filtered = filtered.filter(candidate => candidate.jobId.toString() === jobFilter);
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(candidate => candidate.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(candidate => 
        candidate.name.toLowerCase().includes(query) || 
        candidate.email.toLowerCase().includes(query) ||
        (candidate.location && candidate.location.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [candidates, jobFilter, statusFilter, searchQuery]);
  
  // Group candidates by job if no filters are applied
  const groupedCandidates = useMemo(() => {
    if (!filteredCandidates || !jobs) return [];
    
    // If filters are applied or we're not in grouped view mode, return flat list
    if (jobFilter !== "all" || statusFilter !== "all" || searchQuery.trim()) {
      return filteredCandidates;
    }
    
    // Group by job and sort within each group by status
    const jobGroups: Record<number, Candidate[]> = {};
    
    // Initialize job groups
    jobs.forEach(job => {
      jobGroups[job.id] = [];
    });
    
    // Add candidates to their job groups
    filteredCandidates.forEach(candidate => {
      if (jobGroups[candidate.jobId]) {
        jobGroups[candidate.jobId].push(candidate);
      }
    });
    
    // Sort candidates by status within each group
    Object.keys(jobGroups).forEach(jobId => {
      jobGroups[Number(jobId)] = sortCandidatesByStatus(jobGroups[Number(jobId)]);
    });
    
    // Flatten for display but keep the grouping for rendering
    const grouped: Candidate[] = [];
    Object.values(jobGroups).forEach(group => {
      grouped.push(...group);
    });
    
    return grouped;
  }, [filteredCandidates, jobs, jobFilter, statusFilter, searchQuery]);
  
  // Handle pagination
  const paginatedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return groupedCandidates.slice(startIndex, startIndex + itemsPerPage);
  }, [groupedCandidates, currentPage, itemsPerPage]);
  
  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(groupedCandidates.length / itemsPerPage));
  
  // Get job title by ID
  const getJobTitle = (jobId: number) => {
    if (!jobs) return `Job ID: ${jobId}`;
    const job = jobs.find(j => j.id === jobId);
    return job ? job.title : `Job ID: ${jobId}`;
  };
  
  // Reset all filters
  const resetFilters = () => {
    setJobFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  };
  
  // Determine if the current job has changed in list view (for group headers)
  const isNewJobGroup = (index: number) => {
    if (index === 0) return true;
    if (paginatedCandidates[index].jobId !== paginatedCandidates[index - 1].jobId) return true;
    return false;
  };
  
  return (
    <AppShell>
      <TopBar 
        title="Candidate Screener" 
        showNewHiringButton={false}
        showAddCandidateButton={true}
        onAddCandidate={() => setShowAddCandidateForm(true)}
      />
      
      {/* Add Candidate Form */}
      <AddCandidateForm 
        open={showAddCandidateForm} 
        onOpenChange={setShowAddCandidateForm} 
      />
      
      <div className="bg-white border-b border-slate-200">
        {/* Top bar with filter toggle and view mode */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-slate-600"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          
          <div className="flex space-x-2">
            <Button
              variant={viewMode === "card" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("card")}
              className="h-8 w-8"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="h-8 w-8"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Filter section */}
        {showFilters && (
          <div className="px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-200 bg-slate-50">
            <div className="flex flex-col md:flex-row md:items-end space-y-3 md:space-y-0 md:space-x-4">
              <div className="space-y-1">
                <Label htmlFor="job-filter">Job Position</Label>
                <Select 
                  value={jobFilter} 
                  onValueChange={setJobFilter}
                >
                  <SelectTrigger id="job-filter" className="w-full md:w-[200px]">
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
              
              <div className="space-y-1">
                <Label htmlFor="status-filter">Candidate Status</Label>
                <Select 
                  value={statusFilter} 
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger id="status-filter" className="w-full md:w-[240px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {getStatusesForFilter().map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1 flex-1">
                <Label htmlFor="search-query">Search Candidates</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="search-query"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={resetFilters}
                className="mt-4 md:mt-0"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Content area */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 bg-slate-50 min-h-screen">
        {isLoadingCandidates ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : groupedCandidates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-4">No candidates found matching the current filters.</p>
            <Button variant="outline" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Card View */}
            {viewMode === "card" && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {paginatedCandidates.map((candidate, index) => (
                  <div key={candidate.id}>
                    {/* Job Group Header (only in all/all view) */}
                    {jobFilter === "all" && statusFilter === "all" && isNewJobGroup(index) && (
                      <h3 className="text-lg font-medium mb-3 text-slate-800 flex items-center">
                        {getJobTitle(candidate.jobId)}
                        <Badge className="ml-2 bg-primary/10 text-primary text-xs">
                          {groupedCandidates.filter(c => c.jobId === candidate.jobId).length} candidates
                        </Badge>
                      </h3>
                    )}
                    <CandidateCard 
                      candidate={candidate} 
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* List View */}
            {viewMode === "list" && (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Candidate
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Job Position
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Assessment
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Applied On
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Rating
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCandidates.map((candidate, index) => (
                      <CandidateListItem 
                        key={candidate.id} 
                        candidate={candidate}
                        index={index}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination Control */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between">
              <div className="text-sm text-slate-700 mb-4 sm:mb-0">
                Showing <span className="font-medium">{Math.min(groupedCandidates.length, 1 + (currentPage - 1) * itemsPerPage)}</span> to{" "}
                <span className="font-medium">{Math.min(groupedCandidates.length, currentPage * itemsPerPage)}</span> of{" "}
                <span className="font-medium">{groupedCandidates.length}</span> candidates
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="per-page" className="whitespace-nowrap">Per Page</Label>
                  <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(value) => setItemsPerPage(parseInt(value))}
                  >
                    <SelectTrigger id="per-page" className="w-[70px]">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-8 w-8"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
