import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2, Link2, XCircle, Settings, CheckCircle, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AirtableFieldMapping from "./airtable-field-mapping";
import GoogleSheetsFieldMapping from "./google-sheets-field-mapping";

interface CRMIntegration {
  id: number;
  platformId: string;
  platformName: string;
  status: "connected" | "disconnected" | "error";
  credentials?: any;
  syncDirection: "one-way" | "two-way";
  isEnabled: boolean;
  lastError?: string;
}

const AVAILABLE_CRMS = [
  { id: "ghl", name: "GoHighLevel", description: "Sync candidates with GoHighLevel CRM" },
  { id: "airtable", name: "Airtable", description: "Sync candidates with Airtable (Free tier available)" },
  { id: "google-sheets", name: "Google Sheets", description: "Sync candidates with Google Sheets (Free, widely used)" },
  // Future: Add more CRMs here
  // { id: "hubspot", name: "HubSpot", description: "Sync candidates with HubSpot CRM" },
  // { id: "pipedrive", name: "Pipedrive", description: "Sync candidates with Pipedrive CRM" },
];

export default function CRMIntegrations({ singlePlatform }: { singlePlatform?: string }) {
  const { toast } = useToast();
  const [showConnectDialog, setShowConnectDialog] = useState<string | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState<string | null>(null);

  // Fetch all CRM integrations for current user
  const { data: integrations = [], isLoading } = useQuery<CRMIntegration[]>({
    queryKey: ['/api/crm-integrations'],
  });

  // Update integration mutation
  const updateIntegrationMutation = useMutation({
    mutationFn: async ({ platformId, data }: { platformId: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/crm-integrations/${platformId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm-integrations'] });
      setShowSettingsDialog(null);
      toast({
        title: "Settings updated",
        description: "CRM integration settings have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete integration mutation
  const deleteIntegrationMutation = useMutation({
    mutationFn: async (platformId: string) => {
      await apiRequest("DELETE", `/api/crm-integrations/${platformId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm-integrations'] });
      toast({
        title: "Integration removed",
        description: "CRM integration has been disconnected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove integration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getIntegrationForPlatform = (platformId: string) => {
    return integrations.find((i) => i.platformId === platformId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800">Not Connected</Badge>;
    }
  };

  const handleDisconnect = (platformId: string) => {
    deleteIntegrationMutation.mutate(platformId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // Filter to show only the requested platform if singlePlatform is provided
  const platformsToShow = singlePlatform 
    ? AVAILABLE_CRMS.filter(crm => crm.id === singlePlatform)
    : AVAILABLE_CRMS;

  return (
    <div className="space-y-6">
      {!singlePlatform && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">CRM & ATS Integrations</h3>
          <p className="text-sm text-slate-500 mb-4">
            Connect your CRM or ATS to automatically sync candidate data. Each user can connect their own accounts.
          </p>
        </div>
      )}

      <div className={singlePlatform ? "grid gap-4 grid-cols-1" : "grid gap-4 md:grid-cols-2"}>
        {platformsToShow.map((crm) => {
          const integration = getIntegrationForPlatform(crm.id);
          const isConnected = integration?.status === "connected";

          return (
            <Card key={crm.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{crm.name}</CardTitle>
                  {integration && getStatusBadge(integration.status)}
                </div>
                <CardDescription>{crm.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!integration ? (
                  <Button
                    onClick={() => setShowConnectDialog(crm.id)}
                    className="w-full"
                    variant="outline"
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Connect
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowSettingsDialog(crm.id)}
                        className="flex-1"
                        variant="outline"
                        size="sm"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                      {crm.id === "google-sheets" && !integration.credentials?.spreadsheetId && (
                        <Button
                          onClick={() => setShowConnectDialog(crm.id)}
                          className="flex-1"
                          variant="outline"
                          size="sm"
                        >
                          <Link2 className="mr-2 h-4 w-4" />
                          Configure
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDisconnect(crm.id)}
                        variant="outline"
                        size="sm"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    {integration.lastError && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {integration.lastError}
                      </p>
                    )}
                    {isConnected && (
                      <div className="text-xs text-slate-500">
                        Sync: <span className="font-medium">{integration.syncDirection === "one-way" ? "One-way (HireOS → CRM)" : "Two-way (Bidirectional)"}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connect Dialog */}
      {showConnectDialog && (
        <ConnectCRMDialog
          platformId={showConnectDialog}
          platformName={AVAILABLE_CRMS.find((p) => p.id === showConnectDialog)?.name || "CRM"}
          integration={getIntegrationForPlatform(showConnectDialog)}
          open={!!showConnectDialog}
          onOpenChange={(open) => !open && setShowConnectDialog(null)}
        />
      )}

      {/* Settings Dialog */}
      {showSettingsDialog && (
        <CRMSettingsDialog
          platformId={showSettingsDialog}
          platformName={AVAILABLE_CRMS.find((p) => p.id === showSettingsDialog)?.name || "CRM"}
          integration={getIntegrationForPlatform(showSettingsDialog)}
          open={!!showSettingsDialog}
          onOpenChange={(open) => !open && setShowSettingsDialog(null)}
          onUpdate={(data) => {
            updateIntegrationMutation.mutate({ platformId: showSettingsDialog, data });
          }}
        />
      )}
    </div>
  );
}

// Connect CRM Dialog Component
export function ConnectCRMDialog({
  platformId,
  platformName,
  integration,
  open,
  onOpenChange,
}: {
  platformId: string;
  platformName: string;
  integration?: CRMIntegration;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState(integration?.credentials?.apiKey || "");
  const [locationId, setLocationId] = useState(integration?.credentials?.locationId || "");
  const [spreadsheetId, setSpreadsheetId] = useState(integration?.credentials?.spreadsheetId || "");
  const [sheetName, setSheetName] = useState(integration?.credentials?.sheetName || "Sheet1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Handle Google Sheets OAuth flow
  const handleGoogleSheetsConnect = async () => {
    try {
      setIsLoadingAuth(true);
      const response = await fetch('/api/crm-integrations/google-sheets/auth', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.authUrl) {
        // Redirect to Google OAuth page
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error: any) {
      toast({
        title: "Failed to connect",
        description: error.message || "Failed to initiate Google OAuth",
        variant: "destructive",
      });
      setIsLoadingAuth(false);
    }
  };

  const connectMutation = useMutation({
    mutationFn: async (data: any) => {
      const credentials: any = {
        apiKey: data.apiKey,
      };
      if (platformId === "ghl" && data.locationId) {
        credentials.locationId = data.locationId;
      }
      if (platformId === "airtable" && data.baseId) {
        credentials.baseId = data.baseId;
      }
      if (platformId === "google-sheets") {
        // For Google Sheets, preserve OAuth tokens and add spreadsheet config
        credentials.spreadsheetId = data.spreadsheetId;
        credentials.sheetName = data.sheetName || "Sheet1";
        // Preserve OAuth tokens if they exist
        if (integration?.credentials?.accessToken) {
          credentials.accessToken = integration.credentials.accessToken;
          credentials.refreshToken = integration.credentials.refreshToken;
        }
      }
      
      const res = await apiRequest("POST", "/api/crm-integrations", {
        platformId,
        platformName,
        credentials,
        syncDirection: "one-way", // Default to one-way
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm-integrations'] });
      onOpenChange(false);
      toast({
        title: "CRM connected",
        description: `${platformName} has been connected successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to connect",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = () => {
    if (platformId === "google-sheets") {
      // For Google Sheets, if not connected via OAuth, show error
      if (!integration?.credentials?.accessToken) {
        toast({
          title: "Not connected",
          description: "Please connect via Google OAuth first",
          variant: "destructive",
        });
        return;
      }
      if (!spreadsheetId) {
        toast({
          title: "Validation error",
          description: "Spreadsheet ID is required",
          variant: "destructive",
        });
        return;
      }
      setIsSubmitting(true);
      connectMutation.mutate({ 
        spreadsheetId,
        sheetName,
      });
      return;
    }

    if (!apiKey) {
      toast({
        title: "Validation error",
        description: "API Key is required",
        variant: "destructive",
      });
      return;
    }
    if (platformId === "airtable" && !locationId) {
      toast({
        title: "Validation error",
        description: "Base ID is required for Airtable",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    connectMutation.mutate({ 
      apiKey, 
      locationId: platformId === "airtable" ? locationId : (locationId || undefined),
      baseId: platformId === "airtable" ? locationId : undefined,
    });
  };

  // Google Sheets OAuth flow
  if (platformId === "google-sheets") {
    const isConnected = integration?.credentials?.accessToken;
    
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Google Sheets</DialogTitle>
            <DialogDescription>
              {isConnected 
                ? "Configure your Google Sheets spreadsheet. You're already connected via Google OAuth."
                : "Click the button below to connect your Google account. You'll be asked to grant permissions."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!isConnected ? (
              <div className="text-center py-4">
                <p className="text-sm text-slate-600 mb-4">
                  Click the button below to sign in with Google and grant access to your spreadsheets.
                </p>
                <Button 
                  onClick={handleGoogleSheetsConnect} 
                  disabled={isLoadingAuth}
                  className="w-full"
                >
                  {isLoadingAuth ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Sign in with Google
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="spreadsheet-id">Spreadsheet ID *</Label>
                  <Input
                    id="spreadsheet-id"
                    placeholder="Enter Google Sheets Spreadsheet ID"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Find this in your Google Sheets URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
                  </p>
                </div>
                <div>
                  <Label htmlFor="sheet-name">Sheet Name (Optional)</Label>
                  <Input
                    id="sheet-name"
                    placeholder="Sheet1"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    The name of the sheet/tab to sync. Defaults to "Sheet1" if not specified.
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {isConnected && (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Configuration"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {platformName}</DialogTitle>
          <DialogDescription>
            Enter your {platformName} API credentials. These will be stored securely and only used for your account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="api-key">API Key *</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              {platformId === "airtable" 
                ? "Find this in your Airtable Account → Developer Hub → Personal access tokens"
                : `Find this in your ${platformName} Settings → API Keys`}
            </p>
          </div>
          {platformId === "ghl" && (
            <div>
              <Label htmlFor="location-id">Location ID (Optional)</Label>
              <Input
                id="location-id"
                placeholder="Enter location ID"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Required only if you have multiple locations
              </p>
            </div>
          )}
          {platformId === "airtable" && (
            <div>
              <Label htmlFor="base-id">Base ID *</Label>
              <Input
                id="base-id"
                placeholder="Enter your Airtable Base ID"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Find this in your Airtable base URL: https://airtable.com/{'{baseId}'}/...
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!apiKey || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// CRM Settings Dialog Component
export function CRMSettingsDialog({
  platformId,
  platformName,
  integration,
  open,
  onOpenChange,
  onUpdate,
  onDisconnect,
}: {
  platformId: string;
  platformName: string;
  integration?: CRMIntegration;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (data: any) => void;
  onDisconnect?: () => void;
}) {
  const [syncDirection, setSyncDirection] = useState<"one-way" | "two-way">(
    integration?.syncDirection || "one-way"
  );
  const [isEnabled, setIsEnabled] = useState(integration?.isEnabled ?? true);
  const [spreadsheetId, setSpreadsheetId] = useState(integration?.credentials?.spreadsheetId || "");
  const [sheetName, setSheetName] = useState(integration?.credentials?.sheetName || "Sheet1");

  const handleSave = () => {
    const updateData: any = {
      syncDirection,
      isEnabled,
    };
    
    // For Google Sheets, include spreadsheet configuration
    if (platformId === "google-sheets") {
      updateData.credentials = {
        ...integration?.credentials,
        spreadsheetId,
        sheetName,
      };
    }
    
    onUpdate(updateData);
  };

  const handleFieldMappingSave = (mappingData: { tableName?: string; fieldMappings?: any }) => {
    onUpdate({
      credentials: {
        ...integration?.credentials,
        ...mappingData,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{platformName} Settings</DialogTitle>
          <DialogDescription>
            Configure sync direction, field mappings, and enable/disable the integration.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            {(platformId === "airtable" || platformId === "google-sheets") && (
              <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="general" className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
              <div className="flex-1">
                <Label className="text-base font-medium">Enable Integration</Label>
                <p className="text-xs text-slate-500 mt-1">
                  When <strong>enabled</strong>: Candidate data will sync automatically between HireOS and {platformName}.<br/>
                  When <strong>disabled</strong>: The connection stays active but syncing is paused. You can re-enable it anytime.
                </p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} className="ml-4" />
            </div>
            <div>
              <Label>Sync Direction</Label>
              <Select value={syncDirection} onValueChange={(value: "one-way" | "two-way") => setSyncDirection(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-way">One-way (HireOS → CRM)</SelectItem>
                  <SelectItem value="two-way">Two-way (Bidirectional)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {syncDirection === "one-way"
                  ? "Candidates will sync from HireOS to your CRM only."
                  : "Candidates will sync bidirectionally between HireOS and your CRM."}
              </p>
            </div>
            
            {/* Google Sheets specific configuration */}
            {platformId === "google-sheets" && (
              <>
                <div>
                  <Label htmlFor="settings-spreadsheet-id">Spreadsheet ID *</Label>
                  <Input
                    id="settings-spreadsheet-id"
                    placeholder="Enter Google Sheets Spreadsheet ID"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Find this in your Google Sheets URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
                  </p>
                </div>
                <div>
                  <Label htmlFor="settings-sheet-name">Sheet Name (Optional)</Label>
                  <Input
                    id="settings-sheet-name"
                    placeholder="Sheet1"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    The name of the sheet/tab to sync. Defaults to "Sheet1" if not specified.
                  </p>
                </div>
              </>
            )}
            
            <DialogFooter className="mt-4 flex justify-between items-center">
              {onDisconnect && integration && (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    if (confirm(`Are you sure you want to disconnect ${platformName}? This will stop all syncing and remove the connection.`)) {
                      onDisconnect();
                    }
                  }}
                >
                  Disconnect
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save Settings
                </Button>
              </div>
            </DialogFooter>
          </TabsContent>
          {platformId === "airtable" && (
            <TabsContent value="mapping" className="py-4">
              <AirtableFieldMapping
                integration={integration}
                onSave={handleFieldMappingSave}
              />
            </TabsContent>
          )}
          {platformId === "google-sheets" && (
            <TabsContent value="mapping" className="py-4">
              <GoogleSheetsFieldMapping
                integration={integration}
                onSave={handleFieldMappingSave}
              />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

