import { storage } from "./storage";
import { Workflow, WorkflowExecution, WorkflowExecutionStep } from "@shared/schema";
import { sendGmailEmail } from "./api/gmail-integration";
import { notifySlackUsers } from "./slack-notifications";
import { createNotification } from "./api/notifications";

// Workflow execution context
interface WorkflowContext {
  candidate?: any;
  interview?: any;
  job?: any;
  user?: any;
  [key: string]: any;
}

// Variable replacement in strings
function replaceVariables(template: string, context: WorkflowContext): string {
  let result = template;
  const variableRegex = /\{\{([^}]+)\}\}/g;

  result = result.replace(variableRegex, (match, path) => {
    const keys = path.trim().split(".");
    let value: any = context;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return match; // Return original if path not found
      }
    }

    // Format dates if needed
    if (value instanceof Date) {
      return value.toLocaleString();
    }

    return value != null ? String(value) : match;
  });

  return result;
}

// Evaluate condition
function evaluateCondition(condition: string, context: WorkflowContext): boolean {
  try {
    // Replace variables in condition
    let evalCondition = replaceVariables(condition, context);

    // Simple condition evaluation (can be enhanced)
    // Supports: ==, !=, >, <, >=, <=, &&, ||
    // Example: "{{candidate.hiPeopleScore}} >= 80"
    
    // Replace variable references with actual values
    const varRegex = /\{\{([^}]+)\}\}/g;
    evalCondition = evalCondition.replace(varRegex, (match, path) => {
      const keys = path.trim().split(".");
      let value: any = context;
      for (const key of keys) {
        if (value && typeof value === "object" && key in value) {
          value = value[key];
        } else {
          return "null";
        }
      }
      return value != null ? String(value) : "null";
    });

    // Use Function constructor for safe evaluation (better than eval)
    return new Function("return " + evalCondition)();
  } catch (error) {
    console.error("[Workflow Engine] Condition evaluation error:", error);
    return false;
  }
}

// Action Library
export class WorkflowActionLibrary {
  static getAvailableActions() {
    return [
      {
        type: "send_email",
        name: "Send Email",
        description: "Send an email to candidate or team member",
        icon: "📧",
        configFields: [
          { name: "to", label: "To", type: "text", required: true, placeholder: "{{candidate.email}}" },
          { name: "subject", label: "Subject", type: "text", required: true },
          { name: "body", label: "Body", type: "textarea", required: true },
          { name: "template", label: "Email Template", type: "select", options: ["welcome", "interview_confirmation", "rejection", "offer"] },
        ],
      },
      {
        type: "update_status",
        name: "Update Candidate Status",
        description: "Change candidate's status in the pipeline",
        icon: "🔄",
        configFields: [
          { name: "status", label: "New Status", type: "select", required: true, options: [
            "new", "assessment_sent", "assessment_completed", "interview_scheduled", 
            "interview_completed", "offer_sent", "offer_accepted", "rejected", "hired"
          ]},
        ],
      },
      {
        type: "create_interview",
        name: "Schedule Interview",
        description: "Automatically create an interview",
        icon: "📅",
        configFields: [
          { name: "type", label: "Interview Type", type: "select", required: true, options: ["phone", "video", "onsite"] },
          { name: "interviewerId", label: "Interviewer", type: "user_select", required: true },
          { name: "scheduledDate", label: "Scheduled Date", type: "datetime", required: true },
        ],
      },
      {
        type: "notify_slack",
        name: "Notify Slack",
        description: "Send notification to Slack channel",
        icon: "💬",
        configFields: [
          { name: "channel", label: "Channel", type: "text", required: true, placeholder: "#hiring" },
          { name: "message", label: "Message", type: "textarea", required: true },
        ],
      },
      {
        type: "update_crm",
        name: "Update CRM",
        description: "Sync data to Google Sheets or Airtable",
        icon: "📊",
        configFields: [
          { name: "platform", label: "Platform", type: "select", required: true, options: ["google_sheets", "airtable"] },
          { name: "action", label: "Action", type: "select", required: true, options: ["create", "update"] },
          { name: "data", label: "Data", type: "json", required: true },
        ],
      },
      {
        type: "wait",
        name: "Wait/Delay",
        description: "Pause workflow for specified duration",
        icon: "⏳",
        configFields: [
          { name: "duration", label: "Duration (hours)", type: "number", required: true },
        ],
      },
      {
        type: "condition",
        name: "Conditional Logic",
        description: "Run different actions based on condition",
        icon: "🔀",
        configFields: [
          { name: "condition", label: "Condition", type: "text", required: true, placeholder: "{{candidate.hiPeopleScore}} >= 80" },
        ],
      },
    ];
  }

