import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GoogleSheetsField {
  name: string;
  type?: string;
}

interface FieldMapping {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  expectedSalary?: string;
  experienceYears?: string;
  skills?: string;
  status?: string;
  jobTitle?: string;
}

interface GoogleSheetsFieldMappingProps {
  integration: any;
  onSave: (mappings: { sheetName?: string; fieldMappings?: FieldMapping }) => void;
}

const HIREOS_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "location", label: "Location", required: false },
  { key: "expectedSalary", label: "Expected Salary", required: false },
  { key: "experienceYears", label: "Experience Years", required: false },
  { key: "skills", label: "Skills", required: false },
  { key: "status", label: "Status", required: false },
  { key: "jobTitle", label: "Job Title", required: false },
];

export default function GoogleSheetsFieldMapping({
  integration,
  onSave,
}: GoogleSheetsFieldMappingProps) {
  const { toast } = useToast();
  const credentials = integration?.credentials || {};
  const [fieldMappings, setFieldMappings] = useState<FieldMapping>(
    credentials.fieldMappings || {}
  );
  const [sheetName, setSheetName] = useState(credentials.sheetName || "Sheet1");

  // Fetch Google Sheets schema (headers/columns)
  const {
    data: schema,
    isLoading: isLoadingSchema,
    refetch: refetchSchema,
    error: schemaError,
  } = useQuery<{ fields: GoogleSheetsField[] }>({
    queryKey: ["/api/crm-integrations/google-sheets/schema"],
    enabled: !!credentials.accessToken && !!credentials.spreadsheetId,
    retry: false,
  });

  const handleFieldMappingChange = (hireOSField: string, googleSheetsField: string) => {
    setFieldMappings((prev) => ({
      ...prev,
      [hireOSField]: googleSheetsField || undefined,
    }));
  };

  const handleSave = () => {
    onSave({
      sheetName,
      fieldMappings,
    });
    toast({
      title: "Field mappings saved",
      description: "Your Google Sheets field mappings have been updated.",
    });
  };

  const availableFields = schema?.fields || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Field Mapping</h4>
          <p className="text-xs text-slate-500 mt-1">
            Map HireOS fields to your Google Sheets column headers.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchSchema()}
          disabled={isLoadingSchema || !credentials.accessToken || !credentials.spreadsheetId}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingSchema ? 'animate-spin' : ''}`} />
          Refresh Schema
        </Button>
      </div>

      {!credentials.accessToken && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please connect your Google Sheets account first.
          </AlertDescription>
        </Alert>
      )}

      {!credentials.spreadsheetId && credentials.accessToken && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please configure your Spreadsheet ID in the connection settings.
          </AlertDescription>
        </Alert>
      )}

      {credentials.accessToken && credentials.spreadsheetId && (
        <>
          <div>
            <Label htmlFor="sheet-name">Sheet Name</Label>
            <Input
              id="sheet-name"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Sheet1"
            />
            <p className="text-xs text-slate-500 mt-1">
              The name of the sheet/tab in your spreadsheet. Defaults to "Sheet1".
            </p>
          </div>

          {isLoadingSchema ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-600">Loading sheet headers...</span>
            </div>
          ) : schemaError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load sheet headers. Make sure your Spreadsheet ID is correct and the sheet exists.
              </AlertDescription>
            </Alert>
          ) : availableFields.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No columns found in the sheet. Make sure the first row contains headers.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {HIREOS_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-32 text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </div>
                  <div className="flex-1">
                    <Select
                      value={fieldMappings[field.key as keyof FieldMapping] || ""}
                      onValueChange={(value) =>
                        handleFieldMappingChange(field.key, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFields.map((gsField) => (
                          <SelectItem key={gsField.name} value={gsField.name}>
                            {gsField.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isLoadingSchema}>
              Save Field Mappings
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

