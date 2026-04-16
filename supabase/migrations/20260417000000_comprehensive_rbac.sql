-- ============================================
-- COMPREHENSIVE ROLE-BASED ACCESS CONTROL
-- ============================================
-- Roles: viewer, accountant, editor, admin, riemer
-- ============================================

-- Drop existing user_profiles table if exists (we'll recreate with proper structure)
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Create user_profiles table
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'accountant', 'editor', 'admin', 'riemer')),
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER_PROFILES POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Riemer and admin can read all profiles
CREATE POLICY "Admin can read all profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role IN ('riemer', 'admin')
    )
  );

-- Only riemer can update profiles
CREATE POLICY "Only riemer can update profiles"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'riemer'
    )
  );

-- Only riemer can insert profiles
CREATE POLICY "Only riemer can insert profiles"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'riemer'
    )
  );

-- Only riemer can delete profiles
CREATE POLICY "Only riemer can delete profiles"
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'riemer'
    )
  );

-- ============================================
-- BACKOFFICE DATA POLICIES
-- ============================================
-- Roles that can access backoffice: accountant, editor, admin, riemer
-- ============================================

-- Helper function to check if user has backoffice access
CREATE OR REPLACE FUNCTION has_backoffice_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('accountant', 'editor', 'admin', 'riemer')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can write data
CREATE OR REPLACE FUNCTION can_write_data()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('editor', 'admin', 'riemer')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can manage financials
CREATE OR REPLACE FUNCTION can_manage_financials()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'riemer')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMPANIES & CONTACTS (Read: all backoffice users, Write: editor+)
-- ============================================

-- Companies
DROP POLICY IF EXISTS "Backoffice users can read companies" ON backoffice_companies;
CREATE POLICY "Backoffice users can read companies"
  ON backoffice_companies FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Editors can write companies" ON backoffice_companies;
CREATE POLICY "Editors can write companies"
  ON backoffice_companies FOR ALL
  TO authenticated
  USING (can_write_data())
  WITH CHECK (can_write_data());

-- Contacts
DROP POLICY IF EXISTS "Backoffice users can read contacts" ON backoffice_contacts;
CREATE POLICY "Backoffice users can read contacts"
  ON backoffice_contacts FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Editors can write contacts" ON backoffice_contacts;
CREATE POLICY "Editors can write contacts"
  ON backoffice_contacts FOR ALL
  TO authenticated
  USING (can_write_data())
  WITH CHECK (can_write_data());

-- Contact Associations
DROP POLICY IF EXISTS "Backoffice users can read contact_associations" ON backoffice_contact_associations;
CREATE POLICY "Backoffice users can read contact_associations"
  ON backoffice_contact_associations FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Editors can write contact_associations" ON backoffice_contact_associations;
CREATE POLICY "Editors can write contact_associations"
  ON backoffice_contact_associations FOR ALL
  TO authenticated
  USING (can_write_data())
  WITH CHECK (can_write_data());

-- ============================================
-- PROJECTS & TIME ENTRIES (Read: all backoffice users, Write: editor+)
-- ============================================

-- Projects
DROP POLICY IF EXISTS "Backoffice users can read projects" ON backoffice_projects;
CREATE POLICY "Backoffice users can read projects"
  ON backoffice_projects FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Editors can write projects" ON backoffice_projects;
CREATE POLICY "Editors can write projects"
  ON backoffice_projects FOR ALL
  TO authenticated
  USING (can_write_data())
  WITH CHECK (can_write_data());

-- Time Entries
DROP POLICY IF EXISTS "Backoffice users can read time_entries" ON backoffice_time_entries;
CREATE POLICY "Backoffice users can read time_entries"
  ON backoffice_time_entries FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Editors can write time_entries" ON backoffice_time_entries;
CREATE POLICY "Editors can write time_entries"
  ON backoffice_time_entries FOR ALL
  TO authenticated
  USING (can_write_data())
  WITH CHECK (can_write_data());

-- Time Entry Contacts
DROP POLICY IF EXISTS "Backoffice users can read time_entry_contacts" ON backoffice_time_entry_contacts;
CREATE POLICY "Backoffice users can read time_entry_contacts"
  ON backoffice_time_entry_contacts FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Editors can write time_entry_contacts" ON backoffice_time_entry_contacts;
CREATE POLICY "Editors can write time_entry_contacts"
  ON backoffice_time_entry_contacts FOR ALL
  TO authenticated
  USING (can_write_data())
  WITH CHECK (can_write_data());

-- ============================================
-- INVOICES & FINANCIALS (Read: accountant+, Write: admin+)
-- ============================================

-- Invoices
DROP POLICY IF EXISTS "Accountants can read invoices" ON backoffice_invoices;
CREATE POLICY "Accountants can read invoices"
  ON backoffice_invoices FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Admins can write invoices" ON backoffice_invoices;
CREATE POLICY "Admins can write invoices"
  ON backoffice_invoices FOR ALL
  TO authenticated
  USING (can_manage_financials())
  WITH CHECK (can_manage_financials());

-- Invoice Items
DROP POLICY IF EXISTS "Accountants can read invoice_items" ON backoffice_invoice_items;
CREATE POLICY "Accountants can read invoice_items"
  ON backoffice_invoice_items FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Admins can write invoice_items" ON backoffice_invoice_items;
CREATE POLICY "Admins can write invoice_items"
  ON backoffice_invoice_items FOR ALL
  TO authenticated
  USING (can_manage_financials())
  WITH CHECK (can_manage_financials());

