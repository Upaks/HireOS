import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Save, Eye, ClipboardList } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import FormBuilderCanvas from "../components/forms/form-builder-canvas";
import { FormPreview } from "../components/forms/form-builder";
import type { FormTemplate, FormField } from "../components/forms/form-builder";
import type { FormSettings } from "../components/forms/form-builder-canvas";

export type { FormSettings };

export default function FormBuilderPage() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [, params] = useRoute("/forms/:id/edit");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = location === "/forms/new";
  const templateId = !isNew && params?.id ? parseInt(params.id) : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [settings, setSettings] = useState<FormSettings>({});
  const [showPreview, setShowPreview] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialLoadRef = useRef(false);

  const { data: template, isLoading } = useQuery<FormTemplate>({
    queryKey: [`/api/form-templates/${templateId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/form-templates/${templateId!}`);
      return res.json();
    },
    enabled: !!templateId,
  });

  useEffect(() => {
    if (!template || initialLoadRef.current) return;
    initialLoadRef.current = true;
    setName(template.name);
    setDescription(template.description ?? "");
    setFields(Array.isArray(template.fields) ? template.fields : []);
    setSettings((template as any).settings ?? {});
  }, [template]);

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/form-templates", payload);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Form created", description: "Your form has been saved." });
      setLocation(`/forms/${data.id}/edit`);
      setHasUnsavedChanges(false);
    },
    onError: (e: Error) => {
      toast({ title: "Failed to create form", description: e.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/form-templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      queryClient.invalidateQueries({ queryKey: [`/api/form-templates/${templateId}`] });
      toast({ title: "Form updated", description: "Your changes have been saved." });
      setHasUnsavedChanges(false);
    },
    onError: (e: Error) => {
      toast({ title: "Failed to update form", description: e.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Form name required", variant: "destructive" });
      return;
    }
    if (fields.length === 0) {
      toast({ title: "Add at least one field", variant: "destructive" });
      return;
    }
    const payload = { name, description, fields, settings, isDefault: false };
    if (isNew) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: templateId!, data: payload });
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges && !confirm("You have unsaved changes. Leave anyway?")) return;
    setLocation("/forms");
  };

  const handleChange = () => setHasUnsavedChanges(true);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (!isNew && isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="sm" onClick={handleBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {isNew ? "Create Form" : "Edit Form"}
            </h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              Design your application form
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); handleChange(); }}
            placeholder="Form name"
            className="w-40 sm:w-56"
          />
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            className="hidden sm:flex"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview form
          </Button>
          {templateId && (
            <Button
              variant="outline"
              onClick={() => setLocation(`/forms/${templateId}/responses`)}
              className="hidden sm:flex"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Responses
            </Button>
          )}
          <Button variant="outline" onClick={handleBack}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile: Preview + Responses in menu */}
      <div className="sm:hidden bg-white border-b px-4 py-2 flex gap-2">
        <Input
          value={name}
          onChange={(e) => { setName(e.target.value); handleChange(); }}
          placeholder="Form name"
          className="flex-1"
        />
        <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} title="Preview">
          <Eye className="h-4 w-4" />
        </Button>
        {templateId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/forms/${templateId}/responses`)}
            title="Responses"
          >
            <ClipboardList className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleBack}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden min-h-0">
        <FormBuilderCanvas
          name={name}
          description={description}
          fields={fields}
          settings={settings}
          isNew={isNew}
          templateId={templateId}
          onChange={handleChange}
          onNameChange={(v) => { setName(v); handleChange(); }}
          onDescriptionChange={(v) => { setDescription(v); handleChange(); }}
          onFieldsChange={(f) => { setFields(f); handleChange(); }}
          onSettingsChange={(s) => { setSettings(s); handleChange(); }}
        />
      </div>

      {/* Preview modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview form</DialogTitle>
            <DialogDescription>
              This is how applicants will see your form.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            <FormPreview
              fields={fields}
              name={name}
              description={description}
              theme={{
                themePreset: settings.themePreset,
                accentColor: settings.accentColor,
                colorMode: settings.colorMode,
                fontFamily: settings.fontFamily,
                borderRadius: settings.borderRadius,
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
