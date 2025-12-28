import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle, ExternalLink, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CRMIntegrations, { CRMSettingsDialog, ConnectCRMDialog } from "@/components/integrations/crm-integrations";
import SlackConfigForm from "@/components/integrations/slack-config";

interface Integration {
  id: string;
  name: string;
  description: string;
  logo?: string;
  category: "calendar" | "ai" | "crm" | "notification";
  requiresAdmin?: boolean;
  connected: boolean;
  configComponent?: React.ReactNode;
}

export default function Integrations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"discover" | "manage">("discover");
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [showCRMConnectDialog, setShowCRMConnectDialog] = useState<string | null>(null);
  const [showSlackDialog, setShowSlackDialog] = useState(false);

  // Fetch Calendly connection status
  const { data: calendlyStatus, refetch: refetchCalendlyStatus } = useQuery<{ connected: boolean; webhookUrl: string | null }>({
    queryKey: ['/api/calendly/status'],
    enabled: !!user,
  });

  // Fetch CRM integrations to check connection status
  const { data: crmIntegrations = [] } = useQuery<Array<{ platformId: string; status: string; id?: number; credentials?: any; syncDirection?: string }>>({
    queryKey: ['/api/crm-integrations'],
    enabled: !!user,
  });

  // Get full integration details for settings dialog
  const getIntegrationForPlatform = (platformId: string) => {
    return (crmIntegrations as any[]).find((i) => i.platformId === platformId);
  };

  // Delete integration mutation for disconnect
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
      setSelectedIntegration(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove integration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check which CRM integrations are connected
  const isGoogleSheetsConnected = (crmIntegrations as Array<{ platformId: string; status: string }>).some((crm) => crm.platformId === "google-sheets" && crm.status === "connected");
  const isAirtableConnected = (crmIntegrations as Array<{ platformId: string; status: string }>).some((crm) => crm.platformId === "airtable" && crm.status === "connected");
  const isGHLConnected = (crmIntegrations as Array<{ platformId: string; status: string }>).some((crm) => crm.platformId === "ghl" && crm.status === "connected");

  // Connect Calendly mutation
  const connectCalendlyMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", "/api/calendly/connect", { token });
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/calendly/status'] });
      await refetchCalendlyStatus();
      toast({
        title: "Calendly connected!",
        description: "Your Calendly calendar is now connected. Interview dates will update automatically.",
      });
      setSelectedIntegration(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to connect Calendly",
        description: error.message || "Unknown error occurred. Please check the server logs for details.",
        variant: "destructive",
      });
    },
  });

  // Disconnect Calendly mutation
  const disconnectCalendlyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calendly/disconnect", {});
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/calendly/status'] });
      await refetchCalendlyStatus();
      toast({
        title: "Calendly disconnected",
        description: "Your Calendly calendar has been disconnected.",
      });
    },
  });

  // Update OpenRouter API key mutation
  const updateOpenRouterMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}`, {
        openRouterApiKey: apiKey,
      });
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "OpenRouter API key saved",
        description: "AI features are now enabled.",
      });
      setSelectedIntegration(null);
      // Refresh page to get updated user data
      setTimeout(() => window.location.reload(), 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save API key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Define all integrations - each as a separate card
  const allIntegrations: Integration[] = [
    {
      id: "calendly",
      name: "Calendly",
      description: "Automatically sync interview dates when candidates book through your Calendly calendar.",
      category: "calendar",
      connected: calendlyStatus?.connected || false,
    },
    {
      id: "openrouter",
      name: "OpenRouter AI",
      description: "Enable AI-powered resume parsing and candidate matching. Uses Google Gemini for intelligent candidate analysis.",
      category: "ai",
      connected: !!user?.openRouterApiKey,
    },
    {
      id: "google-sheets",
      name: "Google Sheets",
      description: "Sync candidates with Google Sheets. Free and widely used for candidate tracking.",
      category: "crm",
      connected: isGoogleSheetsConnected,
    },
    {
      id: "airtable",
      name: "Airtable",
      description: "Sync candidates with Airtable. Free tier available for candidate management.",
      category: "crm",
      connected: isAirtableConnected,
    },
    {
      id: "ghl",
      name: "GoHighLevel",
      description: "Sync candidates with GoHighLevel CRM for comprehensive candidate management.",
      category: "crm",
      connected: isGHLConnected,
    },
    {
      id: "slack",
      name: "Slack",
      description: "Get real-time notifications in Slack for interviews, offers, job postings, and new applications.",
      category: "notification",
      connected: !!user?.slackWebhookUrl,
    },
  ];

  // Filter integrations based on tab
  const discoveredIntegrations = allIntegrations;
  const managedIntegrations = allIntegrations.filter(i => i.connected);

  // Check if user can access admin-only integrations
  const isAdmin = user?.role === 'admin' || user?.role === 'ceo' || user?.role === 'coo';

  const renderIntegrationCard = (integration: Integration) => {
    const LogoComponent = getIntegrationLogo(integration.id);
    
    return (
      <Card key={integration.id} className="relative">
        {integration.requiresAdmin && !isAdmin && (
          <Badge variant="secondary" className="absolute top-3 right-3">Admin</Badge>
        )}
        {integration.connected && (
          <Badge variant="default" className="absolute top-3 right-3 bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )}
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
              {LogoComponent}
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{integration.name}</CardTitle>
              <CardDescription className="mt-1">{integration.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant={integration.connected ? "outline" : "default"}
            className="w-full"
            onClick={() => {
              // If connected, open settings. If not connected, open connect dialog
              if (integration.connected) {
                setSelectedIntegration(integration.id);
              } else {
                // For CRM integrations, open connect dialog
                if (integration.category === "crm") {
                  setShowCRMConnectDialog(integration.id);
                } else if (integration.id === "slack") {
                  setShowSlackDialog(true);
                } else {
                  setSelectedIntegration(integration.id);
                }
              }
            }}
          >
            {integration.connected ? (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </>
            ) : (
              "Connect"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppShell>
      <TopBar title="Integrations & Apps" />
      <div className="bg-white p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Integrations & Apps</h1>
          <p className="text-sm text-slate-500 mt-1">
            Connect your favorite tools to streamline your hiring process
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "discover" | "manage")}>
          <TabsList>
            <TabsTrigger value="discover">
              Discover ({discoveredIntegrations.length})
            </TabsTrigger>
            <TabsTrigger value="manage">
              Manage ({managedIntegrations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discoveredIntegrations.map(renderIntegrationCard)}
            </div>
          </TabsContent>

          <TabsContent value="manage" className="mt-6">
            {managedIntegrations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No active integrations. Connect an integration to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {managedIntegrations.map(renderIntegrationCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Calendly Connection Dialog */}
        <Dialog open={selectedIntegration === "calendly"} onOpenChange={(open) => !open && setSelectedIntegration(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Calendly</DialogTitle>
              <DialogDescription>
                {calendlyStatus?.connected
                  ? "Manage your Calendly connection or disconnect it."
                  : "Enter your Calendly Personal Access Token to automatically set up calendar sync."}
              </DialogDescription>
            </DialogHeader>
            {calendlyStatus?.connected ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-900">Calendly is connected</span>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => disconnectCalendlyMutation.mutate()}
                  disabled={disconnectCalendlyMutation.isPending}
                  className="w-full"
                >
                  {disconnectCalendlyMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    "Disconnect Calendly"
                  )}
                </Button>
              </div>
            ) : (
              <CalendlyConnectForm
                onConnect={(token) => connectCalendlyMutation.mutate(token)}
                isLoading={connectCalendlyMutation.isPending}
                onCancel={() => setSelectedIntegration(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* OpenRouter Connection Dialog */}
        <Dialog open={selectedIntegration === "openrouter"} onOpenChange={(open) => !open && setSelectedIntegration(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure OpenRouter AI</DialogTitle>
              <DialogDescription>
                Add your OpenRouter API key to enable AI-powered resume parsing and candidate matching.
              </DialogDescription>
            </DialogHeader>
            <OpenRouterConfigForm
              currentApiKey={user?.openRouterApiKey || undefined}
              onSave={(apiKey) => updateOpenRouterMutation.mutate(apiKey)}
              onRemove={() => updateOpenRouterMutation.mutate("")}
              isLoading={updateOpenRouterMutation.isPending}
              onCancel={() => setSelectedIntegration(null)}
            />
          </DialogContent>
        </Dialog>

        {/* Slack Integration Dialog */}
        <Dialog open={showSlackDialog || selectedIntegration === "slack"} onOpenChange={(open) => {
          if (!open) {
            setShowSlackDialog(false);
            setSelectedIntegration(null);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Slack Integration</DialogTitle>
              <DialogDescription>
                Connect your Slack workspace to receive real-time notifications for interviews, offers, job postings, and new applications.
              </DialogDescription>
            </DialogHeader>
            <SlackConfigForm
              user={user}
              onSave={async (data) => {
                const res = await apiRequest("PATCH", `/api/users/${user?.id}`, data);
                await res.json();
                queryClient.invalidateQueries({ queryKey: ['/api/users'] });
                toast({
                  title: "Slack settings saved",
                  description: "Your Slack integration has been configured.",
                });
                setShowSlackDialog(false);
                setSelectedIntegration(null);
                setTimeout(() => window.location.reload(), 500);
              }}
              onRemove={async () => {
                const res = await apiRequest("PATCH", `/api/users/${user?.id}`, {
                  slackWebhookUrl: null,
                  slackNotificationScope: null,
                  slackNotificationRoles: null,
                  slackNotificationEvents: null,
                });
                await res.json();
                queryClient.invalidateQueries({ queryKey: ['/api/users'] });
                toast({
                  title: "Slack disconnected",
                  description: "Your Slack integration has been removed.",
                });
                setShowSlackDialog(false);
                setSelectedIntegration(null);
                setTimeout(() => window.location.reload(), 500);
              }}
              onCancel={() => {
                setShowSlackDialog(false);
                setSelectedIntegration(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* CRM Connect Dialogs - Open when Connect is clicked on unconnected CRM */}
        {showCRMConnectDialog && (
          <ConnectCRMDialog
            platformId={showCRMConnectDialog}
            platformName={
              showCRMConnectDialog === "google-sheets" ? "Google Sheets" :
              showCRMConnectDialog === "airtable" ? "Airtable" :
              "GoHighLevel"
            }
            integration={getIntegrationForPlatform(showCRMConnectDialog)}
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                setShowCRMConnectDialog(null);
                // Refresh integrations after connection
                queryClient.invalidateQueries({ queryKey: ['/api/crm-integrations'] });
              }
            }}
          />
        )}

        {/* CRM Settings Dialogs - Directly open settings when Manage is clicked on connected CRM */}
        {(selectedIntegration === "google-sheets" || selectedIntegration === "airtable" || selectedIntegration === "ghl") && (
          <CRMSettingsDialog
            platformId={selectedIntegration}
            platformName={
              selectedIntegration === "google-sheets" ? "Google Sheets" :
              selectedIntegration === "airtable" ? "Airtable" :
              "GoHighLevel"
            }
            integration={getIntegrationForPlatform(selectedIntegration)}
            open={true}
            onOpenChange={(open) => !open && setSelectedIntegration(null)}
            onUpdate={async (data) => {
              const res = await apiRequest("PATCH", `/api/crm-integrations/${selectedIntegration}`, data);
              await res.json();
              queryClient.invalidateQueries({ queryKey: ['/api/crm-integrations'] });
              toast({
                title: "Settings updated",
                description: "CRM integration settings have been saved.",
              });
            }}
            onDisconnect={() => deleteIntegrationMutation.mutate(selectedIntegration)}
          />
        )}
      </div>
    </AppShell>
  );
}

// Calendly Connect Form Component
function CalendlyConnectForm({ onConnect, isLoading, onCancel }: { onConnect: (token: string) => void; isLoading: boolean; onCancel: () => void }) {
  const [token, setToken] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="calendly-token">Calendly Personal Access Token</Label>
        <Input
          id="calendly-token"
          type="text"
          placeholder="Enter your Calendly token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Get your token from{" "}
          <a
            href="https://calendly.com/integrations/api_webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center"
          >
            Calendly Integrations
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onConnect(token)} disabled={!token || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect"
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// OpenRouter Config Form Component
function OpenRouterConfigForm({
  currentApiKey,
  onSave,
  onRemove,
  isLoading,
  onCancel,
}: {
  currentApiKey?: string;
  onSave: (apiKey: string) => void;
  onRemove: () => void;
  isLoading: boolean;
  onCancel: () => void;
}) {
  const [apiKey, setApiKey] = useState("");

  return (
    <div className="space-y-4">
      {currentApiKey ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-900">API key is configured</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRemove}
              disabled={isLoading}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Label htmlFor="openrouter-key">OpenRouter API Key</Label>
          <Input
            id="openrouter-key"
            type="password"
            placeholder="Enter your OpenRouter API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Get your API key from{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center"
            >
              openrouter.ai/keys
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </p>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {!currentApiKey && (
          <Button onClick={() => onSave(apiKey)} disabled={!apiKey || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

// Integration Logo Components
function getIntegrationLogo(integrationId: string) {
  switch (integrationId) {
    case "calendly":
      return (
        <div className="h-8 w-8 bg-[#0069FF] rounded flex items-center justify-center">
          <span className="text-white font-bold text-xs">C</span>
        </div>
      );
    case "openrouter":
      return (
        <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center">
          <span className="text-white font-bold text-xs">AI</span>
        </div>
      );
    case "google-sheets":
      return (
        <div className="h-8 w-8 bg-green-500 rounded flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </div>
      );
    case "airtable":
      return (
        <div className="h-8 w-8 bg-orange-500 rounded flex items-center justify-center">
          <span className="text-white font-bold text-xs">A</span>
        </div>
      );
    case "ghl":
      return (
        <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center">
          <span className="text-white font-bold text-xs">GHL</span>
        </div>
      );
    case "slack":
      return (
        <div className="h-8 w-8 bg-[#4A154B] rounded flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 5.042a2.528 2.528 0 0 1-2.52-2.52A2.528 2.528 0 0 1 18.956 0a2.528 2.528 0 0 1 2.523 2.522v2.52h-2.523zM18.956 6.313a2.528 2.528 0 0 1 2.523 2.521 2.528 2.528 0 0 1-2.523 2.521h-6.313A2.528 2.528 0 0 1 10.121 8.834a2.528 2.528 0 0 1 2.522-2.521h6.313zM13.478 18.956a2.528 2.528 0 0 1 2.522 2.523A2.528 2.528 0 0 1 13.478 24a2.528 2.528 0 0 1-2.521-2.522v-2.523h2.521zM12.207 18.956a2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h6.313A2.528 2.528 0 0 1 21.042 16.433a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
        </div>
      );
    default:
      return <div className="h-8 w-8 bg-slate-300 rounded" />;
  }
}

