import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, RefreshCw, Eye, Play } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import JobAssignmentModal from "@/components/integrations/job-assignment-modal";

interface SyncResult {
  success: boolean;
  totalCRMContacts: number;
  totalCandidates: number;
  matched: number;
  updated: number;
  created: number; // New candidates created from Airtable
  skipped: number;
  errors: string[];
  details: {
    contactId: string;
    crmName: string;
    candidateName: string;
    action: 'updated' | 'skipped' | 'error' | 'created';
    reason?: string;
  }[];
}

interface CRMIntegration {
  id: number;
  platformId: string;
  platformName: string;
  status: "connected" | "disconnected" | "error";
}

export default function CRMSyncPage() {
  const { toast } = useToast();
  const [selectedCRM, setSelectedCRM] = useState<string>("");
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [jobAssignmentModalOpen, setJobAssignmentModalOpen] = useState(false);
  const [pendingNewCandidates, setPendingNewCandidates] = useState<{ contactId: string; crmName: string; candidateName: string }[]>([]);
  const queryClient = useQueryClient();

  // Fetch connected CRM integrations
  const { data: integrations = [], isLoading: integrationsLoading } = useQuery<CRMIntegration[]>({
    queryKey: ['/api/crm-integrations'],
  });

  const connectedCRMs = integrations.filter(i => i.status === "connected");

  const previewMutation = useMutation({
    mutationFn: async (platformId: string) => {
      const response = await apiRequest('GET', `/api/crm-sync/${platformId}/preview`);
      return response.json();
    },
    onSuccess: (data) => {
      setLastSyncResult(data);
      // Auto-select all new candidates for import
      const newCandidateIds = data.details
        .filter((d: { action: string }) => d.action === 'created')
        .map((d: { contactId: string }) => d.contactId);
      setSelectedContactIds(new Set(newCandidateIds));
      toast({
        title: "Preview completed",
        description: `Found ${data.totalCRMContacts} CRM contacts and ${data.totalCandidates} candidates. ${data.matched} matches found.`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to preview sync';
      toast({
        title: "Preview failed",
        description: errorMessage,
        variant: "destructive",
      });
      setLastSyncResult({
        success: false,
        totalCRMContacts: 0,
        totalCandidates: 0,
        matched: 0,
        updated: 0,
        created: 0,
        skipped: 0,
        errors: [errorMessage],
        details: [],
      });
    },
  });

  // Step 1: Execute sync for existing candidates (updates only)
  const executeMutation = useMutation({
    mutationFn: async ({ platformId, selectedIds }: { platformId: string; selectedIds?: string[] }) => {
      const response = await apiRequest('POST', `/api/crm-sync/${platformId}/execute`, {
        selectedContactIds: selectedIds,
        skipNewCandidates: true, // Only process existing candidates
      });
      return response.json();
    },
    onSuccess: (data) => {
      // After processing existing candidates, check if there are new candidates to assign
      const newCandidatesToAssign = newCandidates.filter(c => selectedContactIds.has(c.contactId));
      
      if (newCandidatesToAssign.length > 0) {
        // Open modal for job assignment
        setPendingNewCandidates(newCandidatesToAssign);
        setJobAssignmentModalOpen(true);
      } else {
        // No new candidates, just show success
        setLastSyncResult(data);
        handleSyncComplete(data);
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to execute sync';
      toast({
        title: "Sync failed",
        description: errorMessage,
        variant: "destructive",
      });
      setLastSyncResult({
        success: false,
        totalCRMContacts: 0,
        totalCandidates: 0,
        matched: 0,
        updated: 0,
        created: 0,
        skipped: 0,
        errors: [errorMessage],
        details: [],
      });
    },
  });

  // Step 2: Create new candidates with job assignments
  const createCandidatesMutation = useMutation({
    mutationFn: async ({ platformId, assignments }: { platformId: string; assignments: { contactId: string; jobId: number | null }[] }) => {
      const response = await apiRequest('POST', `/api/crm-sync/${platformId}/create-candidates`, {
        assignments,
      });
      
      const text = await response.text();
      
      if (!text) {
        throw new Error('Empty response from server');
      }
      
      try {
        return JSON.parse(text);
      } catch (parseError: any) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }
    },
    onSuccess: (data) => {
      setJobAssignmentModalOpen(false);
      setPendingNewCandidates([]);
      
      // Update last sync result with creation data
      if (lastSyncResult) {
        const updatedResult = {
          ...lastSyncResult,
          created: data.created || 0,
          details: [...lastSyncResult.details, ...(data.details || [])],
        };
        setLastSyncResult(updatedResult);
        handleSyncComplete(updatedResult);
      } else {
        handleSyncComplete(data);
      }
    },
    onError: (error: any) => {
      console.error('❌ Create candidates error:', error);
      let errorMessage = 'Failed to create candidates';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response) {
        errorMessage = `Server error: ${error.response.status}`;
      }
      toast({
        title: "Import failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSyncComplete = (data: SyncResult) => {
    // Clear selection after successful sync
    setSelectedContactIds(new Set());
    
    // Force refresh of all candidate queries
    queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
    queryClient.invalidateQueries({ queryKey: ['candidates'] });
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === 'string' && key.includes('candidate');
    }});
    
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ['/api/candidates'] });
      queryClient.refetchQueries({ queryKey: ['/api/jobs'] });
    }, 300);
    
    toast({
      title: "Sync completed",
      description: `Matched ${data.matched} contacts, updated ${data.updated} candidates${data.created > 0 ? `, created ${data.created} new candidates` : ''}, skipped ${data.skipped}.`,
    });
  };

  const handleJobAssignmentConfirm = (assignments: { contactId: string; jobId: number | null }[]) => {
    if (!selectedCRM) return;
    createCandidatesMutation.mutate({
      platformId: selectedCRM,
      assignments,
    });
  };

  const handlePreview = () => {
    if (!selectedCRM) return;
    previewMutation.mutate(selectedCRM);
  };

  const handleExecute = () => {
    if (!selectedCRM) return;
    const selectedIds = Array.from(selectedContactIds);
    // Always pass selectedIds array if there are new candidates, even if empty
    // This ensures only selected candidates are created
    const hasNewCandidates = newCandidates.length > 0;
    executeMutation.mutate({ 
      platformId: selectedCRM, 
      selectedIds: hasNewCandidates ? selectedIds : undefined 
    });
  };

  // Get all new candidates (action === 'created') from preview results
  const newCandidates = useMemo(() => {
    if (!lastSyncResult) return [];
    return lastSyncResult.details.filter(d => d.action === 'created');
  }, [lastSyncResult]);

  const handleToggleSelection = (contactId: string) => {
    const newSet = new Set(selectedContactIds);
    if (newSet.has(contactId)) {
      newSet.delete(contactId);
    } else {
      newSet.add(contactId);
    }
    setSelectedContactIds(newSet);
  };

  const handleSelectAll = () => {
    const allIds = new Set(newCandidates.map(c => c.contactId));
    setSelectedContactIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedContactIds(new Set());
  };

  const allSelected = newCandidates.length > 0 && newCandidates.every(c => selectedContactIds.has(c.contactId));
  const someSelected = newCandidates.some(c => selectedContactIds.has(c.contactId));

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'updated':
        return <Badge variant="default" className="bg-green-100 text-green-800">Updated</Badge>;
      case 'created':
        return <Badge variant="default" className="bg-emerald-100 text-emerald-800">Created</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <AppShell>
      <TopBar title="CRM Sync" />
      <div className="bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">CRM Contact Sync</h1>
          <p className="text-sm text-slate-500">
            Sync contacts from your CRM with candidates in HireOS by matching names
          </p>
        </div>

        {integrationsLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : connectedCRMs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No CRM Connected</h3>
              <p className="text-sm text-slate-500 mb-4">
                Connect a CRM in Settings → Integrations to sync contacts
              </p>
              <Button onClick={() => window.location.href = '/settings?tab=integrations'}>
                Go to Settings
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control Panel */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Sync Controls
                </CardTitle>
                <CardDescription>
                  Select a CRM and preview or execute synchronization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Select CRM
                  </label>
                  <Select value={selectedCRM} onValueChange={setSelectedCRM}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a CRM..." />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedCRMs.map((crm) => (
                        <SelectItem key={crm.platformId} value={crm.platformId}>
                          {crm.platformName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handlePreview}
                  disabled={previewMutation.isPending || !selectedCRM}
                  className="w-full"
                  variant="outline"
                >
                  {previewMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Preview Changes
                </Button>

                <Button 
                  onClick={handleExecute}
                  disabled={executeMutation.isPending || !lastSyncResult || !selectedCRM}
                  className="w-full"
                >
                  {executeMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Execute Sync
                  {newCandidates.length > 0 && selectedContactIds.size > 0 && (
                    <span className="ml-2 text-xs">({selectedContactIds.size} selected)</span>
                  )}
                </Button>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Always preview changes before executing. The sync will update candidate records with CRM contact IDs.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Results Overview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Sync Results</CardTitle>
                <CardDescription>
                  Summary of the last sync operation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lastSyncResult ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{lastSyncResult.totalCRMContacts}</div>
                        <div className="text-sm text-slate-600">CRM Contacts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{lastSyncResult.totalCandidates}</div>
                        <div className="text-sm text-slate-600">Candidates</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{lastSyncResult.matched}</div>
                        <div className="text-sm text-slate-600">Matched</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{lastSyncResult.updated}</div>
                        <div className="text-sm text-slate-600">Updated</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-emerald-600">{lastSyncResult.created || 0}</div>
                        <div className="text-sm text-slate-600">Created</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-slate-600">{lastSyncResult.skipped}</div>
                        <div className="text-sm text-slate-600">Skipped</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-red-600">{lastSyncResult.errors.length}</div>
                        <div className="text-sm text-slate-600">Errors</div>
                      </div>
                    </div>

                    {lastSyncResult.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-medium">Errors occurred during sync:</div>
                          <ul className="mt-2 space-y-1">
                            {lastSyncResult.errors.map((error, index) => (
                              <li key={index} className="text-sm">• {error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {lastSyncResult.success && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Sync completed successfully.
                          {lastSyncResult.updated > 0 && ` ${lastSyncResult.updated} candidate${lastSyncResult.updated !== 1 ? 's' : ''} updated.`}
                          {lastSyncResult.created > 0 && ` ${lastSyncResult.created} new candidate${lastSyncResult.created !== 1 ? 's' : ''} created.`}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No sync results yet. Select a CRM and click "Preview Changes" to start.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Results */}
        {lastSyncResult && lastSyncResult.details.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detailed Results</CardTitle>
                  <CardDescription>
                    Individual contact processing details
                  </CardDescription>
                </div>
                {newCandidates.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={allSelected ? handleDeselectAll : handleSelectAll}
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                    <span className="text-sm text-slate-600">
                      {selectedContactIds.size} of {newCandidates.length} selected
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {lastSyncResult.details.map((detail, index) => {
                    const isNewCandidate = detail.action === 'created';
                    const isSelected = selectedContactIds.has(detail.contactId);
                    
                    return (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-3 border rounded-lg ${
                          isNewCandidate ? 'bg-slate-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {isNewCandidate && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleSelection(detail.contactId)}
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{detail.crmName}</div>
                            <div className="text-sm text-slate-600">
                              {detail.candidateName !== 'N/A' ? `→ ${detail.candidateName}` : 'No candidate match'}
                            </div>
                            {detail.reason && (
                              <div className="text-xs text-slate-500 mt-1">{detail.reason}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getActionBadge(detail.action)}
                          <div className="text-xs text-slate-500 font-mono">{detail.contactId}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Job Assignment Modal */}
      <JobAssignmentModal
        open={jobAssignmentModalOpen}
        onOpenChange={setJobAssignmentModalOpen}
        candidates={pendingNewCandidates}
        onConfirm={handleJobAssignmentConfirm}
        isLoading={createCandidatesMutation.isPending}
      />
    </AppShell>
  );
}

