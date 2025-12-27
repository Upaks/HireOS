-- HireOS Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor to create all tables

CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'hiringManager' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "form_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fields" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"suggested_title" text,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"department" text,
	"urgency" text,
	"skills" text,
	"team_context" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"hi_people_link" text,
	"express_review" boolean,
	"submitter_id" integer,
	"posted_date" timestamp,
	"form_template_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"candidate_count" integer
);

CREATE TABLE "job_platforms" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"platform" text NOT NULL,
	"platform_job_id" text,
	"post_url" text,
	"status" text NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "platform_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform_id" text NOT NULL,
	"platform_name" text NOT NULL,
	"platform_type" text DEFAULT 'builtin' NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"credentials" jsonb,
	"api_endpoint" text,
	"api_method" text DEFAULT 'POST',
	"oauth_token" text,
	"oauth_refresh_token" text,
	"oauth_expires_at" timestamp,
	"last_error" text,
	"last_error_at" timestamp,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_integrations_platform_id_unique" UNIQUE("platform_id")
);

CREATE TABLE "candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"location" text,
	"resume_url" text,
	"source" text,
	"status" text DEFAULT 'new' NOT NULL,
	"final_decision_status" text,
	"last_interview_date" timestamp,
	"ghl_contact_id" text,
	"hi_people_score" integer,
	"hi_people_percentile" integer,
	"hi_people_completed_at" timestamp,
	"hipeople_assessment_link" text,
	"technical_proficiency" integer,
	"leadership_initiative" integer,
	"problem_solving" integer,
	"communication_skills" integer,
	"cultural_fit" integer,
	"skills" jsonb,
	"experience_years" integer,
	"expected_salary" text,
	"notes" text,
	"application_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"job" jsonb
);

CREATE TABLE "interviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"scheduled_date" timestamp,
	"conducted_date" timestamp,
	"interviewer_id" integer,
	"type" text NOT NULL,
	"video_url" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"interview_id" integer NOT NULL,
	"technical_score" integer,
	"communication_score" integer,
	"problem_solving_score" integer,
	"cultural_fit_score" integer,
	"overall_rating" text,
	"technical_comments" text,
	"communication_comments" text,
	"problem_solving_comments" text,
	"cultural_fit_comments" text,
	"overall_comments" text,
	"evaluator_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"offer_type" text NOT NULL,
	"compensation" text NOT NULL,
	"start_date" timestamp,
	"notes" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_date" timestamp,
	"contract_url" text,
	"approved_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"details" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_email" text NOT NULL,
	"subject" text NOT NULL,
	"template" text NOT NULL,
	"context" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "notification_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"process_after" timestamp NOT NULL,
	"process_attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "ghl_tokens" (
	"token_id" serial PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"user_type" text,
	"company_id" text,
	"updated_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);

-- Foreign Key Constraints
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluator_id_users_id_fk" FOREIGN KEY ("evaluator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "job_platforms" ADD CONSTRAINT "job_platforms_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_submitter_id_users_id_fk" FOREIGN KEY ("submitter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "offers" ADD CONSTRAINT "offers_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "offers" ADD CONSTRAINT "offers_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_form_template_id_form_templates_id_fk" FOREIGN KEY ("form_template_id") REFERENCES "public"."form_templates"("id") ON DELETE no action ON UPDATE no action;

