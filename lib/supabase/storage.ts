import { supabase } from './client';

const STORAGE_BUCKET = 'documents';

export interface UploadFileResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  file: File | Blob,
  path: string,
  options?: {
    contentType?: string;
    upsert?: boolean;
  }
): Promise<UploadFileResult> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        contentType: options?.contentType,
        upsert: options?.upsert ?? false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    const publicUrl = getPublicUrl(path);
    return { success: true, publicUrl };
  } catch (err) {
    console.error('Upload exception:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Upload a PDF from base64 data
 */
export async function uploadPdfFromBase64(
  base64Data: string,
  path: string,
  options?: { upsert?: boolean }
): Promise<UploadFileResult> {
  try {
    // Convert base64 to blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    return uploadFile(blob, path, {
      contentType: 'application/pdf',
      upsert: options?.upsert,
    });
  } catch (err) {
    console.error('Base64 conversion error:', err);
    return { success: false, error: String(err) };
  }
}


/**
 * Get public URL for a file
 */
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Download a file as blob
 */
export async function downloadFile(path: string): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(path);

    if (error) {
      console.error('Download error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Download exception:', err);
    return null;
  }
}

/**
 * Delete a file
 */
export async function deleteFile(path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Delete exception:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * List files in a directory
 */
export async function listFiles(path: string = '') {
  try {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(path);

    if (error) {
      console.error('List error:', error);
      return [];
    }

    return data;
  } catch (err) {
    console.error('List exception:', err);
    return [];
  }
}

/**
 * Get storage path for an invoice PDF
 */
export function getInvoicePdfPath(invoiceNumber: string): string {
  return `invoices/${invoiceNumber}.pdf`;
}

/**
 * Get storage path for an expense PDF
 */
export function getExpensePdfPath(expenseId: number | string): string {
  return `expenses/expense_${expenseId}.pdf`;
}

/**
 * Get storage path for an email attachment
 */
export function getEmailAttachmentPath(attachmentId: number | string, filename: string): string {
  return `email-attachments/${attachmentId}_${filename}`;
}

/**
 * Get storage path for an invoice attachment
 */
export function getInvoiceAttachmentPath(expenseId: number | string, filename: string): string {
  return `invoice-attachments/expense_${expenseId}_${filename}`;
}

/**
 * Get storage path for a receipt
 */
export function getReceiptPath(expenseId: number | string, filename: string): string {
  return `receipts/expense_${expenseId}_${filename}`;
}
