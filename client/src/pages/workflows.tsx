import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import AppShell from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Settings,
  History,
} from "lucide-react";

interface Workflow {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: string;
  triggerConfig?: any;
  steps: any[];
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: any;
  steps: any[];
}

export default function Workflows() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<"workflows" | "templates">("workflows");

  // Fetch workflows
  const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ["/api/workflows"],
    enabled: !!user,
  });

  // Fetch templates
  const { data: templates = [] } = useQuery<WorkflowTemplate[]>({
    queryKey: ["/api/workflows/templates"],
    enabled: !!user,
  });

  // Fetch available actions
  const { data: availableActions = [] } = useQuery({
    queryKey: ["/api/workflows/actions"],
    enabled: !!user,
  });

  // Create workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async (workflow: any) => {
      const res = await apiRequest("POST", "/api/workflows", workflow);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      toast({
        title: "Workflow created",
        description: "Your workflow has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update workflow mutation
  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/workflows/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      toast({
        title: "Workflow updated",
        description: "Your workflow has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete workflow mutation
  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/workflows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      toast({
        title: "Workflow deleted",
        description: "The workflow has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle workflow active status
  const toggleWorkflowMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/workflows/${id}`, { isActive });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Trigger workflow manually
  const triggerWorkflowMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/workflows/${id}/trigger`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      toast({
        title: "Workflow triggered",
        description: "The workflow has been triggered successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to trigger workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateNew = () => {
    setLocation("/workflows/new");
  };

  const handleEdit = (workflow: Workflow) => {
    setLocation(`/workflows/${workflow.id}/edit`);
  };

  const handleDelete = (workflow: Workflow) => {
    if (confirm(`Are you sure you want to delete "${workflow.name}"?`)) {
      deleteWorkflowMutation.mutate(workflow.id);
    }
  };

  const handleUseTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateDialog(true);
  };

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate) return;
    setShowTemplateDialog(false);
    // Navigate to builder with template data
    const templateData = encodeURIComponent(JSON.stringify(selectedTemplate));
    setLocation(`/workflows/new?template=${templateData}`);
    setSelectedTemplate(null);
  };

  const getTriggerLabel = (triggerType: string) => {
    const labels: Record<string, string> = {
      candidate_status_change: "Candidate Status Change",
      interview_scheduled: "Interview Scheduled",
      interview_completed: "Interview Completed",
      manual: "Manual Trigger",
      scheduled: "Scheduled",
    };
    return labels[triggerType] || triggerType;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  return (
    <AppShell>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
            <p className="mt-1 text-sm text-gray-500">
              Automate your hiring process with powerful workflow automation
            </p>
          </div>
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Workflow
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="workflows">My Workflows ({workflows.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : workflows.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No workflows yet</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Create your first workflow to automate your hiring process
                  </p>
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Workflow
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflows.map((workflow) => (
                  <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{workflow.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {workflow.description || "No description"}
                          </CardDescription>
                        </div>
                        <Badge variant={workflow.isActive ? "default" : "secondary"}>
                          {workflow.isActive ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Zap className="h-4 w-4 mr-2" />
                          <span className="font-medium">Trigger:</span>
                          <span className="ml-2">{getTriggerLabel(workflow.triggerType)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Settings className="h-4 w-4 mr-2" />
                          <span className="font-medium">Steps:</span>
                          <span className="ml-2">{workflow.steps?.length || 0}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <History className="h-4 w-4 mr-2" />
                          <span className="font-medium">Executions:</span>
                          <span className="ml-2">{workflow.executionCount}</span>
                        </div>
                        {workflow.lastExecutedAt && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="h-4 w-4 mr-2" />
                            <span className="font-medium">Last run:</span>
                            <span className="ml-2">{formatDate(workflow.lastExecutedAt)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(workflow)}
                          className="flex-1"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleWorkflowMutation.mutate({
                              id: workflow.id,
                              isActive: !workflow.isActive,
                            })
                          }
                          disabled={toggleWorkflowMutation.isPending}
                        >
                          {workflow.isActive ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerWorkflowMutation.mutate(workflow.id)}
                          disabled={triggerWorkflowMutation.isPending}
                          title="Run workflow manually"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(workflow)}
                          disabled={deleteWorkflowMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Trigger:</span>{" "}
                        {getTriggerLabel(template.triggerType)}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Steps:</span> {template.steps.length}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleUseTemplate(template)}
                      className="w-full"
                      variant="outline"
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Template Confirmation Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Use Template</DialogTitle>
              <DialogDescription>
                Create a new workflow from the "{selectedTemplate?.name}" template. You can customize it after creation.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFromTemplate}>Create Workflow</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
