# Multi-Tenant Migration Guide

This migration adds multi-tenant (account/workspace) structure to your HireOS database.

## ⚠️ IMPORTANT: Read Before Running

1. **Backup your database first!** (Highly recommended)
2. Run these scripts in order (001, 002, 003, 004)
3. Test your application after each phase
4. Your code will continue working during Phases 1-3 (columns are nullable)

## Migration Phases

### Phase 1: `001_add_multi_tenant_structure.sql`
**What it does:**
- Creates `accounts` table (stores each company/workspace)
- Creates `account_members` table (links users to accounts)

**Safety:** ✅ SAFE - Only adds new empty tables

**Test:** Run this, then check:
```sql
SELECT * FROM accounts; -- Should be empty
SELECT * FROM account_members; -- Should be empty
```

---

### Phase 2: `002_add_account_id_columns.sql`
**What it does:**
- Adds `account_id` column to all relevant tables (jobs, candidates, interviews, etc.)
- Columns are **nullable** (so your existing code still works)

**Safety:** ✅ SAFE - Only adds columns, existing data unchanged

**Test:** Run this, then check:
```sql
-- These should all show the new account_id column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'jobs' AND column_name = 'account_id';
-- Should return 1 row
```

---

### Phase 3: `003_migrate_existing_data.sql`
**What it does:**
- Creates a "Default Account" 
- Assigns all existing users to this account
- Assigns all existing data (jobs, candidates, etc.) to this account
- Fills in all the `account_id` values we added in Phase 2

**Safety:** ✅ SAFE - Only fills in NULL values, doesn't delete anything

**⚠️ IMPORTANT:** This script creates an account named "Default Account". 
If you want a different name, edit the script before running.

**Test:** Run this, then check:
```sql
-- Should show 1 account
SELECT * FROM accounts;

-- Should show all your users
SELECT * FROM account_members;

-- Should show counts - all should have account_id filled
SELECT 
    'jobs' as table_name, 
    COUNT(*) as total,
    COUNT(account_id) as with_account_id
FROM jobs
UNION ALL
SELECT 'candidates', COUNT(*), COUNT(account_id) FROM candidates;
```

---

### Phase 4: `004_add_foreign_keys_and_indexes.sql`
**What it does:**
- Adds foreign key constraints (ensures account_id references valid accounts)
- Creates indexes for performance (makes queries faster)

**Safety:** ✅ SAFE - Only adds constraints/indexes

**Test:** Run this, then check:
```sql
-- Should show all the foreign key constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.constraint_name LIKE '%account_id%';
```

---

## Running the Migration

### Option 1: Run in Supabase SQL Editor

1. Go to your Supabase dashboard
2. Click "SQL Editor"
3. Copy and paste each script one at a time
4. Run each script
5. Test after each phase

### Option 2: Run via psql

```bash
psql "your-connection-string" -f migrations/001_add_multi_tenant_structure.sql
psql "your-connection-string" -f migrations/002_add_account_id_columns.sql
psql "your-connection-string" -f migrations/003_migrate_existing_data.sql
psql "your-connection-string" -f migrations/004_add_foreign_keys_and_indexes.sql
```

---

## Rollback Plan

If something goes wrong:

### Phase 1 Rollback:
```sql
DROP TABLE IF EXISTS account_members CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
```

### Phase 2 Rollback:
```sql
ALTER TABLE jobs DROP COLUMN IF EXISTS account_id;
ALTER TABLE candidates DROP COLUMN IF EXISTS account_id;
ALTER TABLE interviews DROP COLUMN IF EXISTS account_id;
ALTER TABLE offers DROP COLUMN IF EXISTS account_id;
ALTER TABLE comments DROP COLUMN IF EXISTS account_id;
ALTER TABLE activity_logs DROP COLUMN IF EXISTS account_id;
ALTER TABLE form_templates DROP COLUMN IF EXISTS account_id;
ALTER TABLE in_app_notifications DROP COLUMN IF EXISTS account_id;
ALTER TABLE evaluations DROP COLUMN IF EXISTS account_id;
ALTER TABLE job_platforms DROP COLUMN IF EXISTS account_id;
ALTER TABLE platform_integrations DROP COLUMN IF EXISTS account_id;
```

### Phase 3 Rollback:
- Data is already assigned, but you can delete the default account if needed:
```sql
DELETE FROM accounts WHERE name = 'Default Account';
-- This will cascade delete account_members due to foreign key
```

### Phase 4 Rollback:
```sql
-- Drop foreign keys (you'll need to drop them individually)
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_account_id_accounts_id_fk;
-- Repeat for all tables...
```

---

## After Migration

✅ Your database now has multi-tenant structure
✅ All your existing data belongs to "Default Account"
✅ Your code still works (columns are nullable)
⏳ Next step: Update your application code to use account_id filtering (separate task)

---

## Questions?

- **Q: Will this break my app?**  
  A: No, columns are nullable. Your code will continue working until you update it.

- **Q: Can I change the account name later?**  
  A: Yes, just UPDATE the accounts table.

- **Q: What if I have multiple companies already?**  
  A: All data goes to one account for now. You can manually split it later or ask for a custom migration script.

