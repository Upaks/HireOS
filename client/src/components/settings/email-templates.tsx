import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Save } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Email template types
type EmailTemplateType = 
  | "interview" 
  | "offer" 
  | "rejection" 
  | "talentPool"
  | "assessment" 
  | "onboarding";

interface EmailTemplate {
  type: EmailTemplateType;
  name: string;
  description: string;
  defaultSubject: string;
  defaultBody: string;
  placeholders: string[];
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    type: "interview",
    name: "Interview Invitation",
    description: "Sent when inviting a candidate for an interview",
    defaultSubject: "{{candidateName}}, Let's Discuss Your Fit for Our {{jobTitle}} Position",
    defaultBody: `<p>Hi {{candidateName}},</p>

<p>It's {{senderName}} from {{companyName}}. I came across your profile and would like to chat about your background and how you might fit in our <b>{{jobTitle}}</b> position.</p>

<p>Feel free to grab a time on my calendar when you're available:<br>
<a href="{{calendarLink}}">Schedule your interview here</a></p>

<p>Looking forward to connecting!</p>

<p>Thanks,<br>
{{senderName}}<br>
{{companyName}}</p>`,
    placeholders: ["{{candidateName}}", "{{jobTitle}}", "{{senderName}}", "{{companyName}}", "{{calendarLink}}"]
  },
  {
    type: "offer",
    name: "Job Offer",
    description: "Sent when extending a job offer to a candidate",
    defaultSubject: "Excited to Offer You the {{jobTitle}} Position",
    defaultBody: `<p>Hi {{candidateName}},</p>

<p>Great news — we'd love to bring you on board for the {{jobTitle}} position at {{companyName}}. After reviewing your experience, we're confident you'll make a strong impact on our team.</p>

<p>Here's the link to your engagement contract: <a href="{{contractLink}}">[Contract Link]</a></p>

<p>To kick things off, please schedule your onboarding call here: <a href="{{onboardingLink}}">[Onboarding Calendar Link]</a></p>

<p>If anything's unclear or you'd like to chat, don't hesitate to reach out.</p>

<p>Welcome aboard — we're excited to get started!</p>

<p>Best regards,<br>
{{senderName}}<br>
{{companyName}}</p>`,
    placeholders: ["{{candidateName}}", "{{jobTitle}}", "{{senderName}}", "{{companyName}}", "{{contractLink}}", "{{onboardingLink}}"]
  },
  {
    type: "rejection",
    name: "Rejection",
    description: "Sent when rejecting a candidate",
    defaultSubject: "Update on Your {{jobTitle}} Application",
    defaultBody: `<p>Hi {{candidateName}},</p>

<p>Thanks for taking the time to interview for the {{jobTitle}} role with us. I really enjoyed our conversation and learning about your background and experience.</p>

<p>After careful consideration, we've decided to move forward with another candidate for this position.</p>

<p>I'd love to keep you in mind for future opportunities at {{companyName}}, as your skills and experience would be a great fit for our team. Feel free to stay connected, and I'll reach out if anything opens up that matches your background.</p>

<p>Thanks again for your interest, and I wish you all the best!</p>

<p>Best regards,<br>
{{senderName}}<br>
{{companyName}}</p>`,
    placeholders: ["{{candidateName}}", "{{jobTitle}}", "{{senderName}}", "{{companyName}}"]
  },
  {
    type: "talentPool",
    name: "Talent Pool",
    description: "Sent when adding a candidate to the talent pool",
    defaultSubject: "Thank you for your application to {{jobTitle}}",
    defaultBody: `<p>Hi {{candidateName}},</p>

<p>Thank you for your interest in the {{jobTitle}} position at {{companyName}}.</p>

<p>While we've decided to move forward with other candidates for this specific role, we were impressed with your background and would like to keep you in our talent pool for future opportunities.</p>

<p>We'll reach out if a position opens up that matches your skills and experience.</p>

<p>Thanks again for your interest!</p>

<p>Best regards,<br>
{{senderName}}<br>
{{companyName}}</p>`,
    placeholders: ["{{candidateName}}", "{{jobTitle}}", "{{senderName}}", "{{companyName}}"]
  },
  {
    type: "assessment",
    name: "Assessment Invitation",
    description: "Sent when sending HiPeople assessment link",
    defaultSubject: "Your Assessment for {{jobTitle}}",
    defaultBody: `<p>Hi {{candidateName}},</p>

<p>Thank you for your interest in the {{jobTitle}} position at {{companyName}}!</p>

<p>As part of our hiring process, we'd like you to complete a brief assessment. This will help us better understand your skills and how you might fit with our team.</p>

<p>Please complete the assessment here: <a href="{{assessmentLink}}">Start Assessment</a></p>

<p>If you have any questions, feel free to reach out.</p>

<p>Best regards,<br>
{{senderName}}<br>
{{companyName}}</p>`,
    placeholders: ["{{candidateName}}", "{{jobTitle}}", "{{senderName}}", "{{companyName}}", "{{assessmentLink}}"]
  },
  {
    type: "onboarding",
    name: "Onboarding",
    description: "Sent when a candidate accepts an offer",
    defaultSubject: "Welcome to {{companyName}}!",
    defaultBody: `<p>Hi {{candidateName}},</p>

<p>Welcome to {{companyName}}! We're thrilled to have you join our team as {{jobTitle}}.</p>

<p>To get started, please complete the onboarding checklist and schedule your first day.</p>

<p>If you have any questions before your start date, don't hesitate to reach out.</p>

<p>Looking forward to working with you!</p>

<p>Best regards,<br>
{{senderName}}<br>
{{companyName}}</p>`,
    placeholders: ["{{candidateName}}", "{{jobTitle}}", "{{senderName}}", "{{companyName}}"]
  }
];

