import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, GripVertical, Save } from "lucide-react";

interface FormField {
  id: string;
  type: "text" | "email" | "phone" | "textarea" | "number" | "select" | "file" | "checkbox";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select/checkbox
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface FormTemplate {
  id: number;
  name: string;
  description?: string;
  fields: FormField[];
  isDefault: boolean;
}

const DEFAULT_FIELDS: FormField[] = [
  { id: "name", type: "text", label: "Full Name", placeholder: "Enter your full name", required: true },
  { id: "email", type: "email", label: "Email Address", placeholder: "your.email@example.com", required: true },
  { id: "phone", type: "phone", label: "Phone Number", placeholder: "+1 (555) 123-4567", required: false },
  { id: "resume", type: "file", label: "Resume", required: true },
];

export default function FormBuilder() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldDialog, setShowFieldDialog] = useState(false);

  // Fetch all form templates
  const { data: templates = [], isLoading } = useQuery<FormTemplate[]>({
    queryKey: ['/api/form-templates'],
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/form-templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-templates'] });
      setShowCreateDialog(false);
      setTemplateName("");
      setTemplateDescription("");
      setFields(DEFAULT_FIELDS);
      toast({
        title: "Form template created",
        description: "Your form template has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/form-templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-templates'] });
      toast({
        title: "Form template updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/form-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-templates'] });
      setSelectedTemplate(null);
      toast({
        title: "Template deleted",
        description: "The form template has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setFields(template.fields);
    setTemplateName(template.name);
    setTemplateDescription(template.description || "");
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setTemplateName("");
    setTemplateDescription("");
    setFields(DEFAULT_FIELDS);
    setShowCreateDialog(true);
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: "text",
      label: "New Field",
      placeholder: "",
      required: false,
    };
    setEditingField(newField);
    setShowFieldDialog(true);
  };

  const handleEditField = (field: FormField) => {
    setEditingField(field);
    setShowFieldDialog(true);
  };

  const handleDeleteField = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId));
  };

  const handleSaveField = (field: FormField) => {
    if (editingField && editingField.id === field.id) {
      // Update existing field
      setFields(fields.map((f) => (f.id === field.id ? field : f)));
    } else {
      // Add new field
      setFields([...fields, field]);
    }
    setEditingField(null);
    setShowFieldDialog(false);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Validation error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: "Validation error",
        description: "At least one field is required",
        variant: "destructive",
      });
      return;
    }

    const templateData = {
      name: templateName,
      description: templateDescription,
      fields,
      isDefault: false,
    };

    if (selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, data: templateData });
    } else {
      createTemplateMutation.mutate(templateData);
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
      {/* Template List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Form Templates</h3>
          <Button onClick={handleCreateNew} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              No form templates yet. Create your first template to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleSelectTemplate(template)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.isDefault && (
                      <Badge className="bg-blue-100 text-blue-800">Default</Badge>
                    )}
                  </div>
                  {template.description && (
                    <CardDescription>{template.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">
                    {template.fields.length} field{template.fields.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTemplate(template);
                      }}
                    >
                      Edit
                    </Button>
                    {!template.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTemplateMutation.mutate(template.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Form Builder */}
      {(selectedTemplate || showCreateDialog) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedTemplate ? `Edit: ${selectedTemplate.name}` : "Create New Template"}
            </CardTitle>
            <CardDescription>
              Customize your application form fields. Drag to reorder, click to edit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Developer Application Form"
              />
            </div>

            <div>
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Brief description of this form template"
                rows={2}
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <Label>Form Fields</Label>
                <Button onClick={handleAddField} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50"
                  >
                    <GripVertical className="h-5 w-5 text-slate-400 cursor-move" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.label}</span>
                        <Badge variant="outline">{field.type}</Badge>
                        {field.required && (
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            Required
                          </Badge>
                        )}
                      </div>
                      {field.placeholder && (
                        <p className="text-xs text-slate-500 mt-1">{field.placeholder}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditField(field)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteField(field.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setSelectedTemplate(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}>
                {createTemplateMutation.isPending || updateTemplateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Field Editor Dialog */}
      {showFieldDialog && editingField && (
        <FieldEditorDialog
          field={editingField}
          open={showFieldDialog}
          onOpenChange={setShowFieldDialog}
          onSave={handleSaveField}
        />
      )}
    </div>
  );
}

// Field Editor Dialog Component
function FieldEditorDialog({
  field,
  open,
  onOpenChange,
  onSave,
}: {
  field: FormField;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (field: FormField) => void;
}) {
  const [fieldData, setFieldData] = useState<FormField>(field);
  const [optionText, setOptionText] = useState("");

  useEffect(() => {
    setFieldData(field);
  }, [field]);

  const handleAddOption = () => {
    if (optionText.trim()) {
      setFieldData({
        ...fieldData,
        options: [...(fieldData.options || []), optionText.trim()],
      });
      setOptionText("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setFieldData({
      ...fieldData,
      options: fieldData.options?.filter((_, i) => i !== index),
    });
  };

  const handleSave = () => {
    onSave(fieldData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Field</DialogTitle>
          <DialogDescription>Configure this form field</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="field-label">Field Label</Label>
            <Input
              id="field-label"
              value={fieldData.label}
              onChange={(e) => setFieldData({ ...fieldData, label: e.target.value })}
              placeholder="e.g., Full Name"
            />
          </div>

          <div>
            <Label htmlFor="field-type">Field Type</Label>
            <Select
              value={fieldData.type}
              onValueChange={(value: FormField["type"]) => {
                setFieldData({
                  ...fieldData,
                  type: value,
                  options: value === "select" || value === "checkbox" ? fieldData.options || [] : undefined,
                });
              }}
            >
              <SelectTrigger id="field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="textarea">Textarea</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="select">Select (Dropdown)</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
                <SelectItem value="file">File Upload</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="field-placeholder">Placeholder Text (Optional)</Label>
            <Input
              id="field-placeholder"
              value={fieldData.placeholder || ""}
              onChange={(e) => setFieldData({ ...fieldData, placeholder: e.target.value })}
              placeholder="e.g., Enter your name"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="field-required"
              checked={fieldData.required}
              onCheckedChange={(checked) =>
                setFieldData({ ...fieldData, required: checked === true })
              }
            />
            <Label htmlFor="field-required">Required field</Label>
          </div>

          {(fieldData.type === "select" || fieldData.type === "checkbox") && (
            <div>
              <Label>Options</Label>
              <div className="space-y-2 mt-2">
                {fieldData.options?.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={option} readOnly />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveOption(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={optionText}
                    onChange={(e) => setOptionText(e.target.value)}
                    placeholder="Add option..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                  />
                  <Button onClick={handleAddOption} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Field</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

