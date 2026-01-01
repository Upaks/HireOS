-- ============================================================
-- MULTI-TENANT MIGRATION - PHASE 4: Add Foreign Keys & Indexes
-- ============================================================
-- This script adds foreign key constraints and indexes for account_id
-- SAFE: Only adds constraints/indexes, doesn't modify data
-- ============================================================

-- Step 1: Add foreign key constraints for account_id columns
-- This ensures data integrity - account_id must reference a valid account

ALTER TABLE "public"."jobs"
    ADD CONSTRAINT "jobs_account_id_accounts_id_fk" 
    FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

ALTER TABLE "public"."candidates"
    ADD CONSTRAINT "candidates_account_id_accounts_id_fk" 
    FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

ALTER TABLE "public"."interviews"
    ADD CONSTRAINT "interviews_account_id_accounts_id_fk" 
    FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

ALTER TABLE "public"."offers"
    ADD CONSTRAINT "offers_account_id_accounts_id_fk" 
    FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

ALTER TABLE "public"."comments"
    ADD CONSTRAINT "comments_account_id_accounts_id_fk" 
    FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

ALTER TABLE "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_account_id_accounts_id_fk" 
    FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

ALTER TABLE "public"."form_templates"
    ADD CONSTRAINT "form_templates_account_id_accounts_id_fk" 
    FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

ALTER TABLE "public"."in_app_notifications"
    ADD CONSTRAINT "in_app_notifications_account_id_accounts_id_fk" 
    FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

ALTER TABLE "public"."evaluations"
    ADD CONSTRAINT "evaluations_account_id_accounts_id_fk" 
    FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

ALTER TABLE "public"."job_platforms"
    ADD CONSTRAINT "job_platforms_account_id_accounts_id_fk" 
    FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

-- platform_integrations is nullable, so we only add constraint if account_id is set
-- We'll add a partial index instead
ALTER TABLE "public"."platform_integrations"
    ADD CONSTRAINT "platform_integrations_account_id_accounts_id_fk" 
    FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

-- Step 2: Create indexes on account_id columns for performance
-- These indexes make queries filtering by account_id much faster

CREATE INDEX IF NOT EXISTS "idx_jobs_account_id" 
    ON "public"."jobs" USING btree ("account_id");

CREATE INDEX IF NOT EXISTS "idx_candidates_account_id" 
    ON "public"."candidates" USING btree ("account_id");

CREATE INDEX IF NOT EXISTS "idx_interviews_account_id" 
    ON "public"."interviews" USING btree ("account_id");

CREATE INDEX IF NOT EXISTS "idx_offers_account_id" 
    ON "public"."offers" USING btree ("account_id");

CREATE INDEX IF NOT EXISTS "idx_comments_account_id" 
    ON "public"."comments" USING btree ("account_id");

CREATE INDEX IF NOT EXISTS "idx_activity_logs_account_id" 
    ON "public"."activity_logs" USING btree ("account_id");

CREATE INDEX IF NOT EXISTS "idx_form_templates_account_id" 
    ON "public"."form_templates" USING btree ("account_id");

CREATE INDEX IF NOT EXISTS "idx_in_app_notifications_account_id" 
    ON "public"."in_app_notifications" USING btree ("account_id");

CREATE INDEX IF NOT EXISTS "idx_evaluations_account_id" 
    ON "public"."evaluations" USING btree ("account_id");

CREATE INDEX IF NOT EXISTS "idx_job_platforms_account_id" 
    ON "public"."job_platforms" USING btree ("account_id");

CREATE INDEX IF NOT EXISTS "idx_platform_integrations_account_id" 
    ON "public"."platform_integrations" USING btree ("account_id");

-- Step 3: Create composite indexes for common query patterns
-- These help with queries that filter by both account_id and another column

CREATE INDEX IF NOT EXISTS "idx_candidates_account_job" 
    ON "public"."candidates" USING btree ("account_id", "job_id");

CREATE INDEX IF NOT EXISTS "idx_interviews_account_candidate" 
    ON "public"."interviews" USING btree ("account_id", "candidate_id");

CREATE INDEX IF NOT EXISTS "idx_comments_account_entity" 
    ON "public"."comments" USING btree ("account_id", "entity_type", "entity_id");

