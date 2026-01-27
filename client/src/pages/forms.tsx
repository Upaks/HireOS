import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Settings2, Trash2, Copy } from "lucide-react";
import type { FormTemplate } from "@/components/forms/form-builder";

export default function Forms() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/form-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Form deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to delete form", description: e.message, variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/form-templates/${id}/duplicate`);
      return res.json();
    },
    onSuccess: (data: FormTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      toast({ title: "Form duplicated" });
      setLocation(`/forms/${data.id}/edit`);
    },
    onError: (e: Error) => {
      toast({ title: "Failed to duplicate form", description: e.message, variant: "destructive" });
    },
  });

  const handleCreate = () => setLocation("/forms/new");
  const handleEdit = (t: FormTemplate) => setLocation(`/forms/${t.id}/edit`);
  const handleDuplicate = (e: React.MouseEvent, t: FormTemplate) => {
    e.stopPropagation();
    duplicateMutation.mutate(t.id);
  };
  const handleDelete = (e: React.MouseEvent, t: FormTemplate) => {
    e.stopPropagation();
    if (!confirm(`Delete "${t.name}"?`)) return;
    deleteMutation.mutate(t.id);
  };

  return (
    <AppShell>
      <TopBar title="Application Forms" />

      <div className="bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Application Forms</h1>
            <p className="text-sm text-slate-500 mt-1">
              Create and customize application forms for job postings
            </p>
          </div>
          <Button onClick={handleCreate} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            New Form
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              Loading…
            </CardContent>
          </Card>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">No forms yet</h4>
                <p className="text-sm text-slate-500 mb-6">
                  Create your first form to get started. Design application forms with drag-and-drop
                  fields and form-level settings.
                </p>
                <Button onClick={handleCreate} size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Form
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Card
                key={t.id}
                className="cursor-pointer transition-all hover:shadow-md"
                onClick={() => handleEdit(t)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    {t.isDefault && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">Default</Badge>
                    )}
                  </div>
                  {t.description && (
                    <CardDescription className="mt-2 line-clamp-2">{t.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <FileText className="h-4 w-4" />
                      <span>
                        {(Array.isArray(t.fields) ? t.fields : []).length} field
                        {(Array.isArray(t.fields) ? t.fields : []).length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(t);
                        }}
                        title="Edit"
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDuplicate(e, t)}
                        disabled={duplicateMutation.isPending}
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {!t.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(e, t)}
                          disabled={deleteMutation.isPending}
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
