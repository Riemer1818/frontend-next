import { supabase } from './client';
import { useSupabaseQuery, useSupabaseMutation, useInvalidateQuery } from './hooks';
import { DocumentEntity } from './types';

export type EmailLabel = 'incoming_invoice' | 'receipt' | 'newsletter' | 'other';

/**
 * Email model - extends DocumentEntity with email-specific fields
 */
export interface Email extends DocumentEntity {
  message_id?: string | null;
  from_address: string;
  from_name?: string | null;
  to_address: string;
  subject?: string | null;
  body_text?: string | null;
  body_html?: string | null;
  email_date: string;  // Use this as document_date equivalent
  is_read: boolean;
  label?: EmailLabel | null;
  linked_invoice_id?: number | null;
}

export interface EmailAttachment {
  id: number;
  email_id: number;
  filename: string;
  content_type: string;
  size: number;
  content_base64?: string | null;
  created_at?: string;
}

export interface EmailWithAttachments extends Email {
  attachments?: EmailAttachment[];
}

export interface EmailFilters {
  is_read?: boolean;
  label?: EmailLabel | null;
  has_attachments?: boolean;
  from_address?: string;
  linked_company_id?: number;
  linked_contact_id?: number;
}

export interface EmailStats {
  total_count: number;
  unread_count: number;
  unlabeled_count: number;
  by_label: Record<string, number>;
}

const QUERY_KEY = ['emails'];

// Fetch all emails with filters and pagination
export function useEmails(
  filters?: EmailFilters,
  showUnlabeledOnly?: boolean,
  page?: number,
  pageSize?: number
) {
  return useSupabaseQuery<{ emails: Email[]; total: number; page: number; pageSize: number }>(
    [...QUERY_KEY, 'list', JSON.stringify({ filters, showUnlabeledOnly, page, pageSize })],
    async () => {
      const currentPage = page || 1;
      const currentPageSize = pageSize || 50;
      const from = (currentPage - 1) * currentPageSize;
      const to = from + currentPageSize - 1;

      let query = supabase
        .from('backoffice_emails')
        .select('*', { count: 'exact' })
        .order('email_date', { ascending: false })
        .range(from, to);

      // Apply filters
      if (filters?.is_read !== undefined) {
        query = query.eq('is_read', filters.is_read);
      }

      if (filters?.label !== undefined) {
        if (filters.label === null) {
          query = query.is('label', null);
        } else {
          query = query.eq('label', filters.label);
        }
      }

      if (filters?.has_attachments !== undefined) {
        query = query.eq('has_attachments', filters.has_attachments);
      }

      if (filters?.from_address) {
        query = query.ilike('from_address', `%${filters.from_address}%`);
      }

      if (filters?.linked_company_id) {
        query = query.eq('linked_company_id', filters.linked_company_id);
      }

      if (filters?.linked_contact_id) {
        query = query.eq('linked_contact_id', filters.linked_contact_id);
      }

      // Show unlabeled only by default
      if (showUnlabeledOnly !== false) {
        query = query.is('label', null);
      }

      const { data, error, count } = await query;
      if (error) return { data: null, error };

      return {
        data: {
          emails: data || [],
          total: count || 0,
          page: currentPage,
          pageSize: currentPageSize,
        },
        error: null
      };
    }
  );
}

// Fetch single email
export function useEmail(id?: number) {
  return useSupabaseQuery<EmailWithAttachments>(
    [...QUERY_KEY, String(id)],
    async () => {
      const { data: email, error: emailError } = await supabase
        .from('backoffice_emails')
        .select('*')
        .eq('id', id!)
        .single();

      if (emailError) return { data: null, error: emailError };
      if (!email) return { data: null, error: new Error('Email not found') as any };

      // Get attachments
      const { data: attachments, error: attachmentsError } = await supabase
        .from('backoffice_email_attachments')
        .select('*')
        .eq('email_id', id!);

      if (attachmentsError) return { data: null, error: attachmentsError };

      return {
        data: {
          ...email,
          attachments: attachments || [],
        },
        error: null
      };
    },
    { enabled: !!id }
  );
}

