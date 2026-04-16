-- ============================================
-- UNIFIED SUPABASE SCHEMA MIGRATION
-- Merging website (public chat) + frontend-next (backoffice)
-- ============================================
--
-- This migration renames all tables to have clear prefixes:
-- - public_*     : Website public-facing tables (chat)
-- - backoffice_* : Private business administration tables
--
-- Date: 2026-04-16
-- ============================================

-- ============================================
-- STEP 1: RENAME BACKOFFICE TABLES
-- All existing business tables get 'backoffice_' prefix
-- ============================================

-- Core business tables
ALTER TABLE IF EXISTS business_info RENAME TO backoffice_business_info;
ALTER TABLE IF EXISTS companies RENAME TO backoffice_companies;
ALTER TABLE IF EXISTS contacts RENAME TO backoffice_contacts;
ALTER TABLE IF EXISTS contact_associations RENAME TO backoffice_contact_associations;

-- Project & time tracking
ALTER TABLE IF EXISTS projects RENAME TO backoffice_projects;
ALTER TABLE IF EXISTS time_entries RENAME TO backoffice_time_entries;
ALTER TABLE IF EXISTS time_entry_contacts RENAME TO backoffice_time_entry_contacts;

-- Invoicing
ALTER TABLE IF EXISTS invoices RENAME TO backoffice_invoices;
ALTER TABLE IF EXISTS invoice_items RENAME TO backoffice_invoice_items;
ALTER TABLE IF EXISTS invoice_time_entries RENAME TO backoffice_invoice_time_entries;
ALTER TABLE IF EXISTS invoice_attachments RENAME TO backoffice_invoice_attachments;
ALTER TABLE IF EXISTS incoming_invoices RENAME TO backoffice_incoming_invoices;

-- Expenses
ALTER TABLE IF EXISTS receipts RENAME TO backoffice_receipts;
ALTER TABLE IF EXISTS expense_categories RENAME TO backoffice_expense_categories;

-- Email management
ALTER TABLE IF EXISTS emails RENAME TO backoffice_emails;
ALTER TABLE IF EXISTS email_attachments RENAME TO backoffice_email_attachments;

-- Tax system
ALTER TABLE IF EXISTS tax_rates RENAME TO backoffice_tax_rates;
ALTER TABLE IF EXISTS tax_years RENAME TO backoffice_tax_years;
ALTER TABLE IF EXISTS tax_config RENAME TO backoffice_tax_config;
ALTER TABLE IF EXISTS tax_benefits RENAME TO backoffice_tax_benefits;
ALTER TABLE IF EXISTS tax_credits RENAME TO backoffice_tax_credits;
ALTER TABLE IF EXISTS income_tax_brackets RENAME TO backoffice_income_tax_brackets;
ALTER TABLE IF EXISTS arbeidskorting_brackets RENAME TO backoffice_arbeidskorting_brackets;
ALTER TABLE IF EXISTS user_tax_settings RENAME TO backoffice_user_tax_settings;
ALTER TABLE IF EXISTS user_benefit_selections RENAME TO backoffice_user_benefit_selections;
ALTER TABLE IF EXISTS user_tax_credit_selections RENAME TO backoffice_user_tax_credit_selections;
ALTER TABLE IF EXISTS vat_payments RENAME TO backoffice_vat_payments;

-- ============================================
-- STEP 2: CREATE PUBLIC TABLES (Website Chat)
-- These are new tables for the website chat feature
-- ============================================

-- Conversations table for chat sessions
CREATE TABLE IF NOT EXISTS public_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table for chat history
CREATE TABLE IF NOT EXISTS public_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_public_messages_conversation_id ON public_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_public_messages_created_at ON public_messages(created_at);

-- ============================================
-- STEP 3: ROW LEVEL SECURITY (RLS)
-- Security policies to separate public vs private data
-- ============================================

-- ============================================
-- 3A. PUBLIC TABLES (Website Chat)
-- Allow public read, service role write
-- ============================================

