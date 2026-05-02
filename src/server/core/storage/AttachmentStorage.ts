/**
 * AttachmentStorage: Helper for storing invoice attachments in Supabase Storage
 *
 * Best practice: Store file metadata in database, binary data in object storage
 */

import { createClient } from '@supabase/supabase-js';

const STORAGE_BUCKET = 'documents';

interface UploadAttachmentParams {
  invoiceId: number;
  file: {
    data: Buffer;
    filename: string;
    mimeType: string;
    size: number;
  };
  attachmentType?: 'invoice' | 'receipt' | 'other';
}

interface AttachmentRecord {
  id: number;
  storage_path: string;
  storage_bucket: string;
}

export class AttachmentStorage {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Upload attachment using best practices:
   * 1. Create database record (get ID)
   * 2. Upload to storage with path: invoices/{invoiceId}/{attachmentId}_{filename}
   * 3. Update database with storage_path
   */
  async uploadAttachment(params: UploadAttachmentParams): Promise<AttachmentRecord> {
    const { invoiceId, file, attachmentType = 'invoice' } = params;

    // Step 1: Create database record
    const { data: attachment, error: insertError } = await this.supabase
      .from('backoffice_invoice_attachments')
      .insert([
        {
          incoming_invoice_id: invoiceId,
          file_name: file.filename,
          file_type: file.mimeType,
          file_size: file.size,
          attachment_type: attachmentType,
          storage_bucket: STORAGE_BUCKET,
        },
      ])
      .select('id')
      .single();

    if (insertError || !attachment) {
      throw new Error(`Failed to create attachment record: ${insertError?.message}`);
    }

    // Step 2: Upload to storage
    const storagePath = `invoices/${invoiceId}/${attachment.id}_${file.filename}`;

    const { error: uploadError } = await this.supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file.data, {
        contentType: file.mimeType,
        upsert: false
      });

    if (uploadError) {
      // Rollback: delete database record
      await this.supabase
        .from('backoffice_invoice_attachments')
        .delete()
        .eq('id', attachment.id);
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    // Step 3: Update database with storage path
    const { error: updateError } = await this.supabase
      .from('backoffice_invoice_attachments')
      .update({ storage_path: storagePath })
      .eq('id', attachment.id);

    if (updateError) {
      // Try to clean up storage
      await this.supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      throw new Error(`Failed to update storage path: ${updateError.message}`);
    }

    return {
      id: attachment.id,
      storage_path: storagePath,
      storage_bucket: STORAGE_BUCKET
    };
  }

  /**
   * Upload multiple attachments for a single invoice
   */
  async uploadMultiple(
    invoiceId: number,
    files: Array<{
      data: Buffer;
      filename: string;
      mimeType: string;
      size: number;
      type?: 'invoice' | 'receipt' | 'other';
    }>
  ): Promise<AttachmentRecord[]> {
    const results: AttachmentRecord[] = [];

    for (const file of files) {
      const attachmentType = file.type || (file.filename.toLowerCase().includes('receipt') ? 'receipt' : 'invoice');

      try {
        const result = await this.uploadAttachment({
          invoiceId,
          file: {
            data: file.data,
            filename: file.filename,
            mimeType: file.mimeType,
            size: file.size
          },
          attachmentType
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.filename}:`, error);
        // Continue with other files even if one fails
      }
    }

    return results;
  }

  /**
   * Get public URL for an attachment
   */
  getPublicUrl(storagePath: string, bucket: string = STORAGE_BUCKET): string {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  /**
   * Delete attachment (both storage and database)
   */
  async deleteAttachment(attachmentId: number): Promise<void> {
    // Get storage path first
    const { data: attachment } = await this.supabase
      .from('backoffice_invoice_attachments')
      .select('storage_path, storage_bucket')
      .eq('id', attachmentId)
      .single();

    if (attachment?.storage_path && attachment?.storage_bucket) {
      // Delete from storage
      await this.supabase.storage
        .from(attachment.storage_bucket)
        .remove([attachment.storage_path]);
    }

    // Delete database record
    await this.supabase
      .from('backoffice_invoice_attachments')
      .delete()
      .eq('id', attachmentId);
  }
}
