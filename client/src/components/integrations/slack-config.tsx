import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { UserRoles } from "@shared/schema";

interface SlackConfigFormProps {
  user: any;
  onSave: (data: {
    slackWebhookUrl: string;
    slackNotificationScope: "all_users" | "specific_roles";
    slackNotificationRoles?: string[];
    slackNotificationEvents: string[];
  }) => void;
  onRemove: () => void;
  onCancel: () => void;
}

const ALL_EVENTS = [
  { id: "interview_scheduled", label: "Interview Scheduled" },
  { id: "offer_accepted", label: "Offer Accepted" },
  { id: "offer_sent", label: "Offer Sent" },
  { id: "job_posted", label: "Job Posted" },
  { id: "new_application", label: "New Candidate Application" },
] as const;

const AVAILABLE_ROLES = [
  { value: UserRoles.HIRING_MANAGER, label: "Hiring Manager" },
  { value: UserRoles.PROJECT_MANAGER, label: "Project Manager" },
  { value: UserRoles.COO, label: "Chief Operating Officer" },
  { value: UserRoles.CEO, label: "Chief Executive Officer" },
  { value: UserRoles.DIRECTOR, label: "Director" },
  { value: UserRoles.ADMIN, label: "Administrator" },
];

export default function SlackConfigForm({
  user,
  onSave,
  onRemove,
  onCancel,
}: SlackConfigFormProps) {
  const [webhookUrl, setWebhookUrl] = useState(user?.slackWebhookUrl || "");
  const [notificationScope, setNotificationScope] = useState<"all_users" | "specific_roles">(
    (user?.slackNotificationScope as "all_users" | "specific_roles") || "all_users"
  );
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    (user?.slackNotificationRoles as string[]) || []
  );
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    (user?.slackNotificationEvents as string[]) || [
      "interview_scheduled",
      "offer_accepted",
      "offer_sent",
      "job_posted",
      "new_application",
    ]
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleEventToggle = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      return;
    }
    if (selectedEvents.length === 0) {
      return;
    }
    if (notificationScope === "specific_roles" && selectedRoles.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        slackWebhookUrl: webhookUrl.trim(),
        slackNotificationScope: notificationScope,
        slackNotificationRoles:
          notificationScope === "specific_roles" ? selectedRoles : undefined,
        slackNotificationEvents: selectedEvents,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isConnected = !!user?.slackWebhookUrl;
  const canSave = webhookUrl.trim() && selectedEvents.length > 0 && (notificationScope === "all_users" || selectedRoles.length > 0);

  return (
    <div className="space-y-6">
      {/* Webhook URL */}
      <div>
        <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
        <Input
          id="slack-webhook"
          type="text"
          placeholder="https://hooks.slack.com/services/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Create an Incoming Webhook in your{" "}
          <a
            href="https://api.slack.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center"
          >
            Slack App settings
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
          {" "}and paste the webhook URL here.
        </p>
      </div>

      {/* Notification Events */}
      <div>
        <Label>Notification Events</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Select which events should trigger Slack notifications
        </p>
        <div className="space-y-2">
          {ALL_EVENTS.map((event) => (
            <div key={event.id} className="flex items-center space-x-2">
              <Checkbox
                id={event.id}
                checked={selectedEvents.includes(event.id)}
                onCheckedChange={() => handleEventToggle(event.id)}
              />
              <Label
                htmlFor={event.id}
                className="text-sm font-normal cursor-pointer"
              >
                {event.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Scope */}
      <div>
        <Label>Notification Scope</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Choose who should receive notifications when you trigger an event
        </p>
        <RadioGroup
          value={notificationScope}
          onValueChange={(value) =>
            setNotificationScope(value as "all_users" | "specific_roles")
          }
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all_users" id="all_users" />
            <Label htmlFor="all_users" className="cursor-pointer">
              All users in workspace (anyone with Slack connected)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="specific_roles" id="specific_roles" />
            <Label htmlFor="specific_roles" className="cursor-pointer">
              Specific roles only
            </Label>
          </div>
        </RadioGroup>

        {/* Role Selection (if specific_roles) */}
        {notificationScope === "specific_roles" && (
          <div className="mt-4 ml-6 space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Select which roles should receive notifications:
            </p>
            {AVAILABLE_ROLES.map((role) => (
              <div key={role.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`role-${role.value}`}
                  checked={selectedRoles.includes(role.value)}
                  onCheckedChange={() => handleRoleToggle(role.value)}
                />
                <Label
                  htmlFor={`role-${role.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {role.label}
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>

      {isConnected && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-900">
                Slack is connected
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRemove}
              disabled={isLoading}
            >
              Disconnect
            </Button>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSave || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : isConnected ? (
            "Update Settings"
          ) : (
            "Connect Slack"
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

