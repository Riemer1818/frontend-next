-- ============================================
-- MIGRATION: Link Unlinked Expenses to Suppliers
-- Creates missing supplier companies and links existing expenses
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Create missing supplier companies
-- ============================================

-- Create companies for suppliers that don't exist yet
INSERT INTO backoffice_companies (name, type, is_active)
SELECT DISTINCT
  supplier_name,
  'supplier'::character varying,
  true
FROM backoffice_incoming_invoices
WHERE supplier_id IS NULL
  AND supplier_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM backoffice_companies c
    WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(supplier_name))
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 2: Link expenses to existing suppliers (exact match)
-- ============================================

UPDATE backoffice_incoming_invoices ii
SET supplier_id = c.id
FROM backoffice_companies c
WHERE ii.supplier_id IS NULL
  AND ii.supplier_name IS NOT NULL
  AND LOWER(TRIM(ii.supplier_name)) = LOWER(TRIM(c.name))
  AND c.type IN ('supplier', 'both');

-- ============================================
-- STEP 3: Link expenses to newly created suppliers
-- ============================================

UPDATE backoffice_incoming_invoices ii
SET supplier_id = c.id
FROM backoffice_companies c
WHERE ii.supplier_id IS NULL
  AND ii.supplier_name IS NOT NULL
  AND LOWER(TRIM(ii.supplier_name)) = LOWER(TRIM(c.name))
  AND c.type IN ('supplier', 'both');

-- ============================================
-- STEP 4: Create a function to auto-link future expenses
-- ============================================

CREATE OR REPLACE FUNCTION auto_link_expense_to_supplier()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if supplier_id is NULL but supplier_name exists
  IF NEW.supplier_id IS NULL AND NEW.supplier_name IS NOT NULL THEN
    -- Try to find existing company by exact name match
    SELECT id INTO NEW.supplier_id
    FROM backoffice_companies
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(NEW.supplier_name))
      AND type IN ('supplier', 'both')
    LIMIT 1;

    -- If no match found, create new supplier company
    IF NEW.supplier_id IS NULL THEN
      INSERT INTO backoffice_companies (name, type, is_active)
      VALUES (NEW.supplier_name, 'supplier', true)
      RETURNING id INTO NEW.supplier_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 5: Create trigger for auto-linking
-- ============================================

DROP TRIGGER IF EXISTS trigger_auto_link_expense_to_supplier ON backoffice_incoming_invoices;

CREATE TRIGGER trigger_auto_link_expense_to_supplier
  BEFORE INSERT OR UPDATE ON backoffice_incoming_invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_expense_to_supplier();

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  unlinked_count INTEGER;
  total_suppliers INTEGER;
  linked_count INTEGER;
BEGIN
  -- Count unlinked expenses with supplier names
  SELECT COUNT(*) INTO unlinked_count
  FROM backoffice_incoming_invoices
  WHERE supplier_id IS NULL AND supplier_name IS NOT NULL;

  -- Count total supplier companies
  SELECT COUNT(*) INTO total_suppliers
  FROM backoffice_companies
  WHERE type IN ('supplier', 'both');

  -- Count linked expenses
  SELECT COUNT(*) INTO linked_count
  FROM backoffice_incoming_invoices
  WHERE supplier_id IS NOT NULL;

  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '   Total supplier companies: %', total_suppliers;
  RAISE NOTICE '   Linked expenses: %', linked_count;
  RAISE NOTICE '   Remaining unlinked (with supplier_name): %', unlinked_count;

  IF unlinked_count > 0 THEN
    RAISE NOTICE '⚠️  Some expenses still unlinked - check supplier_name values';
  END IF;
END $$;

COMMIT;

-- ============================================
-- NOTES
-- ============================================
-- This migration:
-- 1. Creates missing supplier companies from expense supplier_name field
-- 2. Links all expenses to their suppliers using exact name matching
-- 3. Sets up automatic linking for future expenses via trigger
-- 4. Handles case-insensitive matching with TRIM for better accuracy
--
-- Future expenses will be automatically linked when inserted!
-- ============================================
