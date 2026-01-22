-- Migration: Fix platform_integrations unique constraint to allow multiple users
-- Problem: Current constraint only allows one integration per platform across all users
-- Solution: Change constraint to allow each user to have their own integration

-- Step 1: Drop the old unique constraint on platform_id only
ALTER TABLE "public"."platform_integrations"
    DROP CONSTRAINT IF EXISTS "platform_integrations_platform_id_unique";

-- Step 2: Add new unique constraint on (platform_id, user_id)
-- This allows multiple users to have the same platform integration
-- Note: user_id can be NULL for system-wide integrations, so we use a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS "platform_integrations_platform_id_user_id_unique" 
    ON "public"."platform_integrations" ("platform_id", "user_id")
    WHERE "user_id" IS NOT NULL;

-- Step 3: For system-wide integrations (user_id IS NULL), keep unique constraint on platform_id only
CREATE UNIQUE INDEX IF NOT EXISTS "platform_integrations_platform_id_unique_system" 
    ON "public"."platform_integrations" ("platform_id")
    WHERE "user_id" IS NULL;

COMMENT ON INDEX "platform_integrations_platform_id_user_id_unique" IS 
    'Ensures each user can have their own integration per platform (e.g., each user can connect their own Gmail)';

COMMENT ON INDEX "platform_integrations_platform_id_unique_system" IS 
    'Ensures only one system-wide integration per platform (for integrations not tied to a specific user)';
