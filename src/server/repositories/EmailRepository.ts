import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export interface EmailRecord {
  id: number;
  email_uid: string;
  subject: string | null;
  from_address: string;
  to_address: string | null;
  cc_address: string | null;
  bcc_address: string | null;
  email_date: Date;
  body_text: string | null;
  body_html: string | null;
  is_read: boolean;
  has_attachments: boolean;
  attachment_count: number;
  label: 'incoming_invoice' | 'receipt' | 'newsletter' | 'other' | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  processing_error: string | null;
  linked_invoice_id: number | null;
  linked_company_id: number | null;
  linked_contact_id: number | null;
  dismissed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface EmailAttachmentRecord {
  id: number;
  email_id: number;
  filename: string;
  mime_type: string;
  file_size: number;
  file_data: Buffer;
  created_at: Date;
}

export interface EmailFilters {
  is_read?: boolean;
  is_processed?: boolean;
  label?: 'incoming_invoice' | 'receipt' | 'newsletter' | 'other' | null;
  labelIsNull?: boolean;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  has_attachments?: boolean;
  from_address?: string;
  linked_company_id?: number;
  linked_contact_id?: number;
  limit?: number;
  offset?: number;
}

export interface EmailStats {
  total: number;
  unread: number;
  processed: number;
  pending: number;
  failed: number;
  with_attachments: number;
}

/**
 * Repository for email database operations
 */
export class EmailRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new email record
   */
  async create(data: {
    email_uid: string;
    subject: string | null;
    from_address: string;
    to_address: string | null;
    cc_address?: string | null;
    bcc_address?: string | null;
    email_date: Date;
    body_text: string | null;
    body_html?: string | null;
    is_read: boolean;
    has_attachments: boolean;
    attachment_count: number;
  }): Promise<EmailRecord> {
    const { data: email, error } = await this.supabase
      .from('backoffice_emails')
      .insert({
        email_uid: data.email_uid,
        subject: data.subject,
        from_address: data.from_address,
        to_address: data.to_address,
        cc_address: data.cc_address,
        bcc_address: data.bcc_address,
        email_date: data.email_date.toISOString(),
        body_text: data.body_text,
        body_html: data.body_html,
        is_read: data.is_read,
        has_attachments: data.has_attachments,
        attachment_count: data.attachment_count,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToEmailRecord(email);
  }

  /**
   * Create email attachment
   */
  async createAttachment(data: {
    email_id: number;
    filename: string;
    mime_type: string;
    file_size: number;
    file_data: Buffer;
  }): Promise<EmailAttachmentRecord> {
    const { data: attachment, error } = await this.supabase
      .from('backoffice_email_attachments')
      .insert({
        email_id: data.email_id,
        filename: data.filename,
        mime_type: data.mime_type,
        file_size: data.file_size,
        file_data: data.file_data,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToAttachmentRecord(attachment);
  }

  /**
   * Find email by ID
   */
  async findById(id: number): Promise<EmailRecord | null> {
    const { data, error } = await this.supabase
      .from('backoffice_emails')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return this.mapToEmailRecord(data);
  }

  /**
   * Find email by UID
   */
  async findByUid(uid: string): Promise<EmailRecord | null> {
    const { data, error } = await this.supabase
      .from('backoffice_emails')
      .select('*')
      .eq('email_uid', uid)
      .single();

    if (error) return null;
    return this.mapToEmailRecord(data);
  }

  /**
   * Check if email exists by UID
   */
  async existsByUid(uid: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('backoffice_emails')
      .select('*', { count: 'exact', head: true })
      .eq('email_uid', uid);

    if (error) return false;
    return (count || 0) > 0;
  }

  /**
   * List emails with filters
   */
  async list(filters: EmailFilters = {}): Promise<EmailRecord[]> {
    let query = this.supabase.from('backoffice_emails').select('*').order('email_date', { ascending: false });

    if (filters.is_read !== undefined) {
      query = query.eq('is_read', filters.is_read);
    }

    if (filters.label !== undefined) {
      if (filters.label === null) {
        query = query.is('label', null);
      } else {
        query = query.eq('label', filters.label);
      }
    }

    if (filters.labelIsNull) {
      query = query.is('label', null);
    }

    if (filters.processing_status) {
      query = query.eq('processing_status', filters.processing_status);
    }

    if (filters.has_attachments !== undefined) {
      query = query.eq('has_attachments', filters.has_attachments);
    }

    if (filters.from_address) {
      query = query.ilike('from_address', `%${filters.from_address}%`);
    }

    if (filters.linked_company_id) {
      query = query.eq('linked_company_id', filters.linked_company_id);
    }

    if (filters.linked_contact_id) {
      query = query.eq('linked_contact_id', filters.linked_contact_id);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(this.mapToEmailRecord);
  }

  /**
   * Get email attachments
   */
  async getAttachments(emailId: number): Promise<EmailAttachmentRecord[]> {
    const { data, error } = await this.supabase
      .from('backoffice_email_attachments')
      .select('*')
      .eq('email_id', emailId);

    if (error) throw error;
    return (data || []).map(this.mapToAttachmentRecord);
  }

  /**
   * Get single attachment
   */
  async getAttachment(attachmentId: number): Promise<EmailAttachmentRecord | null> {
    const { data, error } = await this.supabase
      .from('backoffice_email_attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (error) return null;
    return this.mapToAttachmentRecord(data);
  }

  /**
   * Mark email as read
   */
  async markAsRead(emailId: number): Promise<EmailRecord | null> {
    const { data, error } = await this.supabase
      .from('backoffice_emails')
      .update({ is_read: true })
      .eq('id', emailId)
      .select()
      .single();

    if (error) return null;
    return this.mapToEmailRecord(data);
  }

  /**
   * Update email processing status
   */
  async updateProcessingStatus(
    emailId: number,
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped',
    error?: string
  ): Promise<EmailRecord | null> {
    const { data, error: updateError } = await this.supabase
      .from('backoffice_emails')
      .update({
        processing_status: status,
        processing_error: error || null,
      })
      .eq('id', emailId)
      .select()
      .single();

    if (updateError) return null;
    return this.mapToEmailRecord(data);
  }

  /**
   * Update email label
   */
  async updateLabel(
    emailId: number,
    label: 'incoming_invoice' | 'receipt' | 'newsletter' | 'other' | null
  ): Promise<EmailRecord | null> {
    const { data, error } = await this.supabase
      .from('backoffice_emails')
      .update({ label })
      .eq('id', emailId)
      .select()
      .single();

    if (error) return null;
    return this.mapToEmailRecord(data);
  }

  /**
   * Link email to invoice
   */
  async linkToInvoice(emailId: number, invoiceId: number): Promise<EmailRecord | null> {
    const { data, error } = await this.supabase
      .from('backoffice_emails')
      .update({ linked_invoice_id: invoiceId })
      .eq('id', emailId)
      .select()
      .single();

    if (error) return null;
    return this.mapToEmailRecord(data);
  }

  /**
   * Link email to company
   */
  async linkToCompany(emailId: number, companyId: number | null): Promise<EmailRecord | null> {
    const { data, error } = await this.supabase
      .from('backoffice_emails')
      .update({ linked_company_id: companyId })
      .eq('id', emailId)
      .select()
      .single();

    if (error) return null;
    return this.mapToEmailRecord(data);
  }

  /**
   * Link email to contact
   */
  async linkToContact(emailId: number, contactId: number | null): Promise<EmailRecord | null> {
    const { data, error } = await this.supabase
      .from('backoffice_emails')
      .update({ linked_contact_id: contactId })
      .eq('id', emailId)
      .select()
      .single();

    if (error) return null;
    return this.mapToEmailRecord(data);
  }

  /**
   * Get email statistics
   */
  async getStats(): Promise<EmailStats> {
    const { count: total } = await this.supabase
      .from('backoffice_emails')
      .select('*', { count: 'exact', head: true });

    const { count: unread } = await this.supabase
      .from('backoffice_emails')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    const { count: processed } = await this.supabase
      .from('backoffice_emails')
      .select('*', { count: 'exact', head: true })
      .eq('processing_status', 'completed');

    const { count: pending } = await this.supabase
      .from('backoffice_emails')
      .select('*', { count: 'exact', head: true })
      .eq('processing_status', 'pending');

    const { count: failed } = await this.supabase
      .from('backoffice_emails')
      .select('*', { count: 'exact', head: true })
      .eq('processing_status', 'failed');

    const { count: with_attachments } = await this.supabase
      .from('backoffice_emails')
      .select('*', { count: 'exact', head: true })
      .eq('has_attachments', true);

    return {
      total: total || 0,
      unread: unread || 0,
      processed: processed || 0,
      pending: pending || 0,
      failed: failed || 0,
      with_attachments: with_attachments || 0,
    };
  }

  /**
   * Auto-match email sender to company/contact
   */
  async autoMatchCompanyContact(email: string): Promise<{ companyId: number | null; contactId: number | null }> {
    // Try to find a contact by email
    const { data: contact } = await this.supabase
      .from('contacts')
      .select('id, company_id')
      .eq('email', email)
      .single();

    if (contact) {
      return {
        contactId: contact.id,
        companyId: contact.company_id || null,
      };
    }

    // Try to find a company by domain
    const domain = email.split('@')[1];
    if (domain) {
      const { data: company } = await this.supabase
        .from('companies')
        .select('id')
        .ilike('website', `%${domain}%`)
        .single();

      if (company) {
        return {
          contactId: null,
          companyId: company.id,
        };
      }
    }

    return {
      contactId: null,
      companyId: null,
    };
  }

  /**
   * Map database record to EmailRecord
   */
  private mapToEmailRecord(data: any): EmailRecord {
    return {
      id: data.id,
      email_uid: data.email_uid,
      subject: data.subject,
      from_address: data.from_address,
      to_address: data.to_address,
      cc_address: data.cc_address,
      bcc_address: data.bcc_address,
      email_date: new Date(data.email_date),
      body_text: data.body_text,
      body_html: data.body_html,
      is_read: data.is_read,
      has_attachments: data.has_attachments,
      attachment_count: data.attachment_count,
      label: data.label,
      processing_status: data.processing_status,
      processing_error: data.processing_error,
      linked_invoice_id: data.linked_invoice_id,
      linked_company_id: data.linked_company_id,
      linked_contact_id: data.linked_contact_id,
      dismissed: data.dismissed,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  /**
   * Map database record to EmailAttachmentRecord
   */
  private mapToAttachmentRecord(data: any): EmailAttachmentRecord {
    return {
      id: data.id,
      email_id: data.email_id,
      filename: data.filename,
      mime_type: data.mime_type,
      file_size: data.file_size,
      file_data: data.file_data,
      created_at: new Date(data.created_at),
    };
  }
}