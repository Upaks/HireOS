-- ============================================================
-- MULTI-TENANT MIGRATION - PHASE 3: Migrate Existing Data
-- ============================================================
-- This script creates a default account and assigns all existing data to it
-- SAFE: Only fills in the account_id columns we added in Phase 2
-- ============================================================

-- IMPORTANT: Review this script before running!
-- This assumes all your existing data belongs to one account
-- Change the account name below if needed

DO $$
DECLARE
    default_account_id integer;
    user_record RECORD;
    job_record RECORD;
    candidate_record RECORD;
    interview_record RECORD;
    offer_record RECORD;
    comment_record RECORD;
    activity_record RECORD;
    template_record RECORD;
    notification_record RECORD;
    evaluation_record RECORD;
    platform_record RECORD;
    job_platform_record RECORD;
BEGIN
    -- Step 1: Create default account
    -- Change 'Default Account' to your company name if you want
    INSERT INTO "public"."accounts" ("name", "created_at", "updated_at")
    VALUES ('Default Account', now(), now())
    ON CONFLICT DO NOTHING
    RETURNING id INTO default_account_id;
    
    -- If account already exists, get its ID
    IF default_account_id IS NULL THEN
        SELECT id INTO default_account_id 
        FROM "public"."accounts" 
        WHERE name = 'Default Account' 
        LIMIT 1;
    END IF;
    
    RAISE NOTICE 'Default account ID: %', default_account_id;
    
    -- Step 2: Create account_members for all existing users
    -- Assigns each user to the default account with their current role
    FOR user_record IN SELECT id, role FROM "public"."users" LOOP
        INSERT INTO "public"."account_members" ("account_id", "user_id", "role", "joined_at")
        VALUES (default_account_id, user_record.id, user_record.role, now())
        ON CONFLICT ("account_id", "user_id") DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Created account members for all users';
    
    -- Step 3: Assign all jobs to the default account
    UPDATE "public"."jobs"
    SET "account_id" = default_account_id
    WHERE "account_id" IS NULL;
    
    RAISE NOTICE 'Assigned jobs to account';
    
    -- Step 4: Assign all candidates to the default account
    UPDATE "public"."candidates"
    SET "account_id" = default_account_id
    WHERE "account_id" IS NULL;
    
    RAISE NOTICE 'Assigned candidates to account';
    
    -- Step 5: Assign all interviews to the default account
    -- Get account_id from the candidate's account
    UPDATE "public"."interviews" i
    SET "account_id" = c."account_id"
    FROM "public"."candidates" c
    WHERE i."candidate_id" = c."id"
    AND i."account_id" IS NULL
    AND c."account_id" IS NOT NULL;
    
    -- For any interviews without candidates, assign to default account
    UPDATE "public"."interviews"
    SET "account_id" = default_account_id
    WHERE "account_id" IS NULL;
    
    RAISE NOTICE 'Assigned interviews to account';
    
    -- Step 6: Assign all offers to the default account
    -- Get account_id from the candidate's account
    UPDATE "public"."offers" o
    SET "account_id" = c."account_id"
    FROM "public"."candidates" c
    WHERE o."candidate_id" = c."id"
    AND o."account_id" IS NULL
    AND c."account_id" IS NOT NULL;
    
    -- For any offers without candidates, assign to default account
    UPDATE "public"."offers"
    SET "account_id" = default_account_id
    WHERE "account_id" IS NULL;
    
    RAISE NOTICE 'Assigned offers to account';
    
    -- Step 7: Assign all comments to the default account
    -- For comments on jobs
    UPDATE "public"."comments" c
    SET "account_id" = j."account_id"
    FROM "public"."jobs" j
    WHERE c."entity_type" = 'job'
    AND c."entity_id" = j."id"
    AND c."account_id" IS NULL
    AND j."account_id" IS NOT NULL;
    
    -- For comments on candidates
    UPDATE "public"."comments" c
    SET "account_id" = cand."account_id"
    FROM "public"."candidates" cand
    WHERE c."entity_type" = 'candidate'
    AND c."entity_id" = cand."id"
    AND c."account_id" IS NULL
    AND cand."account_id" IS NOT NULL;
    
    -- For any remaining comments, assign to default account
    UPDATE "public"."comments"
    SET "account_id" = default_account_id
    WHERE "account_id" IS NULL;
    
    RAISE NOTICE 'Assigned comments to account';
    
    -- Step 8: Assign all activity_logs to the default account
    UPDATE "public"."activity_logs"
    SET "account_id" = default_account_id
    WHERE "account_id" IS NULL;
    
    RAISE NOTICE 'Assigned activity logs to account';
    
    -- Step 9: Assign all form_templates to the default account
    UPDATE "public"."form_templates"
    SET "account_id" = default_account_id
    WHERE "account_id" IS NULL;
    
    RAISE NOTICE 'Assigned form templates to account';
    
    -- Step 10: Assign all in_app_notifications to the default account
    UPDATE "public"."in_app_notifications"
    SET "account_id" = default_account_id
    WHERE "account_id" IS NULL;
    
    RAISE NOTICE 'Assigned in-app notifications to account';
    
    -- Step 11: Assign all evaluations to the default account
    -- Get account_id from the interview's account
    UPDATE "public"."evaluations" e
    SET "account_id" = i."account_id"
    FROM "public"."interviews" i
    WHERE e."interview_id" = i."id"
    AND e."account_id" IS NULL
    AND i."account_id" IS NOT NULL;
    
    -- For any evaluations without interviews, assign to default account
    UPDATE "public"."evaluations"
    SET "account_id" = default_account_id
    WHERE "account_id" IS NULL;
    
    RAISE NOTICE 'Assigned evaluations to account';
    
    -- Step 12: Assign all job_platforms to the default account
    -- Get account_id from the job's account
    UPDATE "public"."job_platforms" jp
    SET "account_id" = j."account_id"
    FROM "public"."jobs" j
    WHERE jp."job_id" = j."id"
    AND jp."account_id" IS NULL
    AND j."account_id" IS NOT NULL;
    
    -- For any job_platforms without jobs, assign to default account
    UPDATE "public"."job_platforms"
    SET "account_id" = default_account_id
    WHERE "account_id" IS NULL;
    
    RAISE NOTICE 'Assigned job platforms to account';
    
    -- Step 13: Assign platform_integrations to the default account (only user-specific ones)
    -- System-wide integrations (user_id IS NULL) stay NULL
    UPDATE "public"."platform_integrations"
    SET "account_id" = default_account_id
    WHERE "user_id" IS NOT NULL
    AND "account_id" IS NULL;
    
    RAISE NOTICE 'Assigned platform integrations to account';
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;

-- Verify migration: Count how many records were assigned
SELECT 
    'jobs' as table_name, 
    COUNT(*) as total_count,
    COUNT(account_id) as assigned_count
FROM "public"."jobs"
UNION ALL
SELECT 
    'candidates', 
    COUNT(*), 
    COUNT(account_id)
FROM "public"."candidates"
UNION ALL
SELECT 
    'account_members', 
    COUNT(*), 
    COUNT(*)
FROM "public"."account_members";

