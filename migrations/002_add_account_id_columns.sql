-- ============================================================
-- MULTI-TENANT MIGRATION - PHASE 2: Add account_id Columns
-- ============================================================
-- This script adds account_id column to all relevant tables
-- SAFE: Columns are nullable, existing code will still work
-- ============================================================

-- Step 1: Add account_id to jobs table
ALTER TABLE "public"."jobs" 
    ADD COLUMN IF NOT EXISTS "account_id" integer;

-- Step 2: Add account_id to candidates table
ALTER TABLE "public"."candidates" 
    ADD COLUMN IF NOT EXISTS "account_id" integer;

-- Step 3: Add account_id to interviews table
ALTER TABLE "public"."interviews" 
    ADD COLUMN IF NOT EXISTS "account_id" integer;

-- Step 4: Add account_id to offers table
ALTER TABLE "public"."offers" 
    ADD COLUMN IF NOT EXISTS "account_id" integer;

-- Step 5: Add account_id to comments table
ALTER TABLE "public"."comments" 
    ADD COLUMN IF NOT EXISTS "account_id" integer;

-- Step 6: Add account_id to activity_logs table
ALTER TABLE "public"."activity_logs" 
    ADD COLUMN IF NOT EXISTS "account_id" integer;

-- Step 7: Add account_id to form_templates table
ALTER TABLE "public"."form_templates" 
    ADD COLUMN IF NOT EXISTS "account_id" integer;

-- Step 8: Add account_id to in_app_notifications table
ALTER TABLE "public"."in_app_notifications" 
    ADD COLUMN IF NOT EXISTS "account_id" integer;

-- Step 9: Add account_id to evaluations table
ALTER TABLE "public"."evaluations" 
    ADD COLUMN IF NOT EXISTS "account_id" integer;

-- Step 10: Add account_id to job_platforms table
ALTER TABLE "public"."job_platforms" 
    ADD COLUMN IF NOT EXISTS "account_id" integer;

-- Step 11: Add account_id to platform_integrations table (nullable - some might be system-wide)
ALTER TABLE "public"."platform_integrations" 
    ADD COLUMN IF NOT EXISTS "account_id" integer;

-- Add comments for documentation
COMMENT ON COLUMN "public"."jobs"."account_id" IS 'Multi-tenant: Links job to account';
COMMENT ON COLUMN "public"."candidates"."account_id" IS 'Multi-tenant: Links candidate to account';
COMMENT ON COLUMN "public"."interviews"."account_id" IS 'Multi-tenant: Links interview to account';
COMMENT ON COLUMN "public"."offers"."account_id" IS 'Multi-tenant: Links offer to account';
COMMENT ON COLUMN "public"."comments"."account_id" IS 'Multi-tenant: Links comment to account';
COMMENT ON COLUMN "public"."activity_logs"."account_id" IS 'Multi-tenant: Links activity log to account';
COMMENT ON COLUMN "public"."form_templates"."account_id" IS 'Multi-tenant: Links form template to account';
COMMENT ON COLUMN "public"."in_app_notifications"."account_id" IS 'Multi-tenant: Links notification to account';
COMMENT ON COLUMN "public"."evaluations"."account_id" IS 'Multi-tenant: Links evaluation to account';
COMMENT ON COLUMN "public"."job_platforms"."account_id" IS 'Multi-tenant: Links job platform to account';
COMMENT ON COLUMN "public"."platform_integrations"."account_id" IS 'Multi-tenant: Links integration to account (nullable for system-wide integrations)';

-- Note: Columns are nullable for now - we'll fill them in Phase 3 migration
-- This allows existing code to continue working without errors

