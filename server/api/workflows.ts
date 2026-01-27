import { Express } from "express";
import { storage } from "../storage";
import { handleApiError, validateRequest, getActiveAccountId } from "./utils";
import { z } from "zod";
import { db } from "../db";
import { workflows, workflowExecutions, workflowExecutionSteps } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

// Workflow execution engine
import { executeWorkflow, WorkflowActionLibrary } from "../workflow-engine";

// Validation schemas
const createWorkflowSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  triggerType: z.enum([
    "candidate_status_change",
    "interview_scheduled",
    "interview_completed",
    "manual",
    "scheduled",
  ]),
  triggerConfig: z.record(z.any()).optional(),
  steps: z.array(
    z.object({
      type: z.string(),
      config: z.record(z.any()),
      conditions: z.array(z.any()).optional(),
    })
  ).min(1, "Workflow must have at least one step"),
});

const updateWorkflowSchema = createWorkflowSchema.partial();

export function setupWorkflowRoutes(app: Express) {
  // Get account email templates (account-scoped)
  app.get("/api/workflows/email-templates", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = req.session.activeAccountId;
      const accountTemplates = accountId ? await storage.getEmailTemplates(accountId) || {} : {};
      
      // Default templates that should always be available
      const defaultTemplates: Record<string, { subject: string; body: string }> = {
        welcome: {
          subject: "Welcome to {{companyName}}",
          body: "<p>Hi {{candidate.name}},</p><p>Welcome! We're excited to have you on board.</p><p>Best regards,<br>{{user.fullName}}</p>",
        },
        interview_confirmation: {
          subject: "Interview Scheduled - {{job.title}}",
          body: "<p>Hi {{candidate.name}},</p><p>Your interview for {{job.title}} has been scheduled for {{interview.scheduledDate}}.</p><p>Looking forward to meeting you!</p><p>Best regards,<br>{{user.fullName}}</p>",
        },
        rejection: {
          subject: "Update on Your Application - {{job.title}}",
          body: "<p>Hi {{candidate.name}},</p><p>Thank you for your interest in {{job.title}}. Unfortunately, we've decided to move forward with other candidates.</p><p>We wish you the best in your job search.</p><p>Best regards,<br>{{user.fullName}}</p>",
        },
        offer: {
          subject: "Job Offer - {{job.title}}",
          body: "<p>Hi {{candidate.name}},</p><p>We're excited to offer you the {{job.title}} position!</p><p>Please review the details and let us know if you have any questions.</p><p>Best regards,<br>{{user.fullName}}</p>",
        },
      };

      // Merge account templates with defaults (account templates override defaults)
      const allTemplates = { ...defaultTemplates, ...accountTemplates };
      
      // Return templates in a format that's easy to use
      const templateList = Object.keys(allTemplates).map((key) => {
        const template = allTemplates[key];
        return {
          id: key,
          name: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          subject: template.subject || "",
          body: template.body || "",
        };
      });

      res.json(templateList);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get available workflow actions - MUST come before /api/workflows/:id
  app.get("/api/workflows/actions", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      try {
        const actions = WorkflowActionLibrary.getAvailableActions();
        res.json(actions);
      } catch (error: any) {
        console.error("[Workflows API] Error getting available actions:", error);
        res.status(500).json({ message: error.message || "Failed to get available actions" });
      }
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get workflow templates - MUST come before /api/workflows/:id
  app.get("/api/workflows/templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const templates = [
        {
          id: "new_application",
          name: "New Application Received",
          description: "Automatically handle new candidate applications",
          triggerType: "candidate_status_change",
          triggerConfig: {
            fromStatus: null,
            toStatus: "new",
          },
          steps: [
            {
              type: "send_email",
              config: {
                template: "welcome",
                to: "{{candidate.email}}",
                subject: "Thank you for your application",
              },
            },
            {
              type: "notify_slack",
              config: {
                channel: "#hiring",
                message: "New application: {{candidate.name}} for {{job.title}}",
              },
            },
          ],
        },
        {
          id: "interview_scheduled",
          name: "Interview Scheduled",
          description: "Notify team and candidate when interview is scheduled",
          triggerType: "interview_scheduled",
          triggerConfig: {},
          steps: [
            {
              type: "send_email",
              config: {
                template: "interview_confirmation",
                to: "{{candidate.email}}",
                subject: "Interview Scheduled - {{job.title}}",
              },
            },
            {
              type: "notify_slack",
              config: {
                channel: "#hiring",
                message: "Interview scheduled: {{candidate.name}} on {{interview.scheduledDate}}",
              },
            },
          ],
        },
        {
          id: "assessment_completed",
          name: "Assessment Completed",
          description: "Auto-advance or reject based on assessment score",
          triggerType: "candidate_status_change",
          triggerConfig: {
            fromStatus: "assessment_sent",
            toStatus: "assessment_completed",
          },
          steps: [
            {
              type: "condition",
              config: {
                condition: "{{candidate.hiPeopleScore}} >= 80",
              },
              thenSteps: [
                {
                  type: "update_status",
                  config: {
                    status: "interview_scheduled",
                  },
                },
              ],
              elseSteps: [
                {
                  type: "send_email",
                  config: {
                    template: "rejection",
                    to: "{{candidate.email}}",
                  },
                },
                {
                  type: "update_status",
                  config: {
                    status: "rejected",
                  },
                },
              ],
            },
          ],
        },
      ];

      res.json(templates);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get all workflows for account
  app.get("/api/workflows", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const workflowsList = await storage.getWorkflows(accountId);
      res.json(workflowsList);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get single workflow
  app.get("/api/workflows/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }

      const workflow = await storage.getWorkflow(workflowId, accountId);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      res.json(workflow);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Create workflow
  app.post("/api/workflows", validateRequest(createWorkflowSchema), async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const workflow = await storage.createWorkflow({
        accountId,
        name: req.body.name,
        description: req.body.description,
        isActive: req.body.isActive ?? true,
        triggerType: req.body.triggerType,
        triggerConfig: req.body.triggerConfig || {},
        steps: req.body.steps,
        createdById: req.user.id,
      });

      res.status(201).json(workflow);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Update workflow
  app.patch("/api/workflows/:id", validateRequest(updateWorkflowSchema), async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }

      const workflow = await storage.updateWorkflow(workflowId, accountId, req.body);
      res.json(workflow);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Delete workflow
  app.delete("/api/workflows/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }

      await storage.deleteWorkflow(workflowId, accountId);
      res.json({ message: "Workflow deleted successfully" });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Manually trigger workflow
  app.post("/api/workflows/:id/trigger", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }

      const workflow = await storage.getWorkflow(workflowId, accountId);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      if (!workflow.isActive) {
        return res.status(400).json({ message: "Workflow is not active" });
      }

      // Execute workflow asynchronously
      const executionData = req.body.executionData || {};
      executeWorkflow(workflow, accountId, executionData).catch((error) => {
        console.error(`[Workflow ${workflowId}] Execution error:`, error);
      });

      res.json({ message: "Workflow triggered successfully" });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get workflow executions
  app.get("/api/workflows/:id/executions", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const executions = await storage.getWorkflowExecutions(workflowId, accountId, limit);
      res.json(executions);
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get execution details with steps
  app.get("/api/workflow-executions/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const executionId = parseInt(req.params.id);
      if (isNaN(executionId)) {
        return res.status(400).json({ message: "Invalid execution ID" });
      }

      const [execution] = await db
        .select()
        .from(workflowExecutions)
        .where(and(eq(workflowExecutions.id, executionId), eq(workflowExecutions.accountId, accountId)));

      if (!execution) {
        return res.status(404).json({ message: "Execution not found" });
      }

      const steps = await storage.getWorkflowExecutionSteps(executionId);
      res.json({ ...execution, steps });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Test/Run workflow with test data
  app.post("/api/workflows/:id/test", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }

      const workflow = await storage.getWorkflow(workflowId, accountId);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      // Get test data from request body
      const testData = req.body.testData || {};
      const isTestMode = req.body.isTestMode !== false; // Default to true

      // Prepare execution data based on trigger type
      let executionData: any = {
        entityType: workflow.triggerType === "manual" ? "manual" : testData.entityType || "test",
        entityId: testData.entityId || null,
        user: req.user,
      };

      // Build context based on trigger type and test data
      if (workflow.triggerType === "candidate_status_change") {
        if (testData.candidateId) {
          const candidate = await storage.getCandidate(testData.candidateId, accountId);
          if (candidate) {
            executionData.candidate = candidate;
          } else {
            executionData.candidate = {
              id: testData.candidateId,
              name: testData.candidateName || "Test Candidate",
              email: testData.candidateEmail || "test@example.com",
              status: testData.fromStatus || "new",
            };
          }
        } else {
          executionData.candidate = testData.candidate || {
            id: testData.candidateId || 1,
            name: testData.candidateName || "Test Candidate",
            email: testData.candidateEmail || "test@example.com",
            status: testData.fromStatus || "new",
          };
        }
        // Ensure email is set
        if (!executionData.candidate.email) {
          executionData.candidate.email = testData.candidateEmail || "test@example.com";
        }
        executionData.job = testData.job || (testData.jobId ? await storage.getJob(testData.jobId, accountId) : null);
        executionData.fromStatus = testData.fromStatus || "new";
        executionData.toStatus = testData.toStatus || "interview_scheduled";
      } else if (workflow.triggerType === "interview_scheduled") {
        executionData.interview = testData.interview || {
          id: testData.interviewId || 1,
          scheduledDate: testData.scheduledDate || new Date(),
          candidateId: testData.candidateId || 1,
        };
        executionData.candidate = testData.candidate || (testData.candidateId ? await storage.getCandidate(testData.candidateId, accountId) : {
          id: testData.candidateId || 1,
          name: testData.candidateName || "Test Candidate",
          email: testData.candidateEmail || "test@example.com",
        });
        executionData.job = testData.job || (testData.jobId ? await storage.getJob(testData.jobId, accountId) : null);
      } else if (workflow.triggerType === "interview_completed") {
        executionData.interview = testData.interview || {
          id: testData.interviewId || 1,
          scheduledDate: testData.scheduledDate || new Date(),
          conductedDate: testData.conductedDate || new Date(),
          candidateId: testData.candidateId || 1,
          status: "completed",
        };
        executionData.candidate = testData.candidate || (testData.candidateId ? await storage.getCandidate(testData.candidateId, accountId) : {
          id: testData.candidateId || 1,
          name: testData.candidateName || "Test Candidate",
          email: testData.candidateEmail || "test@example.com",
        });
        executionData.job = testData.job || (testData.jobId ? await storage.getJob(testData.jobId, accountId) : null);
      } else if (workflow.triggerType === "manual") {
        // For manual trigger, use provided test data directly
        // Ensure candidate object is created from test data if not provided
        let candidate = testData.candidate;
        if (!candidate) {
          if (testData.candidateId) {
            candidate = await storage.getCandidate(testData.candidateId, accountId);
          }
          if (!candidate && (testData.candidateName || testData.candidateEmail)) {
            // Create candidate object from test data
            candidate = {
              id: testData.candidateId || 1,
              name: testData.candidateName || "Test Candidate",
              email: testData.candidateEmail || "test@example.com",
            };
          }
        } else if (!candidate.email && testData.candidateEmail) {
          // Ensure email is set if candidate object exists but email is missing
          candidate.email = testData.candidateEmail;
        }

        executionData = {
          ...executionData,
          ...testData,
          candidate: candidate,
          job: testData.job || (testData.jobId ? (await storage.getJob(testData.jobId, accountId)) || null : null),
          interview: testData.interview || (testData.interviewId ? (await storage.getInterview(testData.interviewId, accountId)) || null : null),
        };
      }

      // Execute workflow and wait for completion
      const execution = await executeWorkflow(workflow, accountId, executionData);

      // Get execution steps
      const steps = await storage.getWorkflowExecutionSteps(execution.id);

      res.json({
        execution,
        steps,
        success: execution.status === "completed",
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

  // Get last execution data for a workflow
  app.get("/api/workflows/:id/last-execution", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const accountId = await getActiveAccountId(req);
      if (!accountId) {
        return res.status(400).json({ message: "User is not associated with any account" });
      }

      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }

      // Get last execution
      const executions = await storage.getWorkflowExecutions(workflowId, accountId, 1);
      if (executions.length === 0) {
        return res.status(404).json({ message: "No previous executions found" });
      }

      const lastExecution = executions[0];
      const steps = await storage.getWorkflowExecutionSteps(lastExecution.id);

      res.json({
        execution: lastExecution,
        steps,
        executionData: lastExecution.executionData,
      });
    } catch (error) {
      handleApiError(error, res);
    }
  });

}
