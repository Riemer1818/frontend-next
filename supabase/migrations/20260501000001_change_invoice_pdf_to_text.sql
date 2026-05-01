-- Change pdf_file column from BYTEA to TEXT to store storage paths instead of binary data
-- This allows us to store paths like "invoices/INV-20260501-1.pdf" instead of raw PDF bytes

-- First, clear any existing binary data
UPDATE backoffice_invoices SET pdf_file = NULL WHERE pdf_file IS NOT NULL;

-- Then change the column type
ALTER TABLE backoffice_invoices
ALTER COLUMN pdf_file TYPE TEXT USING pdf_file::TEXT;

-- Add a comment to document the new usage
COMMENT ON COLUMN backoffice_invoices.pdf_file IS 'Storage path to PDF in Supabase Storage (e.g., "invoices/INV-20260501-1.pdf")';
