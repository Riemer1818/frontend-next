-- Migration: Move invoice attachments from database bytea to storage bucket
-- This adds storage_path and storage_bucket columns to track files in Supabase Storage

-- Step 1: Add new columns for storage-based file management
ALTER TABLE backoffice_invoice_attachments
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS storage_bucket VARCHAR(100) DEFAULT 'documents';

-- Step 2: Add index for faster lookups by storage path
CREATE INDEX IF NOT EXISTS idx_invoice_attachments_storage_path
ON backoffice_invoice_attachments(storage_path) WHERE storage_path IS NOT NULL;

-- Step 3: Add comment explaining the migration
COMMENT ON COLUMN backoffice_invoice_attachments.storage_path IS
'Path to file in Supabase Storage bucket. Format: invoices/{invoice_id}/{attachment_id}_{filename}. If NULL, file is still in file_data column (legacy).';

COMMENT ON COLUMN backoffice_invoice_attachments.storage_bucket IS
'Supabase Storage bucket name where file is stored. Default: documents';

-- Step 4: Rename old columns to indicate they are deprecated
-- We keep them temporarily for the migration script, but will drop them later
COMMENT ON COLUMN backoffice_invoice_attachments.file_data IS
'DEPRECATED: Legacy binary storage. New files should use storage_path instead. Will be removed after migration.';

-- Note: The actual file migration from bytea to storage will be done via a script
-- After all files are migrated and verified, we can drop the file_data column:
-- ALTER TABLE backoffice_invoice_attachments DROP COLUMN file_data;
