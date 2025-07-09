import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { AlertCircle, CheckCircle, RefreshCw, Eye, Play } from 'lucide-react';

interface SyncResult {
  success: boolean;
  totalGHLContacts: number;
  totalCandidates: number;
  matched: number;
  updated: number;
  skipped: number;
  errors: string[];
  details: {
    contactId: string;
    ghlName: string;
    candidateName: string;
    action: 'updated' | 'skipped' | 'error';
    reason?: string;
  }[];
}

export default function GHLSyncPage() {
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const queryClient = useQueryClient();

  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/ghl-sync/preview', { method: 'GET' });
      return response;
    },
    onSuccess: (data) => {
      setLastSyncResult(data);
    },
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/ghl-sync/execute', { method: 'POST' });
      return response;
    },
    onSuccess: (data) => {
      setLastSyncResult(data);
      // Refresh candidates data
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
    },
  });

  const handlePreview = () => {
    previewMutation.mutate();
  };

  const handleExecute = () => {
    executeMutation.mutate();
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'updated':
        return <Badge variant="default" className="bg-green-100 text-green-800">Updated</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">GHL Contact Sync</h1>
        <p className="text-gray-600">
          Sync contacts from GoHighLevel (GHL) with candidates in HireOS by matching names
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sync Controls
            </CardTitle>
            <CardDescription>
              Preview or execute GHL contact synchronization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handlePreview}
              disabled={previewMutation.isPending}
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
              disabled={executeMutation.isPending || !lastSyncResult}
              className="w-full"
            >
              {executeMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Execute Sync
            </Button>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Always preview changes before executing. The sync will update candidate records with GHL contact IDs.
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
                    <div className="text-2xl font-bold text-blue-600">{lastSyncResult.totalGHLContacts}</div>
                    <div className="text-sm text-gray-600">GHL Contacts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{lastSyncResult.totalCandidates}</div>
                    <div className="text-sm text-gray-600">Candidates</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{lastSyncResult.matched}</div>
                    <div className="text-sm text-gray-600">Matched</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{lastSyncResult.updated}</div>
                    <div className="text-sm text-gray-600">Updated</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-600">{lastSyncResult.skipped}</div>
                    <div className="text-sm text-gray-600">Skipped</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-600">{lastSyncResult.errors.length}</div>
                    <div className="text-sm text-gray-600">Errors</div>
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
                      Sync completed successfully. {lastSyncResult.updated} candidates were updated with GHL contact IDs.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No sync results yet. Click "Preview Changes" to start.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results */}
      {lastSyncResult && lastSyncResult.details.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Detailed Results</CardTitle>
            <CardDescription>
              Individual contact processing details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {lastSyncResult.details.map((detail, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{detail.ghlName}</div>
                      <div className="text-sm text-gray-600">
                        {detail.candidateName !== 'N/A' ? `→ ${detail.candidateName}` : 'No candidate match'}
                      </div>
                      {detail.reason && (
                        <div className="text-xs text-gray-500 mt-1">{detail.reason}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getActionBadge(detail.action)}
                      <div className="text-xs text-gray-500 font-mono">{detail.contactId}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}