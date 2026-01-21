import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  X,
  Plus,
  Trash2,
  Zap,
  Mail,
  RefreshCw,
  Calendar,
  MessageSquare,
  Database,
  Clock,
  GitBranch,
  ArrowRight,
  Settings,
  Save,
  Play,
} from "lucide-react";

interface Workflow {
  id?: number;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: string;
  triggerConfig?: any;
  steps: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  type: string;
  config: any;
  conditions?: any[];
  thenSteps?: WorkflowStep[];
  elseSteps?: WorkflowStep[];
}

interface WorkflowBuilderProps {
  workflow: Workflow | null;
  availableActions: any[];
  onSave: (workflow: any) => void;
  onCancel: () => void;
}

const TRIGGER_TYPES = [
  { value: "candidate_status_change", label: "Candidate Status Change", icon: "🔄" },
  { value: "interview_scheduled", label: "Interview Scheduled", icon: "📅" },
  { value: "interview_completed", label: "Interview Completed", icon: "✅" },
  { value: "manual", label: "Manual Trigger", icon: "👆" },
  { value: "scheduled", label: "Scheduled", icon: "⏰" },
];

const ACTION_ICONS: Record<string, any> = {
  send_email: Mail,
  update_status: RefreshCw,
  create_interview: Calendar,
  notify_slack: MessageSquare,
  update_crm: Database,
  wait: Clock,
  condition: GitBranch,
};

const ACTION_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  send_email: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    icon: "text-blue-500",
  },
  update_status: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    icon: "text-emerald-500",
  },
  create_interview: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    icon: "text-purple-500",
  },
  notify_slack: {
    bg: "bg-pink-50",
    border: "border-pink-200",
    text: "text-pink-700",
    icon: "text-pink-500",
  },
  update_crm: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    icon: "text-orange-500",
  },
  wait: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
    icon: "text-slate-500",
  },
  condition: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    icon: "text-amber-500",
  },
};

export default function WorkflowBuilder({
  workflow,
  availableActions,
  onSave,
  onCancel,
}: WorkflowBuilderProps) {
  const [name, setName] = useState(workflow?.name || "");
  const [description, setDescription] = useState(workflow?.description || "");
  const [triggerType, setTriggerType] = useState(workflow?.triggerType || "candidate_status_change");
  const [triggerConfig, setTriggerConfig] = useState(workflow?.triggerConfig || {});
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow?.steps || []);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editingTrigger, setEditingTrigger] = useState(false);
  const [selectedActionType, setSelectedActionType] = useState<string>("");

  const generateStepId = () => `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const getActionDef = (actionType: string) => {
    return availableActions.find((a) => a.type === actionType);
  };

  const handleAddStep = () => {
    if (!selectedActionType) return;
    const newStep: WorkflowStep = {
      id: generateStepId(),
      type: selectedActionType,
      config: {},
    };
    setSteps([...steps, newStep]);
    setEditingStep(newStep.id);
    setSelectedActionType("");
  };

  const handleDeleteStep = (stepId: string) => {
    setSteps(steps.filter((s) => s.id !== stepId));
    if (editingStep === stepId) {
      setEditingStep(null);
    }
  };

  const handleUpdateStepConfig = (stepId: string, config: any) => {
    setSteps(steps.map((step) => (step.id === stepId ? { ...step, config: { ...step.config, ...config } } : step)));
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert("Workflow name is required");
      return;
    }
    if (steps.length === 0) {
      alert("Workflow must have at least one step");
      return;
    }
    onSave({
      name,
      description,
      isActive: workflow?.isActive ?? true,
      triggerType,
      triggerConfig,
      steps,
    });
  };

  const getTriggerLabel = () => {
    const trigger = TRIGGER_TYPES.find((t) => t.value === triggerType);
    return trigger?.label || triggerType;
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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {workflow?.id ? "Edit Workflow" : "Create Workflow"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Build powerful automation workflows</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              Save Workflow
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Workflow Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">
                    Workflow Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Auto Interview Workflow"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this workflow does..."
                    rows={2}
                    className="mt-1.5"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Trigger */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">Trigger</h3>
                        <Badge variant="outline" className="bg-white">
                          {getTriggerLabel()}
                        </Badge>
                      </div>
                      {triggerType === "candidate_status_change" && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">
                            {triggerConfig.fromStatus ? getStatusLabel(triggerConfig.fromStatus) : "Any"}
                          </span>
                          <ArrowRight className="h-4 w-4" />
                          <span className="font-medium">
                            {triggerConfig.toStatus ? getStatusLabel(triggerConfig.toStatus) : "Any"}
                          </span>
                        </div>
                      )}
                      {!editingTrigger && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTrigger(true)}
                          className="mt-3 text-blue-600 hover:text-blue-700"
                        >
                          <Settings className="h-4 w-4 mr-1.5" />
                          Configure Trigger
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {editingTrigger && (
                  <div className="mt-6 pt-6 border-t border-blue-200 space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Trigger Type</Label>
                      <Select value={triggerType} onValueChange={setTriggerType}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIGGER_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <span>{type.icon}</span>
                                <span>{type.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {triggerType === "candidate_status_change" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">From Status (optional)</Label>
                          <Select
                            value={triggerConfig.fromStatus || "any"}
                            onValueChange={(value) =>
                              setTriggerConfig({
                                ...triggerConfig,
                                fromStatus: value === "any" ? null : value,
                              })
                            }
                          >
                            <SelectTrigger className="mt-1.5">
                              <SelectValue placeholder="Any status" />
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
                          <Label className="text-sm font-medium">To Status</Label>
                          <Select
                            value={triggerConfig.toStatus || ""}
                            onValueChange={(value) => setTriggerConfig({ ...triggerConfig, toStatus: value })}
                          >
                            <SelectTrigger className="mt-1.5">
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

                    <div className="flex justify-end">
                      <Button onClick={() => setEditingTrigger(false)} size="sm">
                        Done
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Steps */}
            <div className="space-y-4">
              {steps.map((step, index) => {
                const actionDef = getActionDef(step.type);
                const colors = ACTION_COLORS[step.type] || ACTION_COLORS.wait;
                const Icon = ACTION_ICONS[step.type] || Settings;

                return (
                  <div key={step.id} className="relative">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center pt-2">
                        <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border-2`}>
                          <Icon className={`h-5 w-5 ${colors.icon}`} />
                        </div>
                        {index < steps.length - 1 && (
                          <div className="w-0.5 h-8 bg-gray-200 my-1" />
                        )}
                      </div>

                      <Card className={`flex-1 border-2 ${colors.border} ${colors.bg} shadow-sm hover:shadow-md transition-shadow`}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-gray-900">{actionDef?.name || step.type}</h4>
                                <Badge variant="outline" className="bg-white/80">
                                  Step {index + 1}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{actionDef?.description || "Configure this action"}</p>
                              {editingStep === step.id && actionDef && (
                                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                                  {actionDef.configFields?.map((field: any) => (
                                    <div key={field.name}>
                                      <Label className="text-sm font-medium">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                      </Label>
                                      {field.type === "select" ? (
                                        <Select
                                          value={step.config[field.name] || ""}
                                          onValueChange={(value) =>
                                            handleUpdateStepConfig(step.id, { [field.name]: value })
                                          }
                                        >
                                          <SelectTrigger className="mt-1.5">
                                            <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {field.options?.map((option: string) => (
                                              <SelectItem key={option} value={option}>
                                                {option}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      ) : field.type === "textarea" ? (
                                        <Textarea
                                          value={step.config[field.name] || ""}
                                          onChange={(e) =>
                                            handleUpdateStepConfig(step.id, { [field.name]: e.target.value })
                                          }
                                          placeholder={field.placeholder}
                                          rows={3}
                                          className="mt-1.5"
                                        />
                                      ) : (
                                        <Input
                                          type={field.type === "number" ? "number" : "text"}
                                          value={step.config[field.name] || ""}
                                          onChange={(e) =>
                                            handleUpdateStepConfig(step.id, {
                                              [field.name]: field.type === "number" ? Number(e.target.value) : e.target.value,
                                            })
                                          }
                                          placeholder={field.placeholder}
                                          className="mt-1.5"
                                        />
                                      )}
                                    </div>
                                  ))}
                                  <div className="flex justify-end pt-2">
                                    <Button size="sm" onClick={() => setEditingStep(null)}>
                                      Done
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingStep(editingStep === step.id ? null : step.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteStep(step.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              })}

              {/* Add Step */}
              <Card className="border-2 border-dashed border-gray-300 bg-gray-50/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Select value={selectedActionType} onValueChange={setSelectedActionType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an action to add..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableActions.map((action) => (
                            <SelectItem key={action.type} value={action.type}>
                              <div className="flex items-center gap-2">
                                <span>{action.icon || "⚡"}</span>
                                <div>
                                  <div className="font-medium">{action.name}</div>
                                  <div className="text-xs text-gray-500">{action.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleAddStep}
                      disabled={!selectedActionType}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Action
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
