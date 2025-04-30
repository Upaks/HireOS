import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Job } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import JobViewModal from "./job-view-modal";
import { useToast } from "@/hooks/use-toast";

export default function JobPostingsTable() {
  const { toast } = useToast();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  
  const { data: jobs, isLoading, error } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
  });

  // Log performance metrics
  console.log(`Jobs data fetched in ${performance.now()}ms`);

  if (isLoading) {
    return <JobPostingsTableSkeleton />;
  }

  if (error) {
    console.error("Error loading jobs:", error);
    toast({
      title: "Error loading jobs",
      description: error.message,
      variant: "destructive",
    });
    
    return (
      <div className="text-center py-4 text-red-500">
        Error loading jobs: {error.message}
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No job postings found. Create a new hiring request to get started.
      </div>
    );
  }

  const handleViewJob = (job: Job) => {
    console.log(`Viewing job: ${job.title} (ID: ${job.id})`);
    const startTime = performance.now();
    
    setSelectedJob(job);
    setViewModalOpen(true);
    
    const endTime = performance.now();
    console.log(`Job view modal opened in ${endTime - startTime}ms`);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatPostedDate = (date: string | null) => {
    if (!date) return '—';
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <>
      <div className="shadow overflow-hidden border-b border-slate-200 sm:rounded-lg bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[300px]">Job Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Candidates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Posted Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-medium text-slate-900">{job.title}</div>
                    <div className="text-sm text-slate-500">{job.department || '—'}</div>
                  </div>
                </TableCell>
                <TableCell>{job.type}</TableCell>
                <TableCell>{job.candidateCount || 0}</TableCell>
                <TableCell>
                  <Badge className={getStatusBadgeColor(job.status)}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500">
                  {formatPostedDate(job.postedDate || null)}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="link" 
                    className="text-primary hover:text-primary-dark"
                    onClick={() => handleViewJob(job)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Job View Modal */}
      {selectedJob && (
        <JobViewModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          job={selectedJob}
          onClose={() => setViewModalOpen(false)}
        />
      )}
    </>
  );
}

function JobPostingsTableSkeleton() {
  return (
    <div className="shadow overflow-hidden border-b border-slate-200 sm:rounded-lg bg-white">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-[300px]">Job Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Candidates</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Posted Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(3)].map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <div>
                  <Skeleton className="h-5 w-40 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-10" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
