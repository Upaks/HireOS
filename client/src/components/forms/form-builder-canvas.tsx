import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
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
  Link as LinkIcon,
  Clock,
  GripVertical,
  Trash2,
  Copy,
  Paperclip,
  MessageSquare,
  Bell,
  ExternalLink,
  Palette,
  Settings,
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
import {
  type FieldType,
  type FormField,
  FIELD_TYPE_ICONS,
  FIELD_TYPE_LABELS,
} from "./form-builder";

const CREATE_FIELD_TYPES: FieldType[] = [
  "date",
  "time",
  "select",
  "text",
  "textarea",
  "number",
  "email",
  "phone",
  "checkbox",
  "file",
  "radio",
  "multiselect",
  "url",
  "datetime",
  "rating",
  "scale",
  "section",
  "pagebreak",
];

export interface FormSettings {
  allowAttachments?: boolean;
  allowComments?: boolean;
  successMessage?: string;
  redirectUrl?: string;
  expiryDate?: string;
  submissionLimit?: number | null;
  notifyOnSubmit?: boolean;
  themePreset?: "default" | "minimal" | "professional" | "warm";
  accentColor?: string;
  colorMode?: "light" | "dark" | "system";
  fontFamily?: "system" | "serif" | "sans" | "mono";
  borderRadius?: "sharp" | "default" | "rounded";
}

interface FormBuilderCanvasProps {
  name: string;
  description: string;
  fields: FormField[];
  settings: FormSettings;
  isNew: boolean;
  previewOnly?: boolean;
  onChange: () => void;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onFieldsChange: (f: FormField[]) => void;
  onSettingsChange: (s: FormSettings) => void;
  templateId?: number | null;
}

function makeField(type: FieldType): FormField {
  return {
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    label: type === "section" ? "New Section" : type === "pagebreak" ? "New Page" : "New Field",
    placeholder: type === "section" || type === "pagebreak" ? undefined : "Enter value...",
    required: false,
    options: ["select", "multiselect", "radio", "checkbox"].includes(type) ? ["Option 1", "Option 2"] : undefined,
    settings:
      type === "rating"
        ? { min: 1, max: 5 }
        : type === "scale"
        ? { min: 0, max: 10, step: 1 }
        : type === "textarea"
        ? { rows: 4 }
        : type === "file"
        ? { allowMultiple: false, accept: "*/*" }
        : undefined,
  };
}

