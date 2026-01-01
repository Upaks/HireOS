-- ============================================================
-- MULTI-TENANT MIGRATION - PHASE 1: Add New Tables
-- ============================================================
-- This script creates the accounts and account_members tables
-- SAFE: Only adds new tables, doesn't modify existing ones
-- ============================================================

-- Step 1: Create accounts table
-- This table stores each company/workspace
CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" integer NOT NULL,
    "name" text NOT NULL,
    "created_at" timestamp without time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- Create sequence for accounts table
CREATE SEQUENCE IF NOT EXISTS "public"."accounts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."accounts_id_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."accounts_id_seq" OWNED BY "public"."accounts"."id";

-- Set default for accounts.id
ALTER TABLE ONLY "public"."accounts" 
    ALTER COLUMN "id" SET DEFAULT nextval('"public"."accounts_id_seq"'::regclass);

-- Add comment
COMMENT ON TABLE "public"."accounts" IS 'Multi-tenant accounts/workspaces - each company gets one account';

-- Step 2: Create account_members table
-- This table links users to accounts and stores their role per account
CREATE TABLE IF NOT EXISTS "public"."account_members" (
    "id" integer NOT NULL,
    "account_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "role" text NOT NULL DEFAULT 'hiringManager'::text,
    "joined_at" timestamp without time zone DEFAULT now() NOT NULL,
    "invited_by_id" integer,
    CONSTRAINT "account_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "account_members_account_id_user_id_unique" UNIQUE ("account_id", "user_id")
);

-- Create sequence for account_members table
CREATE SEQUENCE IF NOT EXISTS "public"."account_members_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."account_members_id_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."account_members_id_seq" OWNED BY "public"."account_members"."id";

-- Set default for account_members.id
ALTER TABLE ONLY "public"."account_members" 
    ALTER COLUMN "id" SET DEFAULT nextval('"public"."account_members_id_seq"'::regclass);

-- Add foreign key constraints
ALTER TABLE ONLY "public"."account_members"
    ADD CONSTRAINT "account_members_account_id_accounts_id_fk" 
    FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."account_members"
    ADD CONSTRAINT "account_members_user_id_users_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."account_members"
    ADD CONSTRAINT "account_members_invited_by_id_users_id_fk" 
    FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id");

-- Add comments
COMMENT ON TABLE "public"."account_members" IS 'Links users to accounts - users can belong to multiple accounts';
COMMENT ON COLUMN "public"."account_members"."role" IS 'User role within this specific account (replaces global users.role)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_account_members_account_id" 
    ON "public"."account_members" USING btree ("account_id");

CREATE INDEX IF NOT EXISTS "idx_account_members_user_id" 
    ON "public"."account_members" USING btree ("user_id");

-- Grant permissions (matching your existing schema pattern)
GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";

GRANT ALL ON SEQUENCE "public"."accounts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."accounts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."accounts_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."account_members" TO "anon";
GRANT ALL ON TABLE "public"."account_members" TO "authenticated";
GRANT ALL ON TABLE "public"."account_members" TO "service_role";

GRANT ALL ON SEQUENCE "public"."account_members_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."account_members_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."account_members_id_seq" TO "service_role";