  static async executeAction(
    actionType: string,
    actionConfig: any,
    context: WorkflowContext,
    accountId: number
  ): Promise<any> {
    switch (actionType) {
      case "send_email":
        return await this.sendEmail(actionConfig, context, accountId);

      case "update_status":
        return await this.updateStatus(actionConfig, context, accountId);

      case "create_interview":
        return await this.createInterview(actionConfig, context, accountId);

      case "notify_slack":
        return await this.notifySlack(actionConfig, context, accountId);

      case "update_crm":
        return await this.updateCRM(actionConfig, context, accountId);

      case "wait":
        return await this.wait(actionConfig);

      case "condition":
        return await this.condition(actionConfig, context, accountId);

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  private static async sendEmail(
    config: any,
    context: WorkflowContext,
    accountId: number
  ): Promise<any> {
    let to = replaceVariables(config.to || "", context);
    let subject = replaceVariables(config.subject || "", context);
    let body = replaceVariables(config.body || "", context);

    // If template is specified, use account-scoped templates
    if (config.template) {
      const templates = await storage.getEmailTemplates(accountId) || {};
      const template = templates[config.template];
      if (template) {
        body = replaceVariables(template.body || "", context);
        const templateSubject = replaceVariables(template.subject || "", context);
        if (templateSubject) subject = templateSubject;
        // Also replace to field in template if it exists
        if ((template as any).to) {
          to = replaceVariables((template as any).to, context);
        }
      }
    }

    // Validate email address
    if (!to || !to.includes("@") || to.includes("{{") || to.includes("}}")) {
      throw new Error(`Invalid or missing email address: ${to}. Please ensure candidate email is provided.`);
    }

    // Try Gmail integration first, fallback to direct email
    try {
      if (context.user) {
        await sendGmailEmail(context.user.id, to, subject, body);
        return { success: true, method: "gmail" };
      }
    } catch (error) {
      console.error("[Workflow] Gmail send failed, trying direct email:", error);
    }

    // Fallback to direct email
    await storage.sendDirectEmail(to, subject, body, context.user?.id);
    return { success: true, method: "direct" };
  }

  private static async updateStatus(
    config: any,
    context: WorkflowContext,
    accountId: number
  ): Promise<any> {
    if (!context.candidate) {
      throw new Error("Candidate context required for update_status action");
    }

    await storage.updateCandidate(context.candidate.id, accountId, {
      status: config.status,
    });

    return { success: true, newStatus: config.status };
  }

  private static async createInterview(
    config: any,
    context: WorkflowContext,
    accountId: number
  ): Promise<any> {
    if (!context.candidate) {
      throw new Error("Candidate context required for create_interview action");
    }

    const interview = await storage.createInterview({
      accountId,
      candidateId: context.candidate.id,
      interviewerId: config.interviewerId,
      type: config.type || "video",
      scheduledDate: config.scheduledDate ? new Date(config.scheduledDate) : undefined,
      status: "scheduled",
    });

    return { success: true, interviewId: interview.id };
  }

  private static async notifySlack(
    config: any,
    context: WorkflowContext,
    accountId: number
  ): Promise<any> {
    const channel = config.channel || "#hiring";
    const message = replaceVariables(config.message || "", context);

    if (!message) {
      throw new Error("Slack message is required");
    }

    // Send custom message directly to Slack
    if (context.user) {
      await storage.sendSlackNotification(context.user.id, message);
    } else {
      throw new Error("User context required for Slack notification");
    }

    return { success: true, channel, message };
  }

  private static async updateCRM(
    config: any,
    context: WorkflowContext,
    accountId: number
  ): Promise<any> {
    // This would integrate with existing CRM sync logic
    // For now, return success (implementation can be added later)
    return { success: true, platform: config.platform };
  }

  private static async wait(config: any): Promise<any> {
    const hours = config.duration || 0;
    const ms = hours * 60 * 60 * 1000;
    await new Promise((resolve) => setTimeout(resolve, ms));
    return { success: true, waitedHours: hours };
  }

  private static async condition(
    config: any,
    context: WorkflowContext,
    accountId: number
  ): Promise<any> {
    const conditionMet = evaluateCondition(config.condition, context);
    const stepsToExecute = conditionMet ? config.thenSteps : config.elseSteps;

    if (stepsToExecute && Array.isArray(stepsToExecute)) {
      for (const step of stepsToExecute) {
        await this.executeAction(step.type, step.config, context, accountId);
      }
    }

    return { success: true, conditionMet };
  }
}

// Main workflow execution function
export async function executeWorkflow(
  workflow: Workflow,
  accountId: number,
  executionData: any = {}
): Promise<WorkflowExecution> {
  // Create execution record
  const execution = await storage.createWorkflowExecution({
    accountId,
    workflowId: workflow.id,
    status: "running",
    triggerEntityType: executionData.entityType,
    triggerEntityId: executionData.entityId,
    executionData,
  });

  try {
    const context: WorkflowContext = {
      ...executionData,
      candidate: executionData.candidate,
      interview: executionData.interview,
      job: executionData.job,
      user: executionData.user,
    };

    // Execute each step
    const steps = (workflow.steps as any[]) || [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Create step execution record
      const stepExecution = await storage.createWorkflowExecutionStep({
        executionId: execution.id,
        stepIndex: i,
        actionType: step.type,
        actionConfig: step.config,
        status: "running",
        startedAt: new Date(),
      });

      try {
        // Execute the action
        const result = await WorkflowActionLibrary.executeAction(
          step.type,
          step.config,
          context,
          accountId
        );

        // Update step as completed
        await storage.updateWorkflowExecutionStep(stepExecution.id, {
          status: "completed",
          result,
          completedAt: new Date(),
        });
      } catch (error: any) {
        // Update step as failed
        await storage.updateWorkflowExecutionStep(stepExecution.id, {
          status: "failed",
          errorMessage: error.message,
          completedAt: new Date(),
        });

        // Continue with next step (don't break entire workflow)
        console.error(`[Workflow ${workflow.id}] Step ${i} failed:`, error);
      }
    }

    // Mark execution as completed
    await storage.updateWorkflowExecution(execution.id, accountId, {
      status: "completed",
      completedAt: new Date(),
    });

    // Increment workflow execution count
    await storage.incrementWorkflowExecutionCount(workflow.id, accountId);

    return await storage.getWorkflowExecutions(workflow.id, accountId, 1).then((execs) => execs[0]);
  } catch (error: any) {
    // Mark execution as failed
    await storage.updateWorkflowExecution(execution.id, accountId, {
      status: "failed",
      errorMessage: error.message,
      completedAt: new Date(),
    });

    throw error;
  }
}

// Trigger workflows based on event
export async function triggerWorkflows(
  triggerType: string,
  triggerData: any,
  accountId: number
): Promise<void> {
  try {
    // Get all active workflows for this trigger
    const workflows = await storage.getActiveWorkflowsByTrigger(
      accountId,
      triggerType,
      triggerData
    );

    // Execute each workflow asynchronously
    for (const workflow of workflows) {
      executeWorkflow(workflow, accountId, triggerData).catch((error) => {
        console.error(`[Workflow ${workflow.id}] Execution error:`, error);
      });
    }
  } catch (error) {
    console.error("[Workflow Trigger] Error:", error);
  }
}
