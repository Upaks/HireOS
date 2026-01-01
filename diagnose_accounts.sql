-- Diagnostic query to check account assignments and data isolation
-- Run this in your Supabase SQL editor to see what's happening

-- 1. Check all accounts
SELECT id, name, created_at FROM accounts ORDER BY id;

-- 2. Check all users and their account memberships
SELECT 
  u.id as user_id,
  u.username,
  u.email,
  u.full_name,
  am.account_id,
  am.role as account_role,
  a.name as account_name
FROM users u
LEFT JOIN account_members am ON u.id = am.user_id
LEFT JOIN accounts a ON am.account_id = a.id
ORDER BY u.id;

-- 3. Check data distribution by account
SELECT 
  'jobs' as table_name,
  account_id,
  COUNT(*) as count
FROM jobs
GROUP BY account_id
UNION ALL
SELECT 
  'candidates' as table_name,
  account_id,
  COUNT(*) as count
FROM candidates
GROUP BY account_id
UNION ALL
SELECT 
  'interviews' as table_name,
  account_id,
  COUNT(*) as count
FROM interviews
GROUP BY account_id
UNION ALL
SELECT 
  'comments' as table_name,
  account_id,
  COUNT(*) as count
FROM comments
GROUP BY account_id
ORDER BY table_name, account_id;

-- 4. Check if any users are in multiple accounts (shouldn't happen)
SELECT 
  user_id,
  COUNT(*) as account_count,
  STRING_AGG(account_id::text, ', ') as account_ids
FROM account_members
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 5. Check if any users are NOT in any account (shouldn't happen)
SELECT 
  u.id,
  u.username,
  u.email
FROM users u
LEFT JOIN account_members am ON u.id = am.user_id
WHERE am.user_id IS NULL;

