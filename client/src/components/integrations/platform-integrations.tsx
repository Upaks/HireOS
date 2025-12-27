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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Link2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface PlatformIntegration {
  id: number;
  platformId: string;
  platformName: string;
  platformType: "builtin" | "custom";
  status: "connected" | "disconnected" | "error";
  credentials?: any;
  apiEndpoint?: string;
  apiMethod?: string;
  isEnabled: boolean;
  lastError?: string;
}

const BUILTIN_PLATFORMS = [
  { id: "linkedin", name: "LinkedIn", description: "Post jobs to LinkedIn Jobs" },
  { id: "onlinejobs", name: "onlinejobs.ph", description: "Post jobs to onlinejobs.ph" },
];

export default function PlatformIntegrations() {
  const { toast } = useToast();
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState<string | null>(null);
  const [customPlatformData, setCustomPlatformData] = useState({
    platformName: "",
    apiEndpoint: "",
    apiMethod: "POST",
    apiKey: "",
  });

  // Fetch all platform integrations
  const { data: integrations = [], isLoading } = useQuery<PlatformIntegration[]>({
    queryKey: ['/api/platform-integrations'],
  });

  // Create custom platform mutation
  const createCustomPlatformMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/platform-integrations", {
        platformId: `custom-${Date.now()}`,
        platformName: data.platformName,
        platformType: "custom",
        apiEndpoint: data.apiEndpoint,
        apiMethod: data.apiMethod,
        credentials: { apiKey: data.apiKey },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/platform-integrations'] });
      setShowCustomDialog(false);
      setCustomPlatformData({ platformName: "", apiEndpoint: "", apiMethod: "POST", apiKey: "" });
      toast({
        title: "Custom platform added",
        description: "You can now connect this platform.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add platform",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create platform integration mutation (for first-time connection)
  const createPlatformMutation = useMutation({
    mutationFn: async ({ platformId, platformName, data }: { platformId: string; platformName: string; data: any }) => {
      const res = await apiRequest("POST", "/api/platform-integrations", {
        platformId,
        platformName,
        platformType: "builtin",
        status: "connected",
        credentials: data.credentials,
      });
      const text = await res.text();
      if (!text) {
        throw new Error("Empty response from server");
      }
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/platform-integrations'] });
      setShowConnectDialog(null);
      toast({
        title: "Platform connected",
        description: "Connection settings saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to connect platform",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update platform connection mutation
  const updatePlatformMutation = useMutation({
    mutationFn: async ({ platformId, data }: { platformId: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/platform-integrations/${platformId}`, data);
      const text = await res.text();
      if (!text) {
        throw new Error("Empty response from server");
      }
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/platform-integrations'] });
      setShowConnectDialog(null);
      toast({
        title: "Platform updated",
        description: "Connection settings saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update platform",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete platform mutation
  const deletePlatformMutation = useMutation({
    mutationFn: async (platformId: string) => {
      await apiRequest("DELETE", `/api/platform-integrations/${platformId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/platform-integrations'] });
      toast({
        title: "Platform removed",
        description: "Platform has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove platform",
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

  const handleConnect = (platformId: string) => {
    setShowConnectDialog(platformId);
  };

  const handleDisconnect = (platformId: string) => {
    updatePlatformMutation.mutate({
      platformId,
      data: { status: "disconnected", credentials: null },
    });
  };

  const handleSaveConnection = (platformId: string, apiKey: string) => {
    const integration = getIntegrationForPlatform(platformId);
    const platformName = BUILTIN_PLATFORMS.find(p => p.id === platformId)?.name || integration?.platformName || platformId;

    if (!integration) {
      // Create new integration if it doesn't exist
      createPlatformMutation.mutate({
        platformId,
        platformName,
        data: {
          credentials: { apiKey },
        },
      });
    } else {
      // Update existing integration
      updatePlatformMutation.mutate({
        platformId,
        data: {
          status: "connected",
          credentials: { apiKey },
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Built-in Platforms */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Available Platforms</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {BUILTIN_PLATFORMS.map((platform) => {
            const integration = getIntegrationForPlatform(platform.id);
            const isConnected = integration?.status === "connected";

            return (
              <Card key={platform.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{platform.name}</CardTitle>
                    {integration && getStatusBadge(integration.status)}
                  </div>
                  <CardDescription>{platform.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {!integration ? (
                    <Button
                      onClick={() => handleConnect(platform.id)}
                      className="w-full"
                      variant="outline"
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      Connect
                    </Button>
                  ) : isConnected ? (
                    <Button
                      onClick={() => handleDisconnect(platform.id)}
                      className="w-full"
                      variant="outline"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleConnect(platform.id)}
                      className="w-full"
                      variant="default"
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      Reconnect
                    </Button>
                  )}
                  {integration?.lastError && (
                    <p className="text-xs text-red-600 mt-2">{integration.lastError}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Custom Platforms */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Custom Platforms</h3>
          <Button onClick={() => setShowCustomDialog(true)} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Custom Platform
          </Button>
        </div>
        {integrations.filter((i) => i.platformType === "custom").length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              No custom platforms added yet. Click "Add Custom Platform" to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {integrations
              .filter((i) => i.platformType === "custom")
              .map((integration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{integration.platformName}</CardTitle>
                      {getStatusBadge(integration.status)}
                    </div>
                    <CardDescription>{integration.apiEndpoint}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleConnect(integration.platformId)}
                        className="flex-1"
                        variant={integration.status === "connected" ? "outline" : "default"}
                      >
                        {integration.status === "connected" ? (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Disconnect
                          </>
                        ) : (
                          <>
                            <Link2 className="mr-2 h-4 w-4" />
                            Connect
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => deletePlatformMutation.mutate(integration.platformId)}
                        variant="outline"
                        size="icon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {integration.lastError && (
                      <p className="text-xs text-red-600 mt-2">{integration.lastError}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Connect Dialog */}
      {showConnectDialog && (
        <ConnectPlatformDialog
          platformId={showConnectDialog}
          platformName={
            BUILTIN_PLATFORMS.find((p) => p.id === showConnectDialog)?.name ||
            integrations.find((i) => i.platformId === showConnectDialog)?.platformName ||
            "Platform"
          }
          integration={getIntegrationForPlatform(showConnectDialog)}
          open={!!showConnectDialog}
          onOpenChange={(open) => !open && setShowConnectDialog(null)}
          onSave={(apiKey) => {
            handleSaveConnection(showConnectDialog, apiKey);
          }}
        />
      )}

      {/* Add Custom Platform Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Platform</DialogTitle>
            <DialogDescription>
              Connect your own job posting portal or API endpoint.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="platform-name">Platform Name</Label>
              <Input
                id="platform-name"
                placeholder="e.g., My Job Portal"
                value={customPlatformData.platformName}
                onChange={(e) =>
                  setCustomPlatformData({ ...customPlatformData, platformName: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="api-endpoint">API Endpoint</Label>
              <Input
                id="api-endpoint"
                type="url"
                placeholder="https://api.example.com/jobs"
                value={customPlatformData.apiEndpoint}
                onChange={(e) =>
                  setCustomPlatformData({ ...customPlatformData, apiEndpoint: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="api-method">HTTP Method</Label>
              <select
                id="api-method"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={customPlatformData.apiMethod}
                onChange={(e) =>
                  setCustomPlatformData({ ...customPlatformData, apiMethod: e.target.value })
                }
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div>
              <Label htmlFor="api-key">API Key (optional)</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter API key"
                value={customPlatformData.apiKey}
                onChange={(e) =>
                  setCustomPlatformData({ ...customPlatformData, apiKey: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createCustomPlatformMutation.mutate(customPlatformData)}
              disabled={createCustomPlatformMutation.isPending || !customPlatformData.platformName || !customPlatformData.apiEndpoint}
            >
              {createCustomPlatformMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Platform"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Connect Platform Dialog Component
function ConnectPlatformDialog({
  platformId,
  platformName,
  integration,
  open,
  onOpenChange,
  onSave,
}: {
  platformId: string;
  platformName: string;
  integration?: PlatformIntegration;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (apiKey: string) => void;
}) {
  const [apiKey, setApiKey] = useState(integration?.credentials?.apiKey || "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {platformName}</DialogTitle>
          <DialogDescription>
            Enter your API credentials to connect this platform.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              Your API key will be stored securely.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave(apiKey)} disabled={!apiKey}>
            Save Connection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

