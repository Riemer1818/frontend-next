import { supabase } from './client';
import { useSupabaseQuery, useSupabaseMutation, useInvalidateQuery } from './hooks';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Expense {
  id: number;
  supplier_id: number;
  supplier_name?: string | null;
  project_id?: number | null;
  invoice_number?: string | null;
  invoice_date: string;
  due_date?: string | null;
  paid_date?: string | null;
  description?: string | null;
  subtotal?: number;
  tax_amount?: number;
  total_amount: number;
  vat_rate?: number | null;
  tax_rate_id?: number | null;
  category_id?: number | null;
  review_status: ReviewStatus;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
  invoice_file?: string | null;
  invoice_file_name?: string | null;
  invoice_file_type?: string | null;
  invoice_file_base64?: string | null;
  original_currency?: string | null;
  original_amount?: number | null;
  original_subtotal?: number | null;
  original_tax_amount?: number | null;
  exchange_rate?: number | null;
  exchange_rate_date?: string | null;
  payment_status?: string | null;
  language?: string | null;
  email_id?: number | null;
  source?: string | null;
  source_email_id?: string | null;
  source_email_from?: string | null;
  source_email_subject?: string | null;
  source_email_date?: string | null;
  extraction_errors?: string | null;
  deductibility_percentage?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseWithSupplier extends Expense {
  supplier_name?: string | null;
  project_name?: string | null;
}

export type CreateExpenseInput = Omit<
  Expense,
  'id' | 'created_at' | 'updated_at' | 'reviewed_at' | 'invoice_file_base64'
>;
export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export interface ApproveExpenseInput {
  id: number;
  edits?: {
    supplier_name?: string;
    description?: string;
    subtotal?: number;
    tax_amount?: number;
    total_amount?: number;
    project_id?: number | null;
    currency?: string;
    invoice_date?: string;
    notes?: string;
    category?: number | null;
  };
}

const QUERY_KEY = ['expenses'];

// Fetch all expenses (excludes rejected by default)
export function useExpenses(params?: {
  supplierId?: number;
  projectId?: number;
  reviewStatus?: ReviewStatus;
}) {
  return useSupabaseQuery<ExpenseWithSupplier[]>(
    params ? [...QUERY_KEY, JSON.stringify(params)] : QUERY_KEY,
    async () => {
      let query = supabase
        .from('backoffice_incoming_invoices')
        .select('*, companies:supplier_id(name), projects:project_id(name)')
        .order('invoice_date', { ascending: false });

      if (params?.supplierId) {
        query = query.eq('supplier_id', params.supplierId);
      }

      if (params?.projectId) {
        query = query.eq('project_id', params.projectId);
      }

      if (params?.reviewStatus) {
        query = query.eq('review_status', params.reviewStatus);
      } else {
        // By default, only show approved expenses
        query = query.eq('review_status', 'approved');
      }

      const { data, error } = await query;

      if (error) return { data: null, error };

      const mapped = (data || []).map((expense: any) => ({
        ...expense,
        supplier_name: expense.companies?.name || null,
        project_name: expense.projects?.name || null,
        companies: undefined,
        projects: undefined,
      }));

      return { data: mapped, error: null };
    }
  );
}

// Fetch single expense
export function useExpense(id?: number) {
  return useSupabaseQuery<ExpenseWithSupplier>(
    [...QUERY_KEY, String(id)],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_incoming_invoices')
        .select('*, companies:supplier_id(name), projects:project_id(name)')
        .eq('id', id!)
        .single();

      if (error) return { data: null, error };

      return {
        data: {
          ...data,
          supplier_name: data.companies?.name || null,
          project_name: data.projects?.name || null,
          companies: undefined,
          projects: undefined,
        },
        error: null,
      };
    },
    { enabled: !!id }
  );
}

// Fetch pending expenses
export function usePendingExpenses() {
  return useSupabaseQuery<ExpenseWithSupplier[]>(
    [...QUERY_KEY, 'pending'],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_incoming_invoices')
        .select('*, companies:supplier_id(name)')
        .eq('review_status', 'pending')
        .order('invoice_date', { ascending: false });

      if (error) return { data: null, error };

      const mapped = (data || []).map((expense: any) => ({
        ...expense,
        supplier_name: expense.companies?.name || null,
        companies: undefined,
      }));

      return { data: mapped, error: null };
    }
  );
}

