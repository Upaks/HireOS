-- Fix script: Move users to their own accounts
-- This will create separate accounts for each user and move their data
-- Run this AFTER running diagnose_accounts.sql to see the current state

DO $$
DECLARE
    user_record RECORD;
    new_account_id integer;
    user_data_count integer;
BEGIN
    -- For each user, check if they should have their own account
    FOR user_record IN 
        SELECT DISTINCT u.id, u.username, u.full_name, u.email
        FROM users u
        INNER JOIN account_members am ON u.id = am.user_id
        WHERE am.account_id = (
            -- Get the "Default Account" ID
            SELECT id FROM accounts WHERE name = 'Default Account' LIMIT 1
        )
    LOOP
        -- Check if this user has any data
        SELECT COUNT(*) INTO user_data_count
        FROM (
            SELECT 1 FROM jobs WHERE submitter_id = user_record.id
            UNION ALL
            SELECT 1 FROM candidates WHERE submitter_id = user_record.id
        ) AS user_data;
        
        -- If user has data OR if we want to separate all users, create new account
        -- For now, let's create separate accounts for all users in Default Account
        -- You can modify this logic if needed
        
        -- Create new account for this user
        INSERT INTO accounts (name, created_at, updated_at)
        VALUES (
            COALESCE(user_record.full_name || '''s Account', user_record.username || '''s Account', 'User Account'),
            now(),
            now()
        )
        RETURNING id INTO new_account_id;
        
        -- Move user to new account
        UPDATE account_members
        SET account_id = new_account_id
        WHERE user_id = user_record.id;
        
        -- Move user's jobs to new account
        UPDATE jobs
        SET account_id = new_account_id
        WHERE submitter_id = user_record.id
        AND account_id = (SELECT id FROM accounts WHERE name = 'Default Account' LIMIT 1);
        
        -- Move user's candidates to new account
        UPDATE candidates
        SET account_id = new_account_id
        WHERE submitter_id = user_record.id
        AND account_id = (SELECT id FROM accounts WHERE name = 'Default Account' LIMIT 1);
        
        -- Move related data (interviews, offers, comments, etc.)
        UPDATE interviews
        SET account_id = new_account_id
        WHERE candidate_id IN (
            SELECT id FROM candidates WHERE account_id = new_account_id
        );
        
        UPDATE offers
        SET account_id = new_account_id
        WHERE candidate_id IN (
            SELECT id FROM candidates WHERE account_id = new_account_id
        );
        
        UPDATE comments
        SET account_id = new_account_id
        WHERE (entity_type = 'job' AND entity_id IN (SELECT id FROM jobs WHERE account_id = new_account_id))
           OR (entity_type = 'candidate' AND entity_id IN (SELECT id FROM candidates WHERE account_id = new_account_id));
        
        UPDATE activity_logs
        SET account_id = new_account_id
        WHERE user_id = user_record.id
        AND account_id = (SELECT id FROM accounts WHERE name = 'Default Account' LIMIT 1);
        
        UPDATE in_app_notifications
        SET account_id = new_account_id
        WHERE user_id = user_record.id
        AND account_id = (SELECT id FROM accounts WHERE name = 'Default Account' LIMIT 1);
        
        RAISE NOTICE 'Created account % for user % (%)', new_account_id, user_record.username, user_record.id;
    END LOOP;
    
    RAISE NOTICE 'Account separation completed!';
END $$;

-- Verify the separation
SELECT 
    a.id as account_id,
    a.name as account_name,
    COUNT(DISTINCT am.user_id) as user_count,
    COUNT(DISTINCT j.id) as job_count,
    COUNT(DISTINCT c.id) as candidate_count
FROM accounts a
LEFT JOIN account_members am ON a.id = am.account_id
LEFT JOIN jobs j ON a.id = j.account_id
LEFT JOIN candidates c ON a.id = c.account_id
GROUP BY a.id, a.name
ORDER BY a.id;

