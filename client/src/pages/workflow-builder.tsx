import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  Play,
  Zap,
  Mail,
  RefreshCw,
  Calendar,
  MessageSquare,
  Database,
  Clock,
  GitBranch,
  Plus,
  Trash2,
  Settings,
  X,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Radio,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WorkflowStep {
  id: string;
  type: string;
  config: any;
  thenSteps?: WorkflowStep[];
  elseSteps?: WorkflowStep[];
}

const ACTION_ICONS: Record<string, any> = {
  send_email: Mail,
  update_status: RefreshCw,
  create_interview: Calendar,
  notify_slack: MessageSquare,
  update_crm: Database,
  wait: Clock,
  condition: GitBranch,
};

const ACTION_COLORS: Record<string, { bg: string; border: string; text: string; icon: string; gradient: string }> = {
  send_email: { bg: "bg-blue-50", border: "border-blue-400", text: "text-blue-700", icon: "text-blue-600", gradient: "from-blue-500 to-blue-600" },
  update_status: { bg: "bg-emerald-50", border: "border-emerald-400", text: "text-emerald-700", icon: "text-emerald-600", gradient: "from-emerald-500 to-emerald-600" },
  create_interview: { bg: "bg-purple-50", border: "border-purple-400", text: "text-purple-700", icon: "text-purple-600", gradient: "from-purple-500 to-purple-600" },
  notify_slack: { bg: "bg-pink-50", border: "border-pink-400", text: "text-pink-700", icon: "text-pink-600", gradient: "from-pink-500 to-pink-600" },
  update_crm: { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-700", icon: "text-orange-600", gradient: "from-orange-500 to-orange-600" },
  wait: { bg: "bg-slate-50", border: "border-slate-400", text: "text-slate-700", icon: "text-slate-600", gradient: "from-slate-500 to-slate-600" },
  condition: { bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-700", icon: "text-amber-600", gradient: "from-amber-500 to-amber-600" },
};

export default function WorkflowBuilderPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/workflows/:id/edit");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [workflowIdState, setWorkflowIdState] = useState<number | null>(params?.id ? parseInt(params.id) : null);
  const workflowId = workflowIdState;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("candidate_status_change");
  const [triggerConfig, setTriggerConfig] = useState<any>({});
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editingTrigger, setEditingTrigger] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [actionMenuAfterStep, setActionMenuAfterStep] = useState<string | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testDataMode, setTestDataMode] = useState<"last" | "manual" | "listen">("manual");
  const [testData, setTestData] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [showExecutionLogs, setShowExecutionLogs] = useState(false);

  const { data: existingWorkflow } = useQuery<any>({
    queryKey: [`/api/workflows/${workflowId}`],
    enabled: !!workflowId && !!user,
  });

  const { data: availableActions = [], isLoading: actionsLoading } = useQuery<any[]>({
    queryKey: ["/api/workflows/actions"],
    enabled: !!user,
  });

  // Get user email templates
  const { data: emailTemplates = [] } = useQuery<any[]>({
    queryKey: ["/api/workflows/email-templates"],
    enabled: !!user,
  });

  // Get users for interviewer selection
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  // Get last execution data (for "Use last execution" option)
  const { data: lastExecutionData } = useQuery<any>({
    queryKey: [`/api/workflows/${workflowId}/last-execution`],
    enabled: !!workflowId && !!user && showTestDialog && testDataMode === "last",
  });

  useEffect(() => {
    if (params?.id) {
      setWorkflowIdState(parseInt(params.id));
    } else {
      setWorkflowIdState(null);
    }
  }, [params?.id]);

  useEffect(() => {
    if (existingWorkflow) {
      setName(existingWorkflow.name || "");
      setDescription(existingWorkflow.description || "");
      setTriggerType(existingWorkflow.triggerType || "candidate_status_change");
      setTriggerConfig(existingWorkflow.triggerConfig || {});
      // Ensure steps have IDs - if they don't, generate them
      const loadedSteps = existingWorkflow.steps || [];
      const stepsWithIds = loadedSteps.map((step: any, index: number) => ({
        ...step,
        id: step.id || `step-${index}-${Date.now()}`,
      }));
      setSteps(stepsWithIds);
      // Clear editing state when loading new workflow
      setEditingStep(null);
      setEditingTrigger(false);
    }
  }, [existingWorkflow]);

  const createWorkflowMutation = useMutation({
    mutationFn: async (workflow: any) => {
      const res = await apiRequest("POST", "/api/workflows", workflow);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      toast({ title: "Workflow created successfully" });
      setLocation("/workflows");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create workflow", description: error.message, variant: "destructive" });
    },
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/workflows/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      toast({ title: "Workflow updated successfully" });
      setLocation("/workflows");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update workflow", description: error.message, variant: "destructive" });
    },
  });

  // Test workflow mutation
  const testWorkflowMutation = useMutation({
    mutationFn: async ({ workflowId: id, testData: data }: { workflowId: number; testData: any }) => {
      const res = await apiRequest("POST", `/api/workflows/${id}/test`, { testData: data, isTestMode: true });
      return await res.json();
    },
    onSuccess: (result) => {
      setExecutionResult(result);
      setShowExecutionLogs(true);
      setShowTestDialog(false);
      setIsRunning(false);
      toast({ title: "Workflow executed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Workflow execution failed", description: error.message, variant: "destructive" });
      setIsRunning(false);
    },
  });

  const generateStepId = () => `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const getActionDef = (actionType: string) => {
    return (availableActions as any[]).find((a: any) => a.type === actionType);
  };

  const handleAddStep = (actionType: string, afterStepId?: string) => {
    const newStep: WorkflowStep = {
      id: generateStepId(),
      type: actionType,
      config: {},
    };

    const branchType = (window as any).__addingToBranch;
    delete (window as any).__addingToBranch;

    if (afterStepId) {
      const parentStep = steps.find((s) => s.id === afterStepId);
      if (parentStep && parentStep.type === "condition") {
        // Adding to conditional branch
        const updatedStep = { ...parentStep };
        if (branchType === "then") {
          updatedStep.thenSteps = [...(parentStep.thenSteps || []), newStep];
        } else if (branchType === "else") {
          updatedStep.elseSteps = [...(parentStep.elseSteps || []), newStep];
        }
        setSteps(steps.map((s) => (s.id === afterStepId ? updatedStep : s)));
      } else {
        // Adding after regular step
        const index = steps.findIndex(s => s.id === afterStepId);
        if (index >= 0) {
          const newSteps = [...steps];
          newSteps.splice(index + 1, 0, newStep);
          setSteps(newSteps);
        } else {
          setSteps([...steps, newStep]);
        }
      }
    } else {
      setSteps([...steps, newStep]);
    }
    
    setEditingStep(newStep.id);
    setShowActionMenu(false);
    setActionMenuAfterStep(null);
  };

  const handleDeleteStep = (stepId: string) => {
    setSteps(steps.filter((s) => s.id !== stepId));
    if (editingStep === stepId) setEditingStep(null);
  };

  const handleUpdateStepConfig = (stepId: string, config: any) => {
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;

    // If template is selected for send_email action, auto-populate subject and body
    if (step.type === "send_email" && config.template && config.template !== "none") {
      const selectedTemplate = (emailTemplates as any[]).find((t) => t.id === config.template);
      if (selectedTemplate) {
        config.subject = selectedTemplate.subject;
        config.body = selectedTemplate.body;
      }
    } else if (step.type === "send_email" && config.template === "none") {
      // Clear template when "none" is selected
      config.template = undefined;
    }

    setSteps(steps.map((step) => (step.id === stepId ? { ...step, config: { ...step.config, ...config } } : step)));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Workflow name is required", variant: "destructive" });
      return;
    }
    if (steps.length === 0) {
      toast({ title: "Add at least one action", variant: "destructive" });
      return;
    }

    const workflowData = {
      name,
      description,
      isActive: true,
      triggerType,
      triggerConfig,
      steps,
    };

    if (workflowId) {
      updateWorkflowMutation.mutate({ id: workflowId, data: workflowData });
    } else {
      createWorkflowMutation.mutate(workflowData);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: "New",
      assessment_sent: "Assessment Sent",
      assessment_completed: "Assessment Completed",
      interview_scheduled: "Interview Scheduled",
      interview_completed: "Interview Completed",
      offer_sent: "Offer Sent",
      rejected: "Rejected",
    };
    return labels[status] || status;
  };

  const getEditingStepDef = () => {
    if (editingTrigger) return { type: "trigger", name: "Trigger Configuration" };
    if (editingStep) {
      const step = steps.find(s => s.id === editingStep);
      if (step) {
        const actionDef = getActionDef(step.type);
        return { type: "step", name: actionDef?.name || step.type, step, actionDef };
      }
    }
    return null;
  };

  const editingDef = getEditingStepDef();

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/workflows")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{workflowId ? "Edit Workflow" : "Create Workflow"}</h1>
            <p className="text-sm text-gray-500">Build powerful automation workflows</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workflow name..."
            className="w-64"
          />
          <Button variant="outline" onClick={() => setLocation("/workflows")}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (steps.length === 0) {
                toast({ title: "Add at least one action before testing", variant: "destructive" });
                return;
              }
              setShowTestDialog(true);
              setTestDataMode(triggerType === "manual" ? "manual" : "manual");
              setTestData({});
            }}
            disabled={isRunning || steps.length === 0}
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Play className="h-4 w-4 mr-2" />
            {triggerType === "manual" ? "Run" : "Test"} Workflow
          </Button>
          <Button
            onClick={handleSave}
            disabled={createWorkflowMutation.isPending || updateWorkflowMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Canvas */}
        <div ref={canvasRef} className="flex-1 overflow-auto bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Trigger */}
            <div className="flex flex-col items-center mb-8">
              <Card
                className={`w-64 border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg cursor-pointer hover:shadow-xl transition-all ${
                  editingTrigger ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => {
                  setEditingTrigger(true);
                  setEditingStep(null);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-900">When this happens</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {triggerType === "candidate_status_change" && (
                          <>
                            {triggerConfig.fromStatus ? getStatusLabel(triggerConfig.fromStatus) : "Any"} →{" "}
                            {triggerConfig.toStatus ? getStatusLabel(triggerConfig.toStatus) : "Any"}
                          </>
                        )}
                        {triggerType === "interview_scheduled" && "Interview Scheduled"}
                        {triggerType === "interview_completed" && "Interview Completed"}
                        {triggerType === "manual" && "Manual Trigger"}
                        {triggerType === "scheduled" && "Scheduled"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTrigger(true);
                        setEditingStep(null);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Connection Line */}
              {steps.length > 0 && <div className="w-0.5 h-12 bg-gray-400 my-2" />}
            </div>

            {/* Steps */}
            <div className="flex flex-col items-center gap-4">
              {steps.map((step, index) => {
                const actionDef = getActionDef(step.type);
                const colors = ACTION_COLORS[step.type] || ACTION_COLORS.wait;
                const Icon = ACTION_ICONS[step.type] || Settings;
                const isCondition = step.type === "condition";

                return (
                  <div key={step.id} className="flex flex-col items-center">
                    <Card
                      className={`w-64 border-2 ${colors.border} ${colors.bg} shadow-lg hover:shadow-xl transition-all cursor-pointer ${
                        editingStep === step.id ? "ring-2 ring-blue-500" : ""
                      }`}
                      onClick={() => {
                        setEditingStep(step.id);
                        setEditingTrigger(false);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${colors.gradient} shadow-md`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-gray-900 truncate">{actionDef?.name || step.type}</h4>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{actionDef?.description || "Configure action"}</p>
                            {isCondition && (
                              <div className="mt-2 flex gap-2">
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  YES
                                </Badge>
                                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  NO
                                </Badge>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStep(step.id);
                            }}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Conditional Logic Branches */}
                    {isCondition && (
                      <div className="mt-4 flex gap-8 justify-center">
                        {/* YES Branch */}
                        <div className="flex flex-col items-center min-w-[200px]">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              YES
                            </Badge>
                            <span className="text-xs text-gray-500">If condition is true</span>
                          </div>
                          <div className="w-0.5 h-4 bg-green-400" />
                          <div className="flex flex-col items-center gap-2 w-full">
                            {(step.thenSteps || []).map((thenStep: WorkflowStep, thenIndex: number) => {
                              const thenActionDef = getActionDef(thenStep.type);
                              const thenColors = ACTION_COLORS[thenStep.type] || ACTION_COLORS.wait;
                              const ThenIcon = ACTION_ICONS[thenStep.type] || Settings;
                              return (
                                <div key={thenStep.id} className="flex flex-col items-center w-full">
                                  <Card
                                    className={`w-full border-2 ${thenColors.border} ${thenColors.bg} shadow-md cursor-pointer ${
                                      editingStep === thenStep.id ? "ring-2 ring-blue-500" : ""
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingStep(thenStep.id);
                                      setEditingTrigger(false);
                                    }}
                                  >
                                    <CardContent className="p-3">
                                      <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded bg-gradient-to-br ${thenColors.gradient}`}>
                                          <ThenIcon className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-semibold text-xs text-gray-900 truncate">{thenActionDef?.name || thenStep.type}</h5>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const updatedStep = { ...step };
                                            updatedStep.thenSteps = (step.thenSteps || []).filter((s: WorkflowStep) => s.id !== thenStep.id);
                                            setSteps(steps.map((s) => (s.id === step.id ? updatedStep : s)));
                                          }}
                                          className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                  {thenIndex < (step.thenSteps || []).length - 1 && <div className="w-0.5 h-4 bg-green-400" />}
                                </div>
                              );
                            })}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuAfterStep(step.id);
                                setShowActionMenu(true);
                                setEditingStep(null);
                                setEditingTrigger(false);
                                // Store that we're adding to YES branch
                                (window as any).__addingToBranch = "then";
                              }}
                              className="h-7 w-full text-xs border-green-300 text-green-700 hover:bg-green-50"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add to YES
                            </Button>
                          </div>
                        </div>

                        {/* NO Branch */}
                        <div className="flex flex-col items-center min-w-[200px]">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                              <XCircle className="h-3 w-3 mr-1" />
                              NO
                            </Badge>
                            <span className="text-xs text-gray-500">If condition is false</span>
                          </div>
                          <div className="w-0.5 h-4 bg-red-400" />
                          <div className="flex flex-col items-center gap-2 w-full">
                            {(step.elseSteps || []).map((elseStep: WorkflowStep, elseIndex: number) => {
                              const elseActionDef = getActionDef(elseStep.type);
                              const elseColors = ACTION_COLORS[elseStep.type] || ACTION_COLORS.wait;
                              const ElseIcon = ACTION_ICONS[elseStep.type] || Settings;
                              return (
                                <div key={elseStep.id} className="flex flex-col items-center w-full">
                                  <Card
                                    className={`w-full border-2 ${elseColors.border} ${elseColors.bg} shadow-md cursor-pointer ${
                                      editingStep === elseStep.id ? "ring-2 ring-blue-500" : ""
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingStep(elseStep.id);
                                      setEditingTrigger(false);
                                    }}
                                  >
                                    <CardContent className="p-3">
                                      <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded bg-gradient-to-br ${elseColors.gradient}`}>
                                          <ElseIcon className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-semibold text-xs text-gray-900 truncate">{elseActionDef?.name || elseStep.type}</h5>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const updatedStep = { ...step };
                                            updatedStep.elseSteps = (step.elseSteps || []).filter((s: WorkflowStep) => s.id !== elseStep.id);
                                            setSteps(steps.map((s) => (s.id === step.id ? updatedStep : s)));
                                          }}
                                          className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                  {elseIndex < (step.elseSteps || []).length - 1 && <div className="w-0.5 h-4 bg-red-400" />}
                                </div>
                              );
                            })}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuAfterStep(step.id);
                                setShowActionMenu(true);
                                setEditingStep(null);
                                setEditingTrigger(false);
                                // Store that we're adding to NO branch
                                (window as any).__addingToBranch = "else";
                              }}
                              className="h-7 w-full text-xs border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add to NO
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Add Step Button (only if not condition) */}
                    {!isCondition && (
                      <div className="flex justify-center mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuAfterStep(step.id);
                            setShowActionMenu(true);
                            setEditingStep(null);
                            setEditingTrigger(false);
                          }}
                          className="h-8 w-8 p-0 rounded-full border-2 border-dashed hover:border-solid"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {index < steps.length - 1 && !isCondition && <div className="w-0.5 h-12 bg-gray-400 my-2" />}
                  </div>
                );
              })}

              {/* Add First Step */}
              {steps.length === 0 && (
                <Card className="w-64 border-2 border-dashed border-gray-400 bg-white hover:border-gray-500 transition-colors">
                  <CardContent className="p-4">
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setActionMenuAfterStep(null);
                        setShowActionMenu(true);
                        setEditingStep(null);
                        setEditingTrigger(false);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Action
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Right: Settings Panel */}
        <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto">
          {editingDef ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">{editingDef.name}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingStep(null);
                    setEditingTrigger(false);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {editingDef.type === "trigger" && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Trigger Type</Label>
                    <Select value={triggerType} onValueChange={setTriggerType}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="candidate_status_change">🔄 Candidate Status Change</SelectItem>
                        <SelectItem value="interview_scheduled">📅 Interview Scheduled</SelectItem>
                        <SelectItem value="interview_completed">✅ Interview Completed</SelectItem>
                        <SelectItem value="manual">👆 Manual Trigger</SelectItem>
                        <SelectItem value="scheduled">⏰ Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {triggerType === "candidate_status_change" && (
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label className="text-sm font-semibold">From Status (optional)</Label>
                        <Select
                          value={triggerConfig.fromStatus || "any"}
                          onValueChange={(value) =>
                            setTriggerConfig({ ...triggerConfig, fromStatus: value === "any" ? null : value })
                          }
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any status</SelectItem>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="assessment_sent">Assessment Sent</SelectItem>
                            <SelectItem value="assessment_completed">Assessment Completed</SelectItem>
                            <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                            <SelectItem value="interview_completed">Interview Completed</SelectItem>
                            <SelectItem value="offer_sent">Offer Sent</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">To Status</Label>
                        <Select
                          value={triggerConfig.toStatus || ""}
                          onValueChange={(value) => setTriggerConfig({ ...triggerConfig, toStatus: value })}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="assessment_sent">Assessment Sent</SelectItem>
                            <SelectItem value="assessment_completed">Assessment Completed</SelectItem>
                            <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                            <SelectItem value="interview_completed">Interview Completed</SelectItem>
                            <SelectItem value="offer_sent">Offer Sent</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <div className="pt-4 border-t">
                    <Button
                      onClick={() => {
                        setEditingTrigger(false);
                        setEditingStep(null);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}

              {editingDef.type === "step" && editingDef.actionDef && (
                <div className="space-y-4">
                  {editingDef.actionDef.configFields?.map((field: any) => {
                    const stepConfig = editingDef.step?.config || {};
                    const hasTemplate = editingDef.step?.type === "send_email" && stepConfig.template && stepConfig.template !== "none";
                    const isTemplateField = field.name === "subject" || field.name === "body";
                    const isDisabled = hasTemplate && isTemplateField;

                    return (
                      <div key={field.name}>
                        <Label className="text-sm font-semibold">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                          {isDisabled && (
                            <span className="ml-2 text-xs text-blue-600 font-normal">(from template)</span>
                          )}
                        </Label>
                        {field.type === "select" || field.type === "user_select" ? (
                          <Select
                            value={stepConfig[field.name]?.toString() || ""}
                            onValueChange={(value) => handleUpdateStepConfig(editingDef.step!.id, { [field.name]: field.type === "user_select" ? parseInt(value) : value })}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.name === "template" ? (
                                <>
                                  <SelectItem value="none">None (use custom)</SelectItem>
                                  {(emailTemplates as any[]).map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.name}
                                    </SelectItem>
                                  ))}
                                </>
                              ) : field.type === "user_select" ? (
                                (users as any[]).map((user) => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.fullName || user.username || user.email}
                                  </SelectItem>
                                ))
                              ) : (
                                field.options?.map((option: string) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        ) : field.type === "datetime" ? (
                          <Input
                            type="datetime-local"
                            value={stepConfig[field.name] ? new Date(stepConfig[field.name]).toISOString().slice(0, 16) : ""}
                            onChange={(e) => {
                              const dateValue = e.target.value ? new Date(e.target.value).toISOString() : "";
                              handleUpdateStepConfig(editingDef.step!.id, { [field.name]: dateValue });
                            }}
                            placeholder={field.placeholder}
                            className="mt-2"
                            required={field.required}
                          />
                        ) : field.type === "textarea" ? (
                          <Textarea
                            value={stepConfig[field.name] || ""}
                            onChange={(e) => handleUpdateStepConfig(editingDef.step!.id, { [field.name]: e.target.value })}
                            placeholder={field.placeholder}
                            rows={4}
                            className="mt-2"
                            disabled={isDisabled}
                          />
                        ) : (
                          <Input
                            type={field.type === "number" ? "number" : "text"}
                            value={stepConfig[field.name] || ""}
                            onChange={(e) =>
                              handleUpdateStepConfig(editingDef.step!.id, {
                                [field.name]: field.type === "number" ? Number(e.target.value) : e.target.value,
                              })
                            }
                            placeholder={field.placeholder}
                            className="mt-2"
                            disabled={isDisabled}
                          />
                        )}
                      </div>
                    );
                  })}
                  <div className="pt-4 border-t">
                    <Button
                      onClick={() => {
                        setEditingStep(null);
                        setEditingTrigger(false);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm">Click on a trigger or action to configure it</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Menu Modal */}
      {showActionMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => {
              setShowActionMenu(false);
              setActionMenuAfterStep(null);
            }}
          />
          <Card className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 shadow-2xl border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Choose an Action</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowActionMenu(false);
                    setActionMenuAfterStep(null);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {actionsLoading ? (
                <div className="text-center py-8 text-gray-500">Loading actions...</div>
              ) : availableActions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No actions available</div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {availableActions.map((action) => {
                    const Icon = ACTION_ICONS[action.type] || Settings;
                    const colors = ACTION_COLORS[action.type] || ACTION_COLORS.wait;
                    return (
                      <button
                        key={action.type}
                        onClick={() => handleAddStep(action.type, actionMenuAfterStep || undefined)}
                        className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-3 border border-transparent hover:border-gray-200"
                      >
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${colors.gradient} shadow-sm`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-900">{action.name}</div>
                          <div className="text-xs text-gray-600">{action.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Test Workflow Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {triggerType === "manual" ? "Run Workflow" : "Test Workflow"}
            </DialogTitle>
            <DialogDescription>
              {triggerType === "manual"
                ? "Enter data to execute this workflow"
                : "Choose how you want to test this workflow"}
            </DialogDescription>
          </DialogHeader>

          {triggerType === "manual" ? (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-semibold">Candidate Name</Label>
                <Input
                  value={testData.candidateName || ""}
                  onChange={(e) => setTestData({ ...testData, candidateName: e.target.value })}
                  placeholder="John Doe"
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Candidate Email</Label>
                <Input
                  type="email"
                  value={testData.candidateEmail || ""}
                  onChange={(e) => setTestData({ ...testData, candidateEmail: e.target.value })}
                  placeholder="john@example.com"
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Job Title (optional)</Label>
                <Input
                  value={testData.jobTitle || ""}
                  onChange={(e) => setTestData({ ...testData, jobTitle: e.target.value })}
                  placeholder="Software Engineer"
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!workflowId) {
                      // For new workflows, save first
                      const workflowData = {
                        name: name || "Untitled Workflow",
                        description,
                        isActive: true,
                        triggerType,
                        triggerConfig,
                        steps,
                      };
                      const res = await apiRequest("POST", "/api/workflows", workflowData);
                      const saved = await res.json();
                      setWorkflowIdState(saved.id);
                    }
                    setIsRunning(true);
                    testWorkflowMutation.mutate({
                      workflowId: workflowId!,
                      testData,
                    });
                  }}
                  disabled={isRunning || !testData.candidateName || !testData.candidateEmail}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Workflow
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <Tabs value={testDataMode} onValueChange={(v) => setTestDataMode(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="last">Use Last Execution</TabsTrigger>
                  <TabsTrigger value="manual">Enter Test Data</TabsTrigger>
                  <TabsTrigger value="listen">Listen for Event</TabsTrigger>
                </TabsList>

                <TabsContent value="last" className="space-y-4 mt-4">
                  {lastExecutionData ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Last execution data:</p>
                        <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-48">
                          {JSON.stringify(lastExecutionData.executionData, null, 2)}
                        </pre>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!workflowId) {
                              const workflowData = {
                                name: name || "Untitled Workflow",
                                description,
                                isActive: true,
                                triggerType,
                                triggerConfig,
                                steps,
                              };
                              const res = await apiRequest("POST", "/api/workflows", workflowData);
                              const saved = await res.json();
                              setWorkflowIdState(saved.id);
                            }
                            setIsRunning(true);
                            testWorkflowMutation.mutate({
                              workflowId: workflowId!,
                              testData: (lastExecutionData as any)?.executionData || {},
                            });
                          }}
                          disabled={isRunning}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isRunning ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Running...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Run with This Data
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No previous execution found</p>
                      <p className="text-xs mt-2">This workflow hasn't run yet</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="manual" className="space-y-4 mt-4">
                  {triggerType === "candidate_status_change" && (
                    <>
                      <div>
                        <Label className="text-sm font-semibold">Candidate Name</Label>
                        <Input
                          value={testData.candidateName || ""}
                          onChange={(e) => setTestData({ ...testData, candidateName: e.target.value })}
                          placeholder="John Doe"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">Candidate Email</Label>
                        <Input
                          type="email"
                          value={testData.candidateEmail || ""}
                          onChange={(e) => setTestData({ ...testData, candidateEmail: e.target.value })}
                          placeholder="john@example.com"
                          className="mt-2"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-semibold">From Status</Label>
                          <Select
                            value={testData.fromStatus || "new"}
                            onValueChange={(value) => setTestData({ ...testData, fromStatus: value })}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="assessment_sent">Assessment Sent</SelectItem>
                              <SelectItem value="assessment_completed">Assessment Completed</SelectItem>
                              <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                              <SelectItem value="interview_completed">Interview Completed</SelectItem>
                              <SelectItem value="offer_sent">Offer Sent</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold">To Status</Label>
                          <Select
                            value={testData.toStatus || "interview_scheduled"}
                            onValueChange={(value) => setTestData({ ...testData, toStatus: value })}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="assessment_sent">Assessment Sent</SelectItem>
                              <SelectItem value="assessment_completed">Assessment Completed</SelectItem>
                              <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                              <SelectItem value="interview_completed">Interview Completed</SelectItem>
                              <SelectItem value="offer_sent">Offer Sent</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                  {triggerType === "interview_scheduled" && (
                    <>
                      <div>
                        <Label className="text-sm font-semibold">Candidate Name</Label>
                        <Input
                          value={testData.candidateName || ""}
                          onChange={(e) => setTestData({ ...testData, candidateName: e.target.value })}
                          placeholder="John Doe"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">Candidate Email</Label>
                        <Input
                          type="email"
                          value={testData.candidateEmail || ""}
                          onChange={(e) => setTestData({ ...testData, candidateEmail: e.target.value })}
                          placeholder="john@example.com"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">Interview Date</Label>
                        <Input
                          type="datetime-local"
                          value={testData.scheduledDate || ""}
                          onChange={(e) => setTestData({ ...testData, scheduledDate: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                    </>
                  )}
                  {triggerType === "interview_completed" && (
                    <>
                      <div>
                        <Label className="text-sm font-semibold">Candidate Name</Label>
                        <Input
                          value={testData.candidateName || ""}
                          onChange={(e) => setTestData({ ...testData, candidateName: e.target.value })}
                          placeholder="John Doe"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">Interview Date</Label>
                        <Input
                          type="datetime-local"
                          value={testData.conductedDate || ""}
                          onChange={(e) => setTestData({ ...testData, conductedDate: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                    </>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!workflowId) {
                          const workflowData = {
                            name: name || "Untitled Workflow",
                            description,
                            isActive: true,
                            triggerType,
                            triggerConfig,
                            steps,
                          };
                          const res = await apiRequest("POST", "/api/workflows", workflowData);
                          const saved = await res.json();
                          setWorkflowIdState(saved.id);
                        }
                        setIsRunning(true);
                        testWorkflowMutation.mutate({
                          workflowId: workflowId!,
                          testData,
                        });
                      }}
                      disabled={isRunning || (triggerType === "candidate_status_change" && (!testData.candidateName || !testData.candidateEmail))}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Run Test
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </TabsContent>

                <TabsContent value="listen" className="space-y-4 mt-4">
                  <div className="text-center py-8">
                    <div className="p-4 bg-blue-50 rounded-lg mb-4">
                      <Radio className="h-8 w-8 mx-auto mb-2 text-blue-600 animate-pulse" />
                      <p className="font-semibold text-gray-900">Listening for event...</p>
                      <p className="text-sm text-gray-600 mt-2">
                        {triggerType === "interview_scheduled" && "Go schedule an interview in your app"}
                        {triggerType === "candidate_status_change" && "Go change a candidate's status in your app"}
                        {triggerType === "interview_completed" && "Go complete an interview in your app"}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      The workflow will execute automatically when the event is triggered
                    </p>
                    <DialogFooter className="mt-6">
                      <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                        Cancel
                      </Button>
                    </DialogFooter>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Execution Logs Panel */}
      {showExecutionLogs && executionResult && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Execution Logs</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {executionResult.execution?.status === "completed" ? (
                      <span className="text-green-600">✓ Execution completed successfully</span>
                    ) : executionResult.execution?.status === "failed" ? (
                      <span className="text-red-600">✗ Execution failed</span>
                    ) : (
                      <span className="text-blue-600">⏳ Execution in progress...</span>
                    )}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowExecutionLogs(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {executionResult.steps?.map((step: any, index: number) => (
                  <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          step.status === "completed" ? "bg-green-100" :
                          step.status === "failed" ? "bg-red-100" :
                          step.status === "running" ? "bg-blue-100" :
                          "bg-gray-100"
                        }`}>
                          {step.status === "completed" ? (
                            <CheckCircle className={`h-5 w-5 ${
                              step.status === "completed" ? "text-green-600" : "text-gray-400"
                            }`} />
                          ) : step.status === "failed" ? (
                            <XCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Step {index + 1}: {step.actionType}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            Status: <span className="font-medium capitalize">{step.status}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    {step.result && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <p className="font-semibold mb-1">Result:</p>
                        <pre className="text-xs overflow-auto">
                          {JSON.stringify(step.result, null, 2)}
                        </pre>
                      </div>
                    )}
                    {step.errorMessage && (
                      <div className="mt-3 p-3 bg-red-50 rounded text-sm">
                        <p className="font-semibold text-red-700 mb-1">Error:</p>
                        <p className="text-red-600">{step.errorMessage}</p>
                      </div>
                    )}
                    {step.startedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Started: {new Date(step.startedAt).toLocaleString()}
                        {step.completedAt && ` • Completed: ${new Date(step.completedAt).toLocaleString()}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <Button
                  onClick={() => {
                    setShowExecutionLogs(false);
                    setExecutionResult(null);
                    setIsRunning(false);
                  }}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