export default function EmailTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<EmailTemplateType>("interview");
  const [templates, setTemplates] = useState<Record<EmailTemplateType, { subject: string; body: string }>>({
    interview: { subject: "", body: "" },
    offer: { subject: "", body: "" },
    rejection: { subject: "", body: "" },
    talentPool: { subject: "", body: "" },
    assessment: { subject: "", body: "" },
    onboarding: { subject: "", body: "" }
  });

  // Fetch user's email templates
  const { data: userData, isLoading } = useQuery({
    queryKey: ['/api/users', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${user?.id}`);
      return await res.json();
    }
  });

  // Load custom templates when userData is available
  useEffect(() => {
    if (userData) {
      // Load custom templates if they exist
      const emailTemplates = (userData as any)?.emailTemplates || {};
      const loadedTemplates: Record<EmailTemplateType, { subject: string; body: string }> = {
        interview: {
          subject: emailTemplates.interview?.subject || "",
          body: emailTemplates.interview?.body || ""
        },
        offer: {
          subject: emailTemplates.offer?.subject || "",
          body: emailTemplates.offer?.body || ""
        },
        rejection: {
          subject: emailTemplates.rejection?.subject || "",
          body: emailTemplates.rejection?.body || ""
        },
        talentPool: {
          subject: emailTemplates.talentPool?.subject || emailTemplates.talent_pool?.subject || "",
          body: emailTemplates.talentPool?.body || emailTemplates.talent_pool?.body || ""
        },
        assessment: {
          subject: emailTemplates.assessment?.subject || "",
          body: emailTemplates.assessment?.body || ""
        },
        onboarding: {
          subject: emailTemplates.onboarding?.subject || "",
          body: emailTemplates.onboarding?.body || ""
        }
      };
      setTemplates(loadedTemplates);
    }
  }, [userData]);

  const saveTemplateMutation = useMutation({
    mutationFn: async (type: EmailTemplateType) => {
      const template = templates[type];
      
      // Get current email templates
      const currentTemplates = (userData as any)?.emailTemplates || {};
      
      // Update the specific template type
      const updatedTemplates = {
        ...currentTemplates,
        [type]: {
          subject: template.subject || null,
          body: template.body || null
        }
      };

      const res = await apiRequest("PATCH", `/api/users/${user?.id}`, {
        emailTemplates: updatedTemplates
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Template saved",
        description: "Your email template has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save template",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const currentTemplate = EMAIL_TEMPLATES.find(t => t.type === selectedType)!;
  const currentCustomTemplate = templates[selectedType];

  const handleSubjectChange = (value: string) => {
    setTemplates(prev => ({
      ...prev,
      [selectedType]: { ...prev[selectedType], subject: value }
    }));
  };

  const handleBodyChange = (value: string) => {
    setTemplates(prev => ({
      ...prev,
      [selectedType]: { ...prev[selectedType], body: value }
    }));
  };

  const handleReset = () => {
    setTemplates(prev => ({
      ...prev,
      [selectedType]: { subject: "", body: "" }
    }));
  };

  const handleSave = () => {
    saveTemplateMutation.mutate(selectedType);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Email Templates</h2>
        <p className="text-muted-foreground mt-1">
          Customize email templates for different stages of the hiring process. Leave blank to use default templates.
        </p>
      </div>

      <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as EmailTemplateType)}>
        <TabsList className="grid w-full grid-cols-6">
          {EMAIL_TEMPLATES.map(template => (
            <TabsTrigger key={template.type} value={template.type} className="text-xs">
              {template.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {EMAIL_TEMPLATES.map(template => (
          <TabsContent key={template.type} value={template.type} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">
                    Available Placeholders
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {template.placeholders.map(placeholder => (
                      <code
                        key={placeholder}
                        className="bg-slate-100 px-2 py-1 rounded text-xs font-mono"
                      >
                        {placeholder}
                      </code>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor={`subject-${template.type}`}>Email Subject</Label>
                  <Input
                    id={`subject-${template.type}`}
                    value={currentCustomTemplate.subject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    placeholder={template.defaultSubject}
                    className="mt-1"
                  />
                  {!currentCustomTemplate.subject && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: {template.defaultSubject}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor={`body-${template.type}`}>Email Body (HTML)</Label>
                  <Textarea
                    id={`body-${template.type}`}
                    value={currentCustomTemplate.body}
                    onChange={(e) => handleBodyChange(e.target.value)}
                    placeholder={template.defaultBody}
                    rows={15}
                    className="mt-1 font-mono text-sm"
                  />
                  {!currentCustomTemplate.body && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Using default template
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={saveTemplateMutation.isPending}
                  >
                    {saveTemplateMutation.isPending ? (
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
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={!currentCustomTemplate.subject && !currentCustomTemplate.body}
                  >
                    Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