// Create expense
export function useCreateExpense() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Expense, CreateExpenseInput>(
    (input) => supabase.from('backoffice_incoming_invoices').insert([input]).select().single(),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Update expense
export function useUpdateExpense() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Expense, { id: number; data: UpdateExpenseInput }>(
    ({ id, data }) => supabase.from('backoffice_incoming_invoices').update(data).eq('id', id).select().single(),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Approve expense
export function useApproveExpense() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Expense, ApproveExpenseInput>(
    async ({ id, edits }) => {
      const updateData: any = {
        review_status: 'approved',
        reviewed_at: new Date().toISOString(),
      };

      // If edits are provided, merge them in
      if (edits) {
        if (edits.supplier_name) updateData.supplier_name = edits.supplier_name;
        if (edits.description !== undefined) updateData.description = edits.description;
        if (edits.subtotal !== undefined) updateData.subtotal = edits.subtotal;
        if (edits.tax_amount !== undefined) updateData.tax_amount = edits.tax_amount;
        if (edits.total_amount !== undefined) updateData.total_amount = edits.total_amount;
        if (edits.project_id !== undefined) updateData.project_id = edits.project_id;
        if (edits.invoice_date) updateData.invoice_date = edits.invoice_date;
        if (edits.notes !== undefined) updateData.notes = edits.notes;
        if (edits.category !== undefined) updateData.category_id = edits.category;
        if (edits.currency) {
          updateData.original_currency = edits.currency;
          updateData.original_amount = edits.total_amount;
          updateData.original_subtotal = edits.subtotal;
          updateData.original_tax_amount = edits.tax_amount;
        }
      }

      return supabase.from('backoffice_incoming_invoices').update(updateData).eq('id', id).select().single();
    },
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Reject expense
export function useRejectExpense() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Expense, { id: number }>(
    ({ id }) =>
      supabase.from('backoffice_incoming_invoices').update({ review_status: 'rejected' }).eq('id', id).select().single(),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Delete expense
export function useDeleteExpense() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<void, { id: number }>(
    ({ id }) => supabase.from('backoffice_incoming_invoices').delete().eq('id', id),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Fetch attachments for an expense
export interface ExpenseAttachment {
  id: number;
  incoming_invoice_id: number;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  attachment_type: string | null;
  storage_path: string | null;
  storage_bucket: string | null;
  created_at: string;
  publicUrl?: string; // Generated client-side
}

export function useExpenseAttachments(expenseId?: number) {
  return useSupabaseQuery<ExpenseAttachment[]>(
    ['expense-attachments', String(expenseId)],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_invoice_attachments')
        .select('id, incoming_invoice_id, file_name, file_type, file_size, attachment_type, storage_path, storage_bucket, created_at')
        .eq('incoming_invoice_id', expenseId!)
        .order('created_at', { ascending: true });

      if (error) return { data: null, error };

      // Generate public URLs for each attachment
      const attachmentsWithUrls = (data || []).map(attachment => {
        let publicUrl: string | undefined;

        if (attachment.storage_path && attachment.storage_bucket) {
          const { data: urlData } = supabase.storage
            .from(attachment.storage_bucket)
            .getPublicUrl(attachment.storage_path);
          publicUrl = urlData.publicUrl;
        }

        return {
          ...attachment,
          publicUrl
        };
      });

      return { data: attachmentsWithUrls, error: null };
    },
    { enabled: !!expenseId }
  );
}

// Upload PDF attachment for expense
export function useUploadExpensePdf() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<void, { expenseId: number; file: File }>(
    async ({ expenseId, file }) => {
      // Step 1: Create database record first to get attachment ID
      const { data: attachment, error: insertError } = await supabase
        .from('backoffice_invoice_attachments')
        .insert([
          {
            incoming_invoice_id: expenseId,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            attachment_type: 'invoice',
            storage_bucket: 'documents',
          },
        ])
        .select('id')
        .single();

      if (insertError || !attachment) throw insertError || new Error('Failed to create attachment record');

      // Step 2: Upload to storage with path: invoices/{expenseId}/{attachmentId}_{filename}
      const storagePath = `invoices/${expenseId}/${attachment.id}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        // Rollback: delete the database record if upload fails
        await supabase.from('backoffice_invoice_attachments').delete().eq('id', attachment.id);
        throw uploadError;
      }

      // Step 3: Update database record with storage path
      const { error: updateError } = await supabase
        .from('backoffice_invoice_attachments')
        .update({ storage_path: storagePath })
        .eq('id', attachment.id);

      if (updateError) throw updateError;

      return { data: null, error: null };
    },
    {
      onSuccess: () => {
        invalidate(QUERY_KEY);
        invalidate(['expense-attachments']);
      },
    }
  );
}
