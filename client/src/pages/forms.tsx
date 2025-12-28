import AppShell from "@/components/layout/app-shell";
import TopBar from "@/components/layout/top-bar";
import FormBuilder from "@/components/forms/form-builder";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Forms() {
  return (
    <AppShell>
      <TopBar title="Application Forms" />
      
      <div className="bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Application Forms</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and customize application forms for job postings
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Form Builder</CardTitle>
            <CardDescription>
              Design custom application forms with drag-and-drop fields, validation rules, and conditional logic
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormBuilder />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

