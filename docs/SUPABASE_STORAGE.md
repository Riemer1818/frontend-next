# Supabase Storage Setup

## Overview

All PDF documents (invoices, expenses, attachments, receipts) are now stored in **Supabase Storage** instead of the local filesystem or database bytea columns.

## Storage Bucket

- **Bucket Name**: `documents`
- **Access**: Public (anyone with the URL can access)
- **File Size Limit**: 50MB
- **Allowed Types**: PDF, PNG, JPEG

## Base URL

```
https://gpldooeeojaodnzsdmgb.supabase.co/storage/v1/object/public/documents/
```

## Directory Structure

```
documents/
├── invoices/                  # Client invoices (5 files)
│   └── {invoice_number}.pdf   # e.g., INV-20251210-1.pdf
├── expenses/                  # Supplier/incoming invoices (11 files)
│   └── expense_{id}.pdf       # e.g., expense_118.pdf
├── email-attachments/         # Email attachments (60 files)
│   └── {id}_{filename}.pdf    # e.g., 100_scaleway-invoice-2026-03.pdf
├── invoice-attachments/       # Invoice attachments (66 files)
│   └── expense_{id}_{filename}.pdf
└── receipts/                  # Receipts (0 files currently)
    └── expense_{id}_{filename}.pdf
```

## Total Files

**142 PDFs** successfully uploaded and accessible:
- 5 invoices
- 11 expenses
- 60 email attachments
- 66 invoice attachments
- 0 receipts

## Usage in Code

### Storage Utility Functions

Location: [`lib/supabase/storage.ts`](../lib/supabase/storage.ts)

```typescript
import {
  uploadFile,
  uploadPdfFromBase64,
  getPublicUrl,
  downloadFile,
  deleteFile,
  getInvoicePdfPath,
  getExpensePdfPath,
} from '@/lib/supabase/storage';
```

### Example: Upload a PDF

```typescript
// Upload from File object
const result = await uploadFile(file, 'invoices/INV-2026-001.pdf', {
  contentType: 'application/pdf',
  upsert: true,
});

// Upload from base64
const result = await uploadPdfFromBase64(
  base64Data,
  'expenses/expense_123.pdf',
  { upsert: true }
);
```

### Example: Get Public URL

```typescript
// For invoices
const url = getPublicUrl(getInvoicePdfPath('INV-20251210-1'));
// Returns: https://gpldooeeojaodnzsdmgb.supabase.co/storage/v1/object/public/documents/invoices/INV-20251210-1.pdf

// For expenses
const url = getPublicUrl(getExpensePdfPath(118));
// Returns: https://gpldooeeojaodnzsdmgb.supabase.co/storage/v1/object/public/documents/expenses/expense_118.pdf
```

## Frontend Implementation

### Invoice Detail Page

Location: [`app/invoices/[id]/page.tsx`](../app/invoices/[id]/page.tsx)

PDFs are loaded directly from Supabase Storage:

```tsx
<iframe
  src={`https://gpldooeeojaodnzsdmgb.supabase.co/storage/v1/object/public/documents/invoices/${invoice.invoice_number}.pdf`}
  className="w-full h-full"
  title="Invoice PDF"
/>
```

### Expense Detail Page

Location: [`app/expenses/[id]/page.tsx`](../app/expenses/[id]/page.tsx)

Similar implementation for expenses:

```tsx
<iframe
  src={`https://gpldooeeojaodnzsdmgb.supabase.co/storage/v1/object/public/documents/expenses/expense_${id}.pdf`}
  className="w-full h-full"
  title="Expense Invoice PDF"
/>
```

## Migration

All PDFs were extracted from the SQL backup file and uploaded to Supabase Storage using:

### Extraction Script

Location: [`scripts/extract-pdfs-from-sql.py`](../scripts/extract-pdfs-from-sql.py)

Extracts PDFs from PostgreSQL backup file by:
1. Reading gzipped SQL dump
2. Parsing COPY statements for tables with PDF columns
3. Converting hex-encoded bytea to binary
4. Validating PDF magic bytes (`%PDF`)
5. Saving to local filesystem

### Upload Script

Location: [`scripts/upload-pdfs-to-storage.ts`](../scripts/upload-pdfs-to-storage.ts)

Uploads all PDFs from local filesystem to Supabase Storage:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://... \
SUPABASE_SERVICE_ROLE_KEY=... \
npx tsx scripts/upload-pdfs-to-storage.ts
```

## Database Schema

### Current State

PDFs are **not stored in the database** anymore. The database only contains:
- Invoice/expense metadata (amounts, dates, status, etc.)
- References to Supabase Storage paths (can be added if needed)

### Legacy Columns

The following columns may still exist but are **not used**:
- `backoffice_invoices.pdf_file` (bytea) - **Deprecated**
- Email/attachment file data columns - **Migrated to Storage**

## Benefits

1. **Performance**: No more large bytea queries
2. **Scalability**: Supabase Storage handles large files efficiently
3. **CDN**: Built-in CDN for fast global access
4. **Separation**: Clear separation between metadata (DB) and files (Storage)
5. **Easy Access**: Public URLs can be shared directly

## Future Improvements

1. **Add storage_path column** to database tables for explicit tracking
2. **Implement cleanup** for orphaned files
3. **Add versioning** for document updates
4. **Implement access control** for sensitive documents (currently all public)
5. **Add thumbnails** for preview functionality

## Troubleshooting

### PDF Not Found (404)

Check:
1. File was uploaded: Use Supabase Dashboard → Storage → documents
2. Correct path format: `invoices/INV-xxx.pdf` or `expenses/expense_xxx.pdf`
3. Bucket is public: Settings → Storage → documents → Make public

### Upload Fails

Check:
1. Service role key is set correctly
2. File size is under 50MB
3. File type is allowed (PDF, PNG, JPEG)
4. Bucket exists and is accessible

### CORS Issues

If accessing from browser, ensure:
1. Supabase project has correct CORS settings
2. Using public URL format (not signed URL for public access)

## References

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage REST API](https://supabase.com/docs/reference/javascript/storage-createbucket)
