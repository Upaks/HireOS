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

interface AirtableField {
  id?: string;
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
  interviewDate?: string;
  score?: string;
  communicationSkills?: string;
  culturalFit?: string;
  finalDecisionStatus?: string;
}

interface AirtableFieldMappingProps {
  integration: any;
  onSave: (mappings: { tableName?: string; fieldMappings?: FieldMapping }) => void;
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
  { key: "interviewDate", label: "Interview Date", required: false },
  { key: "score", label: "Score", required: false },
  { key: "communicationSkills", label: "Communication Skills", required: false },
  { key: "culturalFit", label: "Cultural Fit", required: false },
  { key: "finalDecisionStatus", label: "Final Decision Status", required: false },
];

const DEFAULT_FIELD_NAMES: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  location: "Location",
  expectedSalary: "Expected Salary",
  experienceYears: "Experience Years",
  skills: "Skills",
  status: "Status",
  jobTitle: "Job Title",
  interviewDate: "Interview Date",
  score: "Score",
  communicationSkills: "Communication Skills",
  culturalFit: "Cultural Fit",
  finalDecisionStatus: "Final Decision Status",
};

export default function AirtableFieldMapping({ integration, onSave }: AirtableFieldMappingProps) {
  const { toast } = useToast();
  const [tableName, setTableName] = useState(integration?.credentials?.tableName || "Candidates");
  
  // Initialize fieldMappings - use saved mappings if they exist
  // If schema is loaded and we have defaults, pre-populate with matching fields
  const [fieldMappings, setFieldMappings] = useState<FieldMapping>(
    integration?.credentials?.fieldMappings || {}
  );

  // Fetch Airtable table schema - auto-load if credentials exist
  const { data: schema, refetch: refetchSchema, isLoading: isLoadingSchemaQuery } = useQuery<{ tableName: string; fields: AirtableField[] }>({
    queryKey: ['/api/crm-integrations/airtable/schema'],
    enabled: !!(integration?.credentials?.apiKey && integration?.credentials?.baseId && tableName), // Auto-load if credentials exist
    retry: false,
  });

  // When schema loads, auto-populate defaults if mappings are empty
  useEffect(() => {
    if (schema?.fields && schema.fields.length > 0) {
      const hasExistingMappings = Object.keys(fieldMappings).length > 0;
      if (!hasExistingMappings) {
        const autoMappings: FieldMapping = {};
        for (const field of HIREOS_FIELDS) {
          const defaultName = DEFAULT_FIELD_NAMES[field.key];
          // Try to find exact match in schema
          const matchingField = schema.fields.find(f => 
            f.name === defaultName || 
            f.name.toLowerCase() === defaultName.toLowerCase()
          );
          if (matchingField) {
            autoMappings[field.key as keyof FieldMapping] = matchingField.name;
          }
        }
        if (Object.keys(autoMappings).length > 0) {
          setFieldMappings(autoMappings);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  const handleLoadSchema = async () => {
    if (!integration?.credentials?.apiKey || !integration?.credentials?.baseId) {
      toast({
        title: "Missing credentials",
        description: "Please connect your Airtable account first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update credentials with current table name before fetching schema
      await apiRequest("PATCH", `/api/crm-integrations/airtable`, {
        credentials: {
          ...integration.credentials,
          tableName,
        },
      });
      
      const result = await refetchSchema();
      const loadedSchema = result.data;
      toast({
        title: "Schema loaded",
        description: `Found ${loadedSchema?.fields?.length || 0} fields in table "${loadedSchema?.tableName || tableName}".`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to load schema",
        description: error.message || "Could not fetch Airtable table schema. Check your credentials and table name.",
        variant: "destructive",
      });
    }
  };

  const handleFieldMappingChange = (hireOSField: string, airtableField: string) => {
    setFieldMappings((prev) => ({
      ...prev,
      [hireOSField]: airtableField,
    }));
  };

  const handleSave = () => {
    // Validate required fields - check actual state
    const nameValue = fieldMappings.name?.trim();
    const emailValue = fieldMappings.email?.trim();
    
    if (!nameValue || !emailValue) {
      toast({
        title: "Missing required mappings",
        description: "Name and Email fields are required. Please select Airtable fields for these from the dropdowns.",
        variant: "destructive",
      });
      return;
    }

    // Save all mappings (including optional ones)
    onSave({
      tableName: tableName || "Candidates",
      fieldMappings,
    });
    
    toast({
      title: "Mappings saved",
      description: "Field mappings have been saved successfully.",
    });
  };

  const handleReset = () => {
    setTableName("Candidates");
    setFieldMappings({});
    toast({
      title: "Mappings reset",
      description: "Field mappings have been reset to defaults.",
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="table-name">Airtable Table Name</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="table-name"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="Candidates"
            className="flex-1"
          />
          <Button
            onClick={handleLoadSchema}
            disabled={isLoadingSchemaQuery || !integration?.credentials?.apiKey}
            variant="outline"
          >
            {isLoadingSchemaQuery ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Enter the name of your Airtable table (default: "Candidates")
        </p>
      </div>

      {schema && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Found <strong>{schema.fields.length}</strong> fields in table <strong>"{schema.tableName}"</strong>.
            Map your HireOS fields to Airtable fields below.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Field Mappings</h4>
          <Button onClick={handleReset} variant="ghost" size="sm">
            Reset to Defaults
          </Button>
        </div>

        <div className="space-y-3">
          {HIREOS_FIELDS.map((field) => {
            const fieldKey = field.key as keyof FieldMapping;
            const currentMapping = fieldMappings[fieldKey];
            
            return (
              <div key={field.key} className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-sm">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                </div>
                <div className="flex-1">
                  {isLoadingSchemaQuery ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading fields...</span>
                    </div>
                  ) : schema?.fields && schema.fields.length > 0 ? (
                    <Select
                      value={currentMapping || undefined}
                      onValueChange={(value) => {
                        handleFieldMappingChange(field.key, value);
                      }}
                    >
                      <SelectTrigger className={!currentMapping && field.required ? "border-red-300" : ""}>
                        <SelectValue placeholder="Select Airtable field..." />
                      </SelectTrigger>
                      <SelectContent>
                        {schema.fields.map((airtableField) => (
                          <SelectItem key={airtableField.name} value={airtableField.name}>
                            {airtableField.name}
                            {airtableField.type && (
                              <span className="text-xs text-slate-400 ml-2">({airtableField.type})</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        value={currentMapping}
                        onChange={(e) => handleFieldMappingChange(field.key, e.target.value)}
                        placeholder={DEFAULT_FIELD_NAMES[field.key]}
                      />
                      <p className="text-xs text-slate-400">
                        Click "Refresh Schema" to load fields from Airtable
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={handleSave} className="flex-1">
          Save Mappings
        </Button>
        <Button onClick={handleLoadSchema} variant="outline" disabled={isLoadingSchemaQuery}>
          {isLoadingSchemaQuery ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Schema
            </>
          )}
        </Button>
      </div>

      {!schema?.fields && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Tip:</strong> Enter your table name and click "Refresh Schema" to automatically load your Airtable field names.
            This will show a dropdown for each field instead of typing manually.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

