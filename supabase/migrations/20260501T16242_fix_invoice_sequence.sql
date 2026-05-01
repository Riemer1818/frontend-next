-- Fix invoice sequence to prevent duplicate key errors
-- Generated: 2026-05-01T16:24:22.227Z

SELECT setval('backoffice_invoices_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM backoffice_invoices), false);