export default function FormBuilderCanvas({
  name,
  description,
  fields,
  settings,
  isNew,
  previewOnly,
  onChange,
  onNameChange,
  onDescriptionChange,
  onFieldsChange,
  onSettingsChange,
  templateId,
}: FormBuilderCanvasProps) {
  const { toast } = useToast();
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [fieldTab, setFieldTab] = useState<"basic" | "advanced">("basic");
  const [formSettingsTab, setFormSettingsTab] = useState<"general" | "theme">("general");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: linkedJobs = [] } = useQuery<{ id: number; title: string }[]>({
    queryKey: [`/api/form-templates/${templateId}/jobs`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/form-templates/${templateId}/jobs`);
      return res.json();
    },
    enabled: !!templateId && !previewOnly,
  });

  const selectedField = selectedFieldId ? fields.find((f) => f.id === selectedFieldId) : null;

  const handleAddField = (type: FieldType) => {
    const next = makeField(type);
    onFieldsChange([...fields, next]);
    setSelectedFieldId(next.id);
    setFieldTab("basic");
    onChange();
  };

  const handleEditField = (field: FormField) => {
    setSelectedFieldId(field.id);
    setFieldTab("basic");
  };

  const handleUpdateField = (updates: Partial<FormField>) => {
    if (!selectedFieldId) return;
    onFieldsChange(
      fields.map((f) => (f.id === selectedFieldId ? { ...f, ...updates } : f))
    );
    onChange();
  };

  const handleDeleteField = (id: string) => {
    onFieldsChange(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
    toast({ title: "Field removed" });
    onChange();
  };

  const handleDuplicateField = (field: FormField) => {
    const dup: FormField = {
      ...field,
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      label: `${field.label} (Copy)`,
    };
    const idx = fields.findIndex((f) => f.id === field.id);
    const next = [...fields];
    next.splice(idx + 1, 0, dup);
    onFieldsChange(next);
    setSelectedFieldId(dup.id);
    toast({ title: "Field duplicated" });
    onChange();
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = fields.findIndex((f) => f.id === active.id);
    const newIdx = fields.findIndex((f) => f.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onFieldsChange(arrayMove(fields, oldIdx, newIdx));
    onChange();
  };

  const updateSettings = (patch: Partial<FormSettings>) => {
    onSettingsChange({ ...settings, ...patch });
    onChange();
  };

  if (previewOnly) {
    return (
      <div className="p-6">
        <div className="max-w-xl mx-auto space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{name || "Form"}</h2>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fields yet.</p>
          ) : (
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.id} className="space-y-2">
                  <Label>
                    {f.label}
                    {f.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                  {f.type === "text" && <Input placeholder={f.placeholder} disabled className="bg-muted" />}
                  {f.type === "email" && <Input type="email" placeholder={f.placeholder} disabled className="bg-muted" />}
                  {f.type === "textarea" && <Textarea placeholder={f.placeholder} disabled rows={f.settings?.rows ?? 4} className="bg-muted" />}
                  {f.type === "file" && (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    </div>
                  )}
                  {!["text", "email", "textarea", "file", "section", "pagebreak"].includes(f.type) && (
                    <Input placeholder={f.placeholder || f.label} disabled className="bg-muted" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] h-full overflow-hidden">
      {/* Left: Create a field */}
      <div className="border-r bg-white overflow-y-auto shrink-0">
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Create a field</h3>
            <p className="text-xs text-slate-500 mt-1">Click a type to add it to your form.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CREATE_FIELD_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleAddField(type)}
                className="flex flex-col items-center justify-center p-3 rounded-lg border bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                <span className="text-slate-500 mb-1">{FIELD_TYPE_ICONS[type]}</span>
                <span className="text-xs font-medium text-slate-700 text-center leading-tight">
                  {FIELD_TYPE_LABELS[type]}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">Click to add. Drag to reorder in the canvas.</p>
        </div>
      </div>

      {/* Center: Canvas */}
      <div className="flex flex-col min-w-0 overflow-y-auto bg-slate-50/50">
        <div className="p-6 space-y-4">
          <div>
            <Label className="text-xs text-slate-500">Form name</Label>
            <Input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter form name"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Enter form description"
              className="mt-1"
            />
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Fields</h4>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {fields.map((field) => (
                    <SortableFieldRow
                      key={field.id}
                      field={field}
                      isSelected={selectedFieldId === field.id}
                      onSelect={() => handleEditField(field)}
                      onDelete={() => handleDeleteField(field.id)}
                      onDuplicate={() => handleDuplicateField(field)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="mt-4 py-8 border-2 border-dashed border-slate-200 rounded-lg bg-white flex items-center justify-center">
              <p className="text-sm text-slate-500">Drag and drop fields here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form settings or Field settings */}
      <div className="border-l bg-white overflow-hidden flex flex-col shrink-0">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {selectedField ? (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Field settings</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedField.label}</p>
                </div>
                <Tabs value={fieldTab} onValueChange={(v) => setFieldTab(v as "basic" | "advanced")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div>
                      <Label>Label</Label>
                      <Input
                        value={selectedField.label}
                        onChange={(e) => handleUpdateField({ label: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    {selectedField.type !== "section" && selectedField.type !== "pagebreak" && (
                      <>
                        <div>
                          <Label>Placeholder</Label>
                          <Input
                            value={selectedField.placeholder ?? ""}
                            onChange={(e) => handleUpdateField({ placeholder: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Default value</Label>
                          <Input
                            value={selectedField.defaultValue ?? ""}
                            onChange={(e) => handleUpdateField({ defaultValue: e.target.value })}
                            placeholder="Optional"
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Required</Label>
                          <Switch
                            checked={selectedField.required}
                            onCheckedChange={(c) => handleUpdateField({ required: c })}
                          />
                        </div>
                      </>
                    )}
                    {["select", "multiselect", "radio", "checkbox"].includes(selectedField.type) && (
                      <div>
                        <Label>Options (one per line)</Label>
                        <Textarea
                          value={(selectedField.options ?? []).join("\n")}
                          onChange={(e) =>
                            handleUpdateField({
                              options: e.target.value.split("\n").filter(Boolean),
                            })
                          }
                          rows={4}
                          className="mt-1 font-mono text-sm"
                        />
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="advanced" className="space-y-4 mt-4">
                    <div>
                      <Label>Help text / Description</Label>
                      <Textarea
                        value={selectedField.description ?? ""}
                        onChange={(e) => handleUpdateField({ description: e.target.value })}
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    {selectedField.type === "file" && (
                      <>
                        <div className="flex items-center justify-between">
                          <Label>Allow multiple files</Label>
                          <Switch
                            checked={selectedField.settings?.allowMultiple ?? false}
                            onCheckedChange={(c) =>
                              handleUpdateField({
                                settings: { ...selectedField.settings, allowMultiple: c },
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Accepted types (e.g. image/*, .pdf)</Label>
                          <Input
                            value={selectedField.settings?.accept ?? ""}
                            onChange={(e) =>
                              handleUpdateField({
                                settings: { ...selectedField.settings, accept: e.target.value },
                              })
                            }
                            className="mt-1"
                          />
                        </div>
                      </>
                    )}
                    {selectedField.type === "textarea" && (
                      <div>
                        <Label>Rows</Label>
                        <Input
                          type="number"
                          min={2}
                          max={20}
                          value={selectedField.settings?.rows ?? 4}
                          onChange={(e) =>
                            handleUpdateField({
                              settings: { ...selectedField.settings, rows: parseInt(e.target.value) || 4 },
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                    )}
                    {selectedField.type !== "section" && selectedField.type !== "pagebreak" && (
                      <div>
                        <Label>Width</Label>
                        <select
                          value={selectedField.settings?.width ?? "full"}
                          onChange={(e) =>
                            handleUpdateField({
                              settings: {
                                ...selectedField.settings,
                                width: e.target.value as "full" | "half",
                              },
                            })
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="full">Full</option>
                          <option value="half">Half</option>
                        </select>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedFieldId(null)}>
                    Done
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteField(selectedField.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Form settings</h3>
                  <p className="text-xs text-slate-500 mt-1">Form-level options</p>
                </div>
                <Tabs value={formSettingsTab} onValueChange={(v) => setFormSettingsTab(v as "general" | "theme")} className="mt-2">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="general" className="gap-1.5">
                      <Settings className="h-3.5 w-3" />
                      General
                    </TabsTrigger>
                    <TabsTrigger value="theme" className="gap-1.5">
                      <Palette className="h-3.5 w-3" />
                      Theme
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="general" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-slate-500" />
                        <div>
                          <Label>Allow attachments</Label>
                          <p className="text-xs text-slate-500">Resume, documents, etc.</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.allowAttachments ?? false}
                        onCheckedChange={(c) => updateSettings({ allowAttachments: c })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-slate-500" />
                        <div>
                          <Label>Allow comments</Label>
                          <p className="text-xs text-slate-500">Applicant comments</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.allowComments ?? false}
                        onCheckedChange={(c) => updateSettings({ allowComments: c })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-slate-500" />
                        <div>
                          <Label>Notify on submit</Label>
                          <p className="text-xs text-slate-500">Email when someone applies</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.notifyOnSubmit ?? false}
                        onCheckedChange={(c) => updateSettings({ notifyOnSubmit: c })}
                      />
                    </div>
                    <Separator />
                    <div>
                      <Label>Success message</Label>
                      <Textarea
                        value={settings.successMessage ?? ""}
                        onChange={(e) => updateSettings({ successMessage: e.target.value })}
                        placeholder="e.g. Thanks! We'll be in touch."
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Redirect URL (optional)</Label>
                      <Input
                        value={settings.redirectUrl ?? ""}
                        onChange={(e) => updateSettings({ redirectUrl: e.target.value })}
                        placeholder="https://..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Expiry date (optional)</Label>
                      <Input
                        type="date"
                        value={settings.expiryDate ?? ""}
                        onChange={(e) => updateSettings({ expiryDate: e.target.value || undefined })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Submission limit (optional)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={settings.submissionLimit ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateSettings({
                            submissionLimit: v ? parseInt(v, 10) : null,
                          });
                        }}
                        placeholder="e.g. 100"
                        className="mt-1"
                      />
                    </div>
                    {linkedJobs.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <Label>Used by jobs</Label>
                          <div className="mt-2 space-y-1">
                            {linkedJobs.map((j) => (
                              <div
                                key={j.id}
                                className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-slate-50"
                              >
                                <span className="font-medium truncate">{j.title}</span>
                                <a
                                  href={`/apply/${j.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary shrink-0 ml-2"
                                  title="Open apply link"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            Share the apply link from each job. Assign this form in job settings.
                          </p>
                        </div>
                      </>
                    )}
                  </TabsContent>
                  <TabsContent value="theme" className="space-y-4 mt-4">
                    <p className="text-xs text-slate-500 bg-slate-50 rounded-md px-3 py-2">
                      Use “Preview form” in the top bar to see theme, color mode, accent, font, and border radius.
                    </p>
                    <div>
                      <Label>Theme preset</Label>
                      <select
                        value={settings.themePreset ?? "default"}
                        onChange={(e) =>
                          updateSettings({
                            themePreset: e.target.value as "default" | "minimal" | "professional" | "warm",
                          })
                        }
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="default">Default</option>
                        <option value="minimal">Minimal</option>
                        <option value="professional">Professional</option>
                        <option value="warm">Warm</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        Overall look of the form (typography, spacing).
                      </p>
                    </div>
                    <div>
                      <Label>Accent color</Label>
                      <div className="mt-1 flex gap-2">
                        <input
                          type="color"
                          value={settings.accentColor ?? "#0f172a"}
                          onChange={(e) => updateSettings({ accentColor: e.target.value })}
                          className="h-9 w-12 rounded border border-input cursor-pointer"
                        />
                        <Input
                          value={settings.accentColor ?? ""}
                          onChange={(e) => updateSettings({ accentColor: e.target.value })}
                          placeholder="#0f172a"
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Buttons, links, focus (hex).
                      </p>
                    </div>
                    <div>
                      <Label>Color mode</Label>
                      <select
                        value={settings.colorMode ?? "light"}
                        onChange={(e) =>
                          updateSettings({
                            colorMode: e.target.value as "light" | "dark" | "system",
                          })
                        }
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        How the form appears to applicants.
                      </p>
                    </div>
                    <div>
                      <Label>Font family</Label>
                      <select
                        value={settings.fontFamily ?? "system"}
                        onChange={(e) =>
                          updateSettings({
                            fontFamily: e.target.value as "system" | "serif" | "sans" | "mono",
                          })
                        }
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="system">System</option>
                        <option value="sans">Sans</option>
                        <option value="serif">Serif</option>
                        <option value="mono">Monospace</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        Typography for labels and inputs.
                      </p>
                    </div>
                    <div>
                      <Label>Border radius</Label>
                      <select
                        value={settings.borderRadius ?? "default"}
                        onChange={(e) =>
                          updateSettings({
                            borderRadius: e.target.value as "sharp" | "default" | "rounded",
                          })
                        }
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="sharp">Sharp</option>
                        <option value="default">Default</option>
                        <option value="rounded">Rounded</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        Corner rounding on inputs and buttons.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function SortableFieldRow({
  field,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group flex items-center gap-2 p-3 rounded-lg border bg-white transition-all cursor-pointer ${
        isSelected ? "ring-2 ring-primary border-primary" : "hover:border-slate-300"
      } ${isDragging ? "shadow-lg" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-slate-500 shrink-0">{FIELD_TYPE_ICONS[field.type]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{field.label}</p>
        <p className="text-xs text-slate-500 truncate">{FIELD_TYPE_LABELS[field.type]}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
