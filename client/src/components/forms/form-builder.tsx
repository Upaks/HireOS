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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  Copy,
  Eye,
  Settings2,
  Type,
  Mail,
  Phone,
  FileText,
  Hash,
  List,
  CheckSquare,
  Upload,
  Calendar,
  Star,
  Sliders,
  AlignLeft,
  Radio,
  Image as ImageIcon,
  Link as LinkIcon,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Enhanced field types
export type FieldType = 
  | "text" 
  | "email" 
  | "phone" 
  | "textarea" 
  | "number" 
  | "select" 
  | "multiselect"
  | "radio"
  | "checkbox" 
  | "file" 
  | "date"
  | "time"
  | "datetime"
  | "rating"
  | "scale"
  | "url"
  | "section"
  | "pagebreak";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select, multiselect, radio, checkbox
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  settings?: {
    allowMultiple?: boolean; // For file uploads
    accept?: string; // For file uploads (e.g., "image/*,application/pdf")
    min?: number; // For rating/scale
    max?: number; // For rating/scale
    step?: number; // For scale
    rows?: number; // For textarea
  };
}

export interface FormTemplate {
  id: number;
  name: string;
  description?: string;
  fields: FormField[];
  isDefault: boolean;
}

const DEFAULT_FIELDS: FormField[] = [
  { 
    id: "name", 
    type: "text", 
    label: "Full Name", 
    placeholder: "Enter your full name", 
    required: true 
  },
  { 
    id: "email", 
    type: "email", 
    label: "Email Address", 
    placeholder: "your.email@example.com", 
    required: true 
  },
  { 
    id: "phone", 
    type: "phone", 
    label: "Phone Number", 
    placeholder: "+1 (555) 123-4567", 
    required: false 
  },
  { 
    id: "resume", 
    type: "file", 
    label: "Resume", 
    required: true,
    settings: {
      allowMultiple: false,
      accept: "application/pdf,.doc,.docx"
    }
  },
];

const FIELD_TYPE_ICONS: Record<FieldType, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  phone: <Phone className="h-4 w-4" />,
  textarea: <AlignLeft className="h-4 w-4" />,
  number: <Hash className="h-4 w-4" />,
  select: <List className="h-4 w-4" />,
  multiselect: <List className="h-4 w-4" />,
  radio: <Radio className="h-4 w-4" />,
  checkbox: <CheckSquare className="h-4 w-4" />,
  file: <Upload className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  time: <Clock className="h-4 w-4" />,
  datetime: <Calendar className="h-4 w-4" />,
  rating: <Star className="h-4 w-4" />,
  scale: <Sliders className="h-4 w-4" />,
  url: <LinkIcon className="h-4 w-4" />,
  section: <FileText className="h-4 w-4" />,
  pagebreak: <FileText className="h-4 w-4" />,
};

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Short Text",
  email: "Email",
  phone: "Phone",
  textarea: "Long Text",
  number: "Number",
  select: "Dropdown",
  multiselect: "Multi-Select",
  radio: "Multiple Choice",
  checkbox: "Checkboxes",
  file: "File Upload",
  date: "Date",
  time: "Time",
  datetime: "Date & Time",
  rating: "Rating",
  scale: "Scale",
  url: "Website URL",
  section: "Section Divider",
  pagebreak: "Page Break",
};

