import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Job } from '@/types';

interface NewCandidate {
  contactId: string;
  crmName: string;
  candidateName: string;
}

interface JobAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: NewCandidate[];
  onConfirm: (assignments: { contactId: string; jobId: number | null }[]) => void;
  isLoading?: boolean;
}

export default function JobAssignmentModal({
  open,
  onOpenChange,
  candidates,
  onConfirm,
  isLoading = false,
}: JobAssignmentModalProps) {
  const [jobAssignments, setJobAssignments] = useState<{ [contactId: string]: number | null }>({});
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const initializedKeyRef = useRef<string>('');

  // Fetch active jobs
  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
  });

  const activeJobs = useMemo(() => jobs.filter(job => job.status === 'active'), [jobs]);

  // Create a stable key from candidates to detect when they change
  const candidatesKey = useMemo(() => 
    candidates.map(c => c.contactId).sort().join(','), 
    [candidates]
  );

  // Initialize job assignments only once when modal opens with new candidates
  // This effect should ONLY run when modal opens/closes or candidates change, NOT on every render
  useEffect(() => {
    // Only initialize if modal is open, has candidates, and we haven't initialized for this set of candidates
    if (open && candidates.length > 0 && initializedKeyRef.current !== candidatesKey) {
      // Get default job ID from current activeJobs
      const defaultJobId = activeJobs.length > 0 ? activeJobs[0].id : null;
      
      // Initialize assignments - only set defaults for candidates not already in state
      setJobAssignments(prev => {
        const newAssignments: { [contactId: string]: number | null } = {};
        candidates.forEach(candidate => {
          // Preserve existing assignment if it exists, otherwise use default
          newAssignments[candidate.contactId] = prev[candidate.contactId] ?? defaultJobId;
        });
        return newAssignments;
      });
      
      // Initialize selection - select all new candidates
      setSelectedCandidates(new Set(candidates.map(c => c.contactId)));
      
      initializedKeyRef.current = candidatesKey;
    }
    
    // Reset when modal closes
    if (!open && initializedKeyRef.current !== '') {
      initializedKeyRef.current = '';
      setJobAssignments({});
      setSelectedCandidates(new Set());
    }
    // Only depend on open state and candidatesKey - activeJobs is accessed but not a dependency
    // to prevent re-initialization when jobs are fetched
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, candidatesKey]);

  const handleJobChange = (contactId: string, jobId: string) => {
    setJobAssignments(prev => ({
      ...prev,
      [contactId]: parseInt(jobId),
    }));
  };

  const handleToggleCandidate = (contactId: string) => {
    setSelectedCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedCandidates(new Set(candidates.map(c => c.contactId)));
  };

  const handleDeselectAll = () => {
    setSelectedCandidates(new Set());
  };

  const handleBulkAssign = (jobId: string) => {
    const jobIdNum = parseInt(jobId);
    const newAssignments = { ...jobAssignments };
    selectedCandidates.forEach(contactId => {
      newAssignments[contactId] = jobIdNum;
    });
    setJobAssignments(newAssignments);
  };

  const handleConfirm = () => {
    // Only include selected candidates with valid job assignments
    const assignments = Array.from(selectedCandidates)
      .filter(contactId => {
        const jobId = jobAssignments[contactId];
        return jobId !== null && jobId !== undefined;
      })
      .map(contactId => ({
        contactId,
        jobId: jobAssignments[contactId]!,
      }));
    onConfirm(assignments);
  };

  const allSelected = candidates.length > 0 && candidates.every(c => selectedCandidates.has(c.contactId));
  const selectedCount = selectedCandidates.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-10">
          <DialogTitle>Assign Jobs to New Candidates</DialogTitle>
          <DialogDescription>
            Select which candidates to import and assign them to job postings. Each candidate must be assigned to a job. Unselected candidates will be skipped.
            {activeJobs.length === 0 && (
              <span className="block mt-2 text-destructive font-medium">
                No active jobs available. Please create a job posting first.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Bulk Actions */}
          {candidates.length > 0 && (
            <div className="shrink-0 flex items-center justify-between p-4 border-b bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={allSelected ? handleDeselectAll : handleSelectAll}
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedCount} of {candidates.length} selected
                </span>
              </div>
              {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Bulk assign selected:</Label>
                  <Select
                    value=""
                    onValueChange={handleBulkAssign}
                    disabled={isLoadingJobs}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Assign to job..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeJobs.map(job => (
                        <SelectItem key={job.id} value={job.id.toString()}>
                          {job.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Candidates List - scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-2 p-4">
              {candidates.map((candidate) => {
                const isSelected = selectedCandidates.has(candidate.contactId);
                const assignedJobId = jobAssignments[candidate.contactId] ?? null;

                return (
                  <div
                    key={candidate.contactId}
                    className={`flex items-center gap-4 p-4 border rounded-lg ${
                      isSelected ? 'bg-slate-50 dark:bg-slate-900' : 'bg-white dark:bg-slate-800 opacity-50'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleCandidate(candidate.contactId)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{candidate.crmName}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {candidate.candidateName !== 'N/A' ? candidate.candidateName : 'New Candidate'}
                      </div>
                    </div>
                    <div className="w-[250px]">
                      <Select
                        value={assignedJobId?.toString() || ''}
                        onValueChange={(value) => handleJobChange(candidate.contactId, value)}
                        disabled={!isSelected || isLoadingJobs || activeJobs.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={activeJobs.length === 0 ? "No jobs available" : "Select job..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {activeJobs.map(job => (
                            <SelectItem key={job.id} value={job.id.toString()}>
                              {job.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-6 pb-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || selectedCount === 0 || activeJobs.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${selectedCount} Candidate${selectedCount !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

