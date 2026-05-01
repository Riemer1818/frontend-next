-- Reset the invoice ID sequence to start from 21
-- This will make the next invoice have ID = 21
ALTER SEQUENCE backoffice_invoices_id_seq RESTART WITH 21;