export default function FormBuilder() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"builder" | "preview">("builder");
  const [showAddFieldMenu, setShowAddFieldMenu] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      if (selectedTemplate?.id === selectedTemplate?.id) {
        setSelectedTemplate(null);
        setFields(DEFAULT_FIELDS);
      }
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
    setActiveTab("builder");
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setTemplateName("");
    setTemplateDescription("");
    setFields(DEFAULT_FIELDS);
    setShowCreateDialog(true);
    setActiveTab("builder");
  };

  const handleAddField = (type: FieldType) => {
    const newField: FormField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      label: type === "section" ? "New Section" : type === "pagebreak" ? "New Page" : "New Field",
      placeholder: (type === "section" || type === "pagebreak") ? undefined : "Enter value...",
      required: false,
      options: (type === "select" || type === "multiselect" || type === "radio" || type === "checkbox") 
        ? ["Option 1", "Option 2"] 
        : undefined,
      settings: type === "rating" ? { min: 1, max: 5 } : 
                type === "scale" ? { min: 0, max: 10, step: 1 } :
                type === "textarea" ? { rows: 4 } :
                type === "file" ? { allowMultiple: false, accept: "*/*" } :
                undefined,
    };
    setEditingField(newField);
    setShowFieldDialog(true);
    setShowAddFieldMenu(false);
  };

  const handleEditField = (field: FormField) => {
    setEditingField({ ...field });
    setShowFieldDialog(true);
  };

  const handleDeleteField = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId));
    toast({
      title: "Field removed",
      description: "The field has been removed from your form.",
    });
  };

  const handleDuplicateField = (field: FormField) => {
    const duplicatedField: FormField = {
      ...field,
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: `${field.label} (Copy)`,
    };
    const fieldIndex = fields.findIndex(f => f.id === field.id);
    const newFields = [...fields];
    newFields.splice(fieldIndex + 1, 0, duplicatedField);
    setFields(newFields);
    toast({
      title: "Field duplicated",
      description: "The field has been duplicated.",
    });
  };

  const handleSaveField = (field: FormField) => {
    if (editingField && fields.some(f => f.id === editingField.id)) {
      // Update existing field
      setFields(fields.map((f) => (f.id === editingField.id ? field : f)));
    } else {
      // Add new field
      setFields([...fields, field]);
    }
    setEditingField(null);
    setShowFieldDialog(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
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

  const isEditing = selectedTemplate || showCreateDialog;

  return (
    <div className="space-y-6">
      {/* Template List */}
      {!isEditing && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Form Templates</h3>
              <p className="text-sm text-slate-500 mt-1">
                Create and manage application forms for job postings
              </p>
            </div>
            <Button onClick={handleCreateNew} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              New Form Template
            </Button>
          </div>

          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">No form templates yet</h4>
                  <p className="text-sm text-slate-500 mb-6">
                    Create your first form template to get started. Design beautiful application forms with drag-and-drop fields.
                  </p>
                  <Button onClick={handleCreateNew} size="lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const currentSelected = selectedTemplate as FormTemplate | null;
                const isSelected = currentSelected !== null && currentSelected.id === template.id;
                return (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? "ring-2 ring-primary shadow-md" : ""
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                  >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      {template.isDefault && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">Default</Badge>
                      )}
                    </div>
                    {template.description && (
                      <CardDescription className="mt-2">{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <FileText className="h-4 w-4" />
                        <span>{template.fields.length} field{template.fields.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTemplate(template);
                          }}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        {!template.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
                                deleteTemplateMutation.mutate(template.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Form Builder */}
      {isEditing && (
        <Card className="border-2">
          <CardHeader className="border-b bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  {selectedTemplate ? `Editing: ${selectedTemplate.name}` : "Create New Form Template"}
                </CardTitle>
                <CardDescription className="mt-1">
                  Build your form with drag-and-drop. Click any field to edit it.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setSelectedTemplate(null);
                    setFields(DEFAULT_FIELDS);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveTemplate} 
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  size="lg"
                >
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
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "builder" | "preview")} className="w-full">
              <div className="border-b px-6">
                <TabsList className="bg-transparent">
                  <TabsTrigger value="builder" className="data-[state=active]:bg-white">
                    <Settings2 className="mr-2 h-4 w-4" />
                    Builder
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="data-[state=active]:bg-white">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="builder" className="p-6 space-y-6 m-0">
                {/* Template Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template-name">Form Name *</Label>
                    <Input
                      id="template-name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., Software Developer Application"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-description">Description (Optional)</Label>
                    <Input
                      id="template-description"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Brief description of this form"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Separator />

                {/* Add Field Button */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Form Fields</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {fields.length} field{fields.length !== 1 ? "s" : ""} in this form
                    </p>
                  </div>
                  <div className="relative">
                    <Button 
                      onClick={() => setShowAddFieldMenu(!showAddFieldMenu)}
                      size="lg"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Field
                    </Button>
                    {showAddFieldMenu && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white border rounded-lg shadow-lg z-50 p-2">
                        <div className="grid grid-cols-2 gap-1">
                          {Object.entries(FIELD_TYPE_LABELS).map(([type, label]) => (
                            <button
                              key={type}
                              onClick={() => handleAddField(type as FieldType)}
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 rounded-md text-left transition-colors"
                            >
                              <span className="text-slate-500">{FIELD_TYPE_ICONS[type as FieldType]}</span>
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fields List with Drag and Drop */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={fields.map((f: FormField) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {fields.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50">
                          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                          <p className="text-sm text-slate-500 mb-2">No fields yet</p>
                          <p className="text-xs text-slate-400">Click "Add Field" to get started</p>
                        </div>
                      ) : (
                        fields.map((field) => (
                          <SortableFieldItem
                            key={field.id}
                            field={field}
                            onEdit={handleEditField}
                            onDelete={handleDeleteField}
                            onDuplicate={handleDuplicateField}
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </TabsContent>

              <TabsContent value="preview" className="p-6 m-0">
                <FormPreview fields={fields} />
              </TabsContent>
            </Tabs>
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

// Sortable Field Item Component
function SortableFieldItem({
  field,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  field: FormField;
  onEdit: (field: FormField) => void;
  onDelete: (fieldId: string) => void;
  onDuplicate: (field: FormField) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-3 p-4 border rounded-lg bg-white hover:shadow-md transition-all ${
        isDragging ? "shadow-lg border-primary" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-slate-500">{FIELD_TYPE_ICONS[field.type]}</div>
          <span className="font-semibold text-slate-900">{field.label}</span>
          <Badge variant="outline" className="text-xs">
            {FIELD_TYPE_LABELS[field.type]}
          </Badge>
          {field.required && (
            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
              Required
            </Badge>
          )}
        </div>
        {field.description && (
          <p className="text-xs text-slate-500 mb-2">{field.description}</p>
        )}
        {field.placeholder && field.type !== "section" && (
          <p className="text-xs text-slate-400 italic">"{field.placeholder}"</p>
        )}
        {field.options && field.options.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {field.options.slice(0, 3).map((opt, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {opt}
              </Badge>
            ))}
            {field.options.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{field.options.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(field)}
          className="h-8 w-8 p-0"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDuplicate(field)}
          className="h-8 w-8 p-0"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm(`Delete "${field.label}"?`)) {
              onDelete(field.id);
            }
          }}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Form Preview Component
function FormPreview({ fields }: { fields: FormField[] }) {
  // Split fields into pages based on pagebreaks
  const pages = fields.reduce((acc: FormField[][], field) => {
    if (field.type === "pagebreak") {
      acc.push([]); // Start new page
    } else if (acc.length === 0) {
      acc.push([field]); // First page
    } else {
      acc[acc.length - 1].push(field); // Add to current page
    }
    return acc;
  }, []);

  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = pages.length || 1;
  const currentFields = pages[currentPage] || [];

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Form Preview</CardTitle>
              <CardDescription>
                This is how your form will appear to applicants
              </CardDescription>
            </div>
            {totalPages > 1 && (
              <div className="text-sm text-slate-600 font-medium">
                Page {currentPage + 1} of {totalPages}
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="mt-4">
              <div className="flex gap-1">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      idx === currentPage
                        ? "bg-primary"
                        : idx < currentPage
                        ? "bg-primary/50"
                        : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          {fields.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No fields yet. Add fields to see the preview.</p>
            </div>
          ) : (
            <>
              {currentFields.map((field) => (
                <FormFieldPreview key={field.id} field={field} />
              ))}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-slate-500">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                  >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
              {currentPage === totalPages - 1 && (
                <div className="pt-4">
                  <Button size="lg" className="w-full">
                    Submit Application
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Form Field Preview Component
function FormFieldPreview({ field }: { field: FormField }) {
  if (field.type === "section") {
    return (
      <div className="py-4">
        <Separator className="my-4" />
        <h3 className="text-lg font-semibold text-slate-900">{field.label}</h3>
        {field.description && (
          <p className="text-sm text-slate-500 mt-1">{field.description}</p>
        )}
        <Separator className="my-4" />
      </div>
    );
  }

  if (field.type === "pagebreak") {
    return (
      <div className="py-8 border-t-2 border-dashed border-slate-300 my-8">
        <div className="text-center">
          <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">Page Break</p>
          {field.label && field.label !== "New Page" && (
            <p className="text-xs text-slate-500 mt-1">{field.label}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.id} className="text-base">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {field.description && (
        <p className="text-sm text-slate-500">{field.description}</p>
      )}
      
      {field.type === "text" && (
        <Input
          id={field.id}
          placeholder={field.placeholder}
          disabled
          className="bg-slate-50"
        />
      )}
      
      {field.type === "email" && (
        <Input
          id={field.id}
          type="email"
          placeholder={field.placeholder}
          disabled
          className="bg-slate-50"
        />
      )}
      
      {field.type === "phone" && (
        <Input
          id={field.id}
          type="tel"
          placeholder={field.placeholder}
          disabled
          className="bg-slate-50"
        />
      )}
      
      {field.type === "textarea" && (
        <Textarea
          id={field.id}
          placeholder={field.placeholder}
          disabled
          rows={field.settings?.rows || 4}
          className="bg-slate-50"
        />
      )}
      
      {field.type === "number" && (
        <Input
          id={field.id}
          type="number"
          placeholder={field.placeholder}
          disabled
          className="bg-slate-50"
        />
      )}
      
      {field.type === "select" && (
        <Select disabled>
          <SelectTrigger className="bg-slate-50">
            <SelectValue placeholder={field.placeholder || "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt, idx) => (
              <SelectItem key={idx} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      
      {field.type === "multiselect" && (
        <div className="space-y-2">
          {field.options?.map((opt, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <Checkbox id={`${field.id}-${idx}`} disabled />
              <Label htmlFor={`${field.id}-${idx}`} className="font-normal cursor-not-allowed">
                {opt}
              </Label>
            </div>
          ))}
        </div>
      )}
      
      {field.type === "radio" && (
        <div className="space-y-2">
          {field.options?.map((opt, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <input
                type="radio"
                id={`${field.id}-${idx}`}
                name={field.id}
                disabled
                className="h-4 w-4 text-primary"
              />
              <Label htmlFor={`${field.id}-${idx}`} className="font-normal cursor-not-allowed">
                {opt}
              </Label>
            </div>
          ))}
        </div>
      )}
      
      {field.type === "checkbox" && (
        <div className="space-y-2">
          {field.options?.map((opt, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <Checkbox id={`${field.id}-${idx}`} disabled />
              <Label htmlFor={`${field.id}-${idx}`} className="font-normal cursor-not-allowed">
                {opt}
              </Label>
            </div>
          ))}
        </div>
      )}
      
      {field.type === "file" && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center bg-slate-50">
          <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            {field.placeholder || "Click to upload or drag and drop"}
          </p>
          {field.settings?.accept && (
            <p className="text-xs text-slate-400 mt-1">
              Accepted: {field.settings.accept}
            </p>
          )}
        </div>
      )}
      
      {field.type === "date" && (
        <Input
          id={field.id}
          type="date"
          disabled
          className="bg-slate-50"
        />
      )}
      
      {field.type === "time" && (
        <Input
          id={field.id}
          type="time"
          disabled
          className="bg-slate-50"
        />
      )}
      
      {field.type === "datetime" && (
        <Input
          id={field.id}
          type="datetime-local"
          disabled
          className="bg-slate-50"
        />
      )}
      
      {field.type === "rating" && (
        <div className="flex items-center gap-2">
          {Array.from({ length: field.settings?.max || 5 }).map((_, idx) => (
            <Star
              key={idx}
              className={`h-6 w-6 ${
                idx < (field.settings?.min || 0)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-slate-300"
              }`}
            />
          ))}
        </div>
      )}
      
      {field.type === "scale" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{field.settings?.min || 0}</span>
            <span>{field.settings?.max || 10}</span>
          </div>
          <input
            type="range"
            min={field.settings?.min || 0}
            max={field.settings?.max || 10}
            step={field.settings?.step || 1}
            disabled
            className="w-full"
          />
        </div>
      )}
      
      {field.type === "url" && (
        <Input
          id={field.id}
          type="url"
          placeholder={field.placeholder || "https://example.com"}
          disabled
          className="bg-slate-50"
        />
      )}
    </div>
  );
}

// Enhanced Field Editor Dialog
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
    setOptionText("");
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

  const handleUpdateOption = (index: number, value: string) => {
    setFieldData({
      ...fieldData,
      options: fieldData.options?.map((opt, i) => (i === index ? value : opt)),
    });
  };

  const handleSave = () => {
    if (!fieldData.label.trim()) {
      return;
    }
    onSave(fieldData);
  };

  const needsOptions = ["select", "multiselect", "radio", "checkbox"].includes(fieldData.type);
  const needsSettings = ["file", "rating", "scale", "textarea"].includes(fieldData.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Configure Field</DialogTitle>
          <DialogDescription>
            Customize this field's properties and validation rules
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Field Type */}
          <div>
            <Label htmlFor="field-type">Field Type</Label>
            <Select
              value={fieldData.type}
              onValueChange={(value: FieldType) => {
                const newField: FormField = {
                  ...fieldData,
                  type: value,
                  options: (value === "select" || value === "multiselect" || value === "radio" || value === "checkbox")
                    ? fieldData.options || ["Option 1", "Option 2"]
                    : undefined,
                  settings: value === "rating" ? { min: 1, max: 5 } :
                            value === "scale" ? { min: 0, max: 10, step: 1 } :
                            value === "textarea" ? { rows: 4 } :
                            value === "file" ? { allowMultiple: false, accept: "*/*" } :
                            undefined,
                };
                setFieldData(newField);
              }}
            >
              <SelectTrigger id="field-type" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Short Text</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="textarea">Long Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="url">Website URL</SelectItem>
                <SelectItem value="select">Dropdown</SelectItem>
                <SelectItem value="multiselect">Multi-Select</SelectItem>
                <SelectItem value="radio">Multiple Choice</SelectItem>
                <SelectItem value="checkbox">Checkboxes</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="time">Time</SelectItem>
                <SelectItem value="datetime">Date & Time</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
                <SelectItem value="file">File Upload</SelectItem>
                <SelectItem value="section">Section Divider</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Field Label */}
          <div>
            <Label htmlFor="field-label">Field Label *</Label>
            <Input
              id="field-label"
              value={fieldData.label}
              onChange={(e) => setFieldData({ ...fieldData, label: e.target.value })}
              placeholder="e.g., Full Name"
              className="mt-1"
            />
          </div>

          {/* Field Description */}
          <div>
            <Label htmlFor="field-description">Help Text / Description (Optional)</Label>
            <Textarea
              id="field-description"
              value={fieldData.description || ""}
              onChange={(e) => setFieldData({ ...fieldData, description: e.target.value })}
              placeholder="Additional information or instructions for this field"
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Placeholder (if not section or pagebreak) */}
          {fieldData.type !== "section" && fieldData.type !== "pagebreak" && (
            <div>
              <Label htmlFor="field-placeholder">Placeholder Text (Optional)</Label>
              <Input
                id="field-placeholder"
                value={fieldData.placeholder || ""}
                onChange={(e) => setFieldData({ ...fieldData, placeholder: e.target.value })}
                placeholder="e.g., Enter your name"
                className="mt-1"
              />
            </div>
          )}

          {/* Required Toggle */}
          {fieldData.type !== "section" && fieldData.type !== "pagebreak" && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="field-required" className="text-base font-medium">
                  Required Field
                </Label>
                <p className="text-sm text-slate-500 mt-1">
                  Applicants must fill this field to submit the form
                </p>
              </div>
              <Switch
                id="field-required"
                checked={fieldData.required}
                onCheckedChange={(checked) =>
                  setFieldData({ ...fieldData, required: checked })
                }
              />
            </div>
          )}

          {/* Options (for select, multiselect, radio, checkbox) */}
          {needsOptions && (
            <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Options</Label>
                <span className="text-xs text-slate-500">
                  {fieldData.options?.length || 0} option{(fieldData.options?.length || 0) !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {fieldData.options?.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => handleUpdateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOption(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={optionText}
                    onChange={(e) => setOptionText(e.target.value)}
                    placeholder="Add new option..."
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

          {/* Field Settings */}
          {needsSettings && (
            <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
              <Label className="text-base font-medium">Field Settings</Label>
              
              {fieldData.type === "textarea" && (
                <div>
                  <Label htmlFor="textarea-rows">Number of Rows</Label>
                  <Input
                    id="textarea-rows"
                    type="number"
                    min={2}
                    max={20}
                    value={fieldData.settings?.rows || 4}
                    onChange={(e) =>
                      setFieldData({
                        ...fieldData,
                        settings: { ...fieldData.settings, rows: parseInt(e.target.value) || 4 },
                      })
                    }
                    className="mt-1"
                  />
                </div>
              )}

              {fieldData.type === "file" && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="file-multiple">Allow Multiple Files</Label>
                      <p className="text-xs text-slate-500 mt-1">
                        Let applicants upload more than one file
                      </p>
                    </div>
                    <Switch
                      id="file-multiple"
                      checked={fieldData.settings?.allowMultiple || false}
                      onCheckedChange={(checked) =>
                        setFieldData({
                          ...fieldData,
                          settings: { ...fieldData.settings, allowMultiple: checked },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="file-accept">Accepted File Types</Label>
                    <Input
                      id="file-accept"
                      value={fieldData.settings?.accept || "*/*"}
                      onChange={(e) =>
                        setFieldData({
                          ...fieldData,
                          settings: { ...fieldData.settings, accept: e.target.value },
                        })
                      }
                      placeholder="e.g., image/*,application/pdf"
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Use MIME types (e.g., image/*, application/pdf) or leave as */* for all files
                    </p>
                  </div>
                </>
              )}

              {fieldData.type === "rating" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rating-min">Minimum Stars</Label>
                    <Input
                      id="rating-min"
                      type="number"
                      min={1}
                      max={10}
                      value={fieldData.settings?.min || 1}
                      onChange={(e) =>
                        setFieldData({
                          ...fieldData,
                          settings: { ...fieldData.settings, min: parseInt(e.target.value) || 1 },
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rating-max">Maximum Stars</Label>
                    <Input
                      id="rating-max"
                      type="number"
                      min={1}
                      max={10}
                      value={fieldData.settings?.max || 5}
                      onChange={(e) =>
                        setFieldData({
                          ...fieldData,
                          settings: { ...fieldData.settings, max: parseInt(e.target.value) || 5 },
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {fieldData.type === "scale" && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="scale-min">Minimum</Label>
                      <Input
                        id="scale-min"
                        type="number"
                        value={fieldData.settings?.min || 0}
                        onChange={(e) =>
                          setFieldData({
                            ...fieldData,
                            settings: { ...fieldData.settings, min: parseInt(e.target.value) || 0 },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="scale-max">Maximum</Label>
                      <Input
                        id="scale-max"
                        type="number"
                        value={fieldData.settings?.max || 10}
                        onChange={(e) =>
                          setFieldData({
                            ...fieldData,
                            settings: { ...fieldData.settings, max: parseInt(e.target.value) || 10 },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="scale-step">Step</Label>
                      <Input
                        id="scale-step"
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={fieldData.settings?.step || 1}
                        onChange={(e) =>
                          setFieldData({
                            ...fieldData,
                            settings: { ...fieldData.settings, step: parseFloat(e.target.value) || 1 },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Validation Rules */}
          {fieldData.type !== "section" && fieldData.type !== "pagebreak" && (
            <div className="space-y-3 p-4 border rounded-lg">
              <Label className="text-base font-medium">Validation Rules (Optional)</Label>
              
              {fieldData.type === "number" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="validation-min">Minimum Value</Label>
                    <Input
                      id="validation-min"
                      type="number"
                      value={fieldData.validation?.min || ""}
                      onChange={(e) =>
                        setFieldData({
                          ...fieldData,
                          validation: {
                            ...fieldData.validation,
                            min: e.target.value ? parseFloat(e.target.value) : undefined,
                          },
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="validation-max">Maximum Value</Label>
                    <Input
                      id="validation-max"
                      type="number"
                      value={fieldData.validation?.max || ""}
                      onChange={(e) =>
                        setFieldData({
                          ...fieldData,
                          validation: {
                            ...fieldData.validation,
                            max: e.target.value ? parseFloat(e.target.value) : undefined,
                          },
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {(fieldData.type === "text" || fieldData.type === "textarea" || fieldData.type === "email") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="validation-minlength">Minimum Length</Label>
                    <Input
                      id="validation-minlength"
                      type="number"
                      min={0}
                      value={fieldData.validation?.minLength || ""}
                      onChange={(e) =>
                        setFieldData({
                          ...fieldData,
                          validation: {
                            ...fieldData.validation,
                            minLength: e.target.value ? parseInt(e.target.value) : undefined,
                          },
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="validation-maxlength">Maximum Length</Label>
                    <Input
                      id="validation-maxlength"
                      type="number"
                      min={0}
                      value={fieldData.validation?.maxLength || ""}
                      onChange={(e) =>
                        setFieldData({
                          ...fieldData,
                          validation: {
                            ...fieldData.validation,
                            maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                          },
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!fieldData.label.trim()}>
            Save Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