-- Invoice Time Entries
DROP POLICY IF EXISTS "Accountants can read invoice_time_entries" ON backoffice_invoice_time_entries;
CREATE POLICY "Accountants can read invoice_time_entries"
  ON backoffice_invoice_time_entries FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Admins can write invoice_time_entries" ON backoffice_invoice_time_entries;
CREATE POLICY "Admins can write invoice_time_entries"
  ON backoffice_invoice_time_entries FOR ALL
  TO authenticated
  USING (can_manage_financials())
  WITH CHECK (can_manage_financials());

-- Invoice Attachments
DROP POLICY IF EXISTS "Accountants can read invoice_attachments" ON backoffice_invoice_attachments;
CREATE POLICY "Accountants can read invoice_attachments"
  ON backoffice_invoice_attachments FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Admins can write invoice_attachments" ON backoffice_invoice_attachments;
CREATE POLICY "Admins can write invoice_attachments"
  ON backoffice_invoice_attachments FOR ALL
  TO authenticated
  USING (can_manage_financials())
  WITH CHECK (can_manage_financials());

-- Incoming Invoices
DROP POLICY IF EXISTS "Accountants can read incoming_invoices" ON backoffice_incoming_invoices;
CREATE POLICY "Accountants can read incoming_invoices"
  ON backoffice_incoming_invoices FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Admins can write incoming_invoices" ON backoffice_incoming_invoices;
CREATE POLICY "Admins can write incoming_invoices"
  ON backoffice_incoming_invoices FOR ALL
  TO authenticated
  USING (can_manage_financials())
  WITH CHECK (can_manage_financials());

-- Receipts
DROP POLICY IF EXISTS "Accountants can read receipts" ON backoffice_receipts;
CREATE POLICY "Accountants can read receipts"
  ON backoffice_receipts FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Admins can write receipts" ON backoffice_receipts;
CREATE POLICY "Admins can write receipts"
  ON backoffice_receipts FOR ALL
  TO authenticated
  USING (can_manage_financials())
  WITH CHECK (can_manage_financials());

-- ============================================
-- EMAILS (Read: all backoffice users, Write: admin+)
-- ============================================

DROP POLICY IF EXISTS "Backoffice users can read emails" ON backoffice_emails;
CREATE POLICY "Backoffice users can read emails"
  ON backoffice_emails FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Admins can write emails" ON backoffice_emails;
CREATE POLICY "Admins can write emails"
  ON backoffice_emails FOR ALL
  TO authenticated
  USING (can_manage_financials())
  WITH CHECK (can_manage_financials());

-- Email Attachments
DROP POLICY IF EXISTS "Backoffice users can read email_attachments" ON backoffice_email_attachments;
CREATE POLICY "Backoffice users can read email_attachments"
  ON backoffice_email_attachments FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Admins can write email_attachments" ON backoffice_email_attachments;
CREATE POLICY "Admins can write email_attachments"
  ON backoffice_email_attachments FOR ALL
  TO authenticated
  USING (can_manage_financials())
  WITH CHECK (can_manage_financials());

-- ============================================
-- TAX & BUSINESS INFO (Read: accountant+, Write: riemer only)
-- ============================================

-- Business Info
DROP POLICY IF EXISTS "Accountants can read business_info" ON backoffice_business_info;
CREATE POLICY "Accountants can read business_info"
  ON backoffice_business_info FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Only riemer can write business_info" ON backoffice_business_info;
CREATE POLICY "Only riemer can write business_info"
  ON backoffice_business_info FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'riemer')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'riemer')
  );

-- Expense Categories
DROP POLICY IF EXISTS "Accountants can read expense_categories" ON backoffice_expense_categories;
CREATE POLICY "Accountants can read expense_categories"
  ON backoffice_expense_categories FOR SELECT
  TO authenticated
  USING (has_backoffice_access());

DROP POLICY IF EXISTS "Admins can write expense_categories" ON backoffice_expense_categories;
CREATE POLICY "Admins can write expense_categories"
  ON backoffice_expense_categories FOR ALL
  TO authenticated
  USING (can_manage_financials())
  WITH CHECK (can_manage_financials());

-- Tax tables (read-only for accountant+)
DO $$
DECLARE
  tax_table TEXT;
  tax_tables TEXT[] := ARRAY[
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
  FOREACH tax_table IN ARRAY tax_tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Accountants can read %I" ON %I', tax_table, tax_table);
    EXECUTE format('
      CREATE POLICY "Accountants can read %I"
        ON %I FOR SELECT
        TO authenticated
        USING (has_backoffice_access())
    ', tax_table, tax_table);

    EXECUTE format('DROP POLICY IF EXISTS "Only riemer can write %I" ON %I', tax_table, tax_table);
    EXECUTE format('
      CREATE POLICY "Only riemer can write %I"
        ON %I FOR ALL
        TO authenticated
        USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = ''riemer''))
        WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = ''riemer''))
    ', tax_table, tax_table);
  END LOOP;
END $$;

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, role, full_name)
  VALUES (NEW.id, 'viewer', COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT ON public.user_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.user_profiles IS 'User profiles with role-based access control';
COMMENT ON COLUMN public.user_profiles.role IS 'User role: viewer (no access), accountant (read financials), editor (manage clients/projects), admin (manage financials), riemer (full access)';

-- ============================================
-- ROLE PERMISSION SUMMARY
-- ============================================
--
-- viewer:     No backoffice access
-- accountant: Read all data, no write access
-- editor:     Read all, write clients/contacts/projects/time, cannot touch financials
-- admin:      Read all, write all except user management and tax config
-- riemer:     Full access to everything
--
-- ============================================
