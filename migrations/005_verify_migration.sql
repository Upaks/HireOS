-- ============================================================
-- VERIFICATION SCRIPT - Run this to verify migration success
-- ============================================================

-- Check 1: Accounts table exists and has data
SELECT 
    'Accounts' as check_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM accounts;

-- Check 2: Account members exist
SELECT 
    'Account Members' as check_name,
    COUNT(*) as count,
    CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM account_members;

-- Check 3: All tables have account_id column with data
SELECT 
    'jobs' as table_name,
    COUNT(*) as total_rows,
    COUNT(account_id) as rows_with_account_id,
    CASE WHEN COUNT(*) = COUNT(account_id) THEN '✅ PASS' ELSE '⚠️ WARNING' END as status
FROM jobs
UNION ALL
SELECT 
    'candidates',
    COUNT(*),
    COUNT(account_id),
    CASE WHEN COUNT(*) = COUNT(account_id) THEN '✅ PASS' ELSE '⚠️ WARNING' END
FROM candidates
UNION ALL
SELECT 
    'interviews',
    COUNT(*),
    COUNT(account_id),
    CASE WHEN COUNT(*) = COUNT(account_id) THEN '✅ PASS' ELSE '⚠️ WARNING' END
FROM interviews
UNION ALL
SELECT 
    'offers',
    COUNT(*),
    COUNT(account_id),
    CASE WHEN COUNT(*) = COUNT(account_id) THEN '✅ PASS' ELSE '⚠️ WARNING' END
FROM offers
UNION ALL
SELECT 
    'comments',
    COUNT(*),
    COUNT(account_id),
    CASE WHEN COUNT(*) = COUNT(account_id) THEN '✅ PASS' ELSE '⚠️ WARNING' END
FROM comments;

-- Check 4: Foreign keys exist
SELECT 
    tc.table_name,
    tc.constraint_name,
    '✅ Foreign Key Exists' as status
FROM information_schema.table_constraints tc
WHERE tc.constraint_name LIKE '%account_id_accounts_id_fk'
ORDER BY tc.table_name;

-- Check 5: Indexes exist
SELECT 
    schemaname,
    tablename,
    indexname,
    '✅ Index Exists' as status
FROM pg_indexes
WHERE indexname LIKE '%account_id%'
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Summary: Show default account info
SELECT 
    a.id as account_id,
    a.name as account_name,
    COUNT(DISTINCT am.user_id) as member_count,
    COUNT(DISTINCT j.id) as job_count,
    COUNT(DISTINCT c.id) as candidate_count
FROM accounts a
LEFT JOIN account_members am ON a.id = am.account_id
LEFT JOIN jobs j ON a.id = j.account_id
LEFT JOIN candidates c ON a.id = c.account_id
GROUP BY a.id, a.name;