-- Enable RLS on public tables
ALTER TABLE public_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read conversations" ON public_conversations;
DROP POLICY IF EXISTS "Service role can manage conversations" ON public_conversations;
DROP POLICY IF EXISTS "Anyone can read messages" ON public_messages;
DROP POLICY IF EXISTS "Service role can manage messages" ON public_messages;

-- Conversations: Public read, service write
CREATE POLICY "Anyone can read conversations"
  ON public_conversations FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage conversations"
  ON public_conversations FOR ALL
  USING (auth.role() = 'service_role');

-- Messages: Public read, service write
CREATE POLICY "Anyone can read messages"
  ON public_messages FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage messages"
  ON public_messages FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 3B. BACKOFFICE TABLES (Private Business Data)
-- ONLY service role can access (100% private)
-- ============================================

-- Enable RLS on all backoffice tables
ALTER TABLE backoffice_business_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_contact_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_time_entry_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_invoice_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_invoice_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_incoming_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_tax_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_tax_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_tax_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_tax_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_income_tax_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_arbeidskorting_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_user_tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_user_benefit_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_user_tax_credit_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice_vat_payments ENABLE ROW LEVEL SECURITY;

-- Create service-role-only policies for all backoffice tables
-- (This is a macro - applies same policy to all tables)

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'backoffice_business_info',
    'backoffice_companies',
    'backoffice_contacts',
    'backoffice_contact_associations',
    'backoffice_projects',
    'backoffice_time_entries',
    'backoffice_time_entry_contacts',
    'backoffice_invoices',
    'backoffice_invoice_items',
    'backoffice_invoice_time_entries',
    'backoffice_invoice_attachments',
    'backoffice_incoming_invoices',
    'backoffice_receipts',
    'backoffice_expense_categories',
    'backoffice_emails',
    'backoffice_email_attachments',
    'backoffice_tax_rates',
    'backoffice_tax_years',
    'backoffice_tax_config',
    'backoffice_tax_benefits',
    'backoffice_tax_credits',
    'backoffice_income_tax_brackets',
    'backoffice_arbeidskorting_brackets',
    'backoffice_user_tax_settings',
    'backoffice_user_benefit_selections',
    'backoffice_user_tax_credit_selections',
    'backoffice_vat_payments'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- Drop existing policy if it exists
    EXECUTE format('DROP POLICY IF EXISTS "Service role only" ON %I', tbl);

    -- Create new policy: Only service role can access
    EXECUTE format('
      CREATE POLICY "Service role only"
      ON %I FOR ALL
      USING (auth.role() = ''service_role'')
    ', tbl);
  END LOOP;
END $$;

-- ============================================
-- STEP 4: UPDATE VIEWS (if any exist)
-- Views need to reference new table names
-- ============================================

-- Drop and recreate views with new table names
-- (This will be populated based on actual views in your database)

-- Example (if you have views):
-- DROP VIEW IF EXISTS dashboard_stats CASCADE;
-- CREATE VIEW dashboard_stats AS
-- SELECT ... FROM backoffice_invoices ...;

-- ============================================
-- STEP 5: ADD HELPFUL COMMENTS
-- Document what each table is for
-- ============================================

COMMENT ON TABLE public_conversations IS 'Website: Chat conversation sessions (public-facing)';
COMMENT ON TABLE public_messages IS 'Website: Chat messages between users and AI assistant (public-facing)';

COMMENT ON TABLE backoffice_business_info IS 'Backoffice: Your business information (private)';
COMMENT ON TABLE backoffice_companies IS 'Backoffice: Client and supplier companies (private)';
COMMENT ON TABLE backoffice_projects IS 'Backoffice: Client projects (private)';
COMMENT ON TABLE backoffice_invoices IS 'Backoffice: Outgoing invoices (private)';
COMMENT ON TABLE backoffice_emails IS 'Backoffice: Fetched business emails via IMAP (private)';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE 'Public tables: public_conversations, public_messages';
  RAISE NOTICE 'Backoffice tables: All business tables now prefixed with backoffice_';
  RAISE NOTICE 'RLS enabled: Public tables allow read access, backoffice tables are service-only';
END $$;
