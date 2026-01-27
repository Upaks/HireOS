import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Download, Search } from "lucide-react";
import { useState, useMemo } from "react";

interface FormTemplate {
  id: number;
  name: string;
  description?: string;
}

interface Candidate {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  createdAt: string;
}

interface FormResponse {
  candidate: Candidate;
  jobTitle: string;
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return s;
  }
}

function exportToCsv(responses: FormResponse[]) {
  const headers = ["Name", "Email", "Job", "Submitted", "Status"];
  const rows = responses.map((r) => [
    r.candidate.name,
    r.candidate.email,
    r.jobTitle,
    formatDate(r.candidate.createdAt),
    r.candidate.status,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `form-responses-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FormResponsesPage() {
  const [, params] = useRoute("/forms/:id/responses");
  const [, setLocation] = useLocation();
  const formId = params?.id ? parseInt(params.id) : null;
  const [search, setSearch] = useState("");

  const { data: template, isLoading: loadingTemplate } = useQuery<FormTemplate>({
    queryKey: [`/api/form-templates/${formId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/form-templates/${formId!}`);
      return res.json();
    },
    enabled: !!formId,
  });

  const { data: responses = [], isLoading: loadingResponses } = useQuery<FormResponse[]>({
    queryKey: [`/api/form-templates/${formId}/responses`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/form-templates/${formId!}/responses`);
      return res.json();
    },
    enabled: !!formId,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return responses;
    const q = search.toLowerCase();
    return responses.filter(
      (r) =>
        r.candidate.name.toLowerCase().includes(q) ||
        r.candidate.email.toLowerCase().includes(q) ||
        r.jobTitle.toLowerCase().includes(q)
    );
  }, [responses, search]);

  const handleBack = () => setLocation(formId ? `/forms/${formId}/edit` : "/forms");

  if (!formId) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center">
        <p className="text-slate-600">Invalid form.</p>
      </div>
    );
  }

  const isLoading = loadingTemplate || loadingResponses;

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={handleBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to form</span>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              Responses {template ? `– ${template.name}` : ""}
            </h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              Submissions from applicants who used this form
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, job…"
              className="pl-8 w-48"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCsv(filtered)}
            disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Submissions</CardTitle>
              <CardDescription>
                {responses.length} response{responses.length !== 1 ? "s" : ""}
                {search.trim() && ` (${filtered.length} matching search)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="sm:hidden mb-4">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                />
              </div>
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  {responses.length === 0
                    ? "No submissions yet. Share the apply link from a job that uses this form."
                    : "No responses match your search."}
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((r) => (
                        <TableRow key={r.candidate.id}>
                          <TableCell className="font-medium">{r.candidate.name}</TableCell>
                          <TableCell>{r.candidate.email}</TableCell>
                          <TableCell>{r.jobTitle}</TableCell>
                          <TableCell>{formatDate(r.candidate.createdAt)}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {r.candidate.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
