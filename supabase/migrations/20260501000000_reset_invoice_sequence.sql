-- Reset the invoice ID sequence to the correct value
-- This dynamically sets it to MAX(id) + 1 to prevent duplicate key errors
-- Note: The sequence might still be named 'invoices_id_seq' if it wasn't renamed during migration
SELECT setval(pg_get_serial_sequence('backoffice_invoices', 'id'), (SELECT COALESCE(MAX(id), 0) + 1 FROM backoffice_invoices), false);