// Get emails by company
export function useEmailsByCompany(companyId?: number) {
  return useSupabaseQuery<Email[]>(
    [...QUERY_KEY, 'by-company', String(companyId)],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_emails')
        .select('*')
        .eq('linked_company_id', companyId!)
        .order('email_date', { ascending: false })
        .limit(100);

      if (error) return { data: null, error };
      return { data: data || [], error: null };
    },
    { enabled: !!companyId }
  );
}

// Get emails by contact
export function useEmailsByContact(contactId?: number) {
  return useSupabaseQuery<Email[]>(
    [...QUERY_KEY, 'by-contact', String(contactId)],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_emails')
        .select('*')
        .eq('linked_contact_id', contactId!)
        .order('email_date', { ascending: false })
        .limit(100);

      if (error) return { data: null, error };
      return { data: data || [], error: null };
    },
    { enabled: !!contactId }
  );
}

// Get email statistics
export function useEmailStats() {
  return useSupabaseQuery<EmailStats>(
    [...QUERY_KEY, 'stats'],
    async () => {
      // Get total count
      const { count: totalCount, error: totalError } = await supabase
        .from('backoffice_emails')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Get unread count
      const { count: unreadCount, error: unreadError } = await supabase
        .from('backoffice_emails')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (unreadError) throw unreadError;

      // Get unlabeled count
      const { count: unlabeledCount, error: unlabeledError } = await supabase
        .from('backoffice_emails')
        .select('*', { count: 'exact', head: true })
        .is('label', null);

      if (unlabeledError) throw unlabeledError;

      // Get counts by label
      const { data: labelData, error: labelError } = await supabase
        .from('backoffice_emails')
        .select('label');

      if (labelError) throw labelError;

      const by_label: Record<string, number> = {};
      (labelData || []).forEach((row: any) => {
        if (row.label) {
          by_label[row.label] = (by_label[row.label] || 0) + 1;
        }
      });

      return {
        data: {
          total_count: totalCount || 0,
          unread_count: unreadCount || 0,
          unlabeled_count: unlabeledCount || 0,
          by_label,
        },
        error: null
      };
    }
  );
}

// Update email label
// NOTE: For incoming_invoice labels, this triggers server-side invoice processing
export function useUpdateEmailLabel() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Email, { id: number; label: EmailLabel | null }>(
    async ({ id, label }) => {
      // First update the label in the database
      const { data, error } = await supabase
        .from('backoffice_emails')
        .update({ label })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // If labeling as incoming_invoice or receipt, trigger server-side processing
      if (label === 'incoming_invoice' || label === 'receipt') {
        try {
          // Call server action to process the email
          const response = await fetch('/api/emails/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailId: id, label }),
          });

          if (!response.ok) {
            console.error('Failed to process email as invoice');
          }
        } catch (err) {
          console.error('Error processing email:', err);
          // Don't fail the label update if processing fails
        }
      }

      return { data, error: null };
    },
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Mark email as read
export function useMarkEmailAsRead() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Email, { id: number }>(
    ({ id }) => supabase.from('backoffice_emails').update({ is_read: true }).eq('id', id).select().single(),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Link email to company
export function useLinkEmailToCompany() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Email, { emailId: number; companyId: number | null }>(
    ({ emailId, companyId }) =>
      supabase.from('backoffice_emails').update({ linked_company_id: companyId }).eq('id', emailId).select().single(),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Link email to contact
export function useLinkEmailToContact() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Email, { emailId: number; contactId: number | null }>(
    ({ emailId, contactId }) =>
      supabase.from('backoffice_emails').update({ linked_contact_id: contactId }).eq('id', emailId).select().single(),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Delete email
export function useDeleteEmail() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<void, { id: number }>(
    ({ id }) => supabase.from('backoffice_emails').delete().eq('id', id),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Fetch unread emails from IMAP (server-side action)
// NOTE: This uses tRPC behind the scenes via a custom mutation hook
export function useFetchUnreadEmails() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<{ success: boolean; count: number; emails: Email[] }, void>(
    async () => {
      // Call the tRPC endpoint directly
      const response = await fetch('/api/trpc/email.fetchUnread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }

      const result = await response.json();
      return {
        data: result.result?.data || { success: false, count: 0, emails: [] },
        error: null,
      };
    },
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}
