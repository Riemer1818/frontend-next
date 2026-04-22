import { supabase } from './client';
import { useSupabaseQuery, useSupabaseMutation, useInvalidateQuery } from './hooks';

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export interface Invoice {
  id: number;
  client_id: number;
  project_id?: number | null;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  subtotal_amount: number;
  vat_amount: number;
  total_amount: number;
  vat_rate?: number | null;
  payment_status: PaymentStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceWithClient extends Invoice {
  client_name?: string | null;
}

export type CreateInvoiceInput = Omit<Invoice, 'id' | 'created_at' | 'updated_at'>;
export type UpdateInvoiceInput = Partial<CreateInvoiceInput>;

export interface CreateInvoiceFromProjectInput {
  projectId: number;
  timeEntryIds: number[];
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  notes?: string | null;
}

const QUERY_KEY = ['invoices'];

// Fetch all invoices
export function useInvoices(params?: { clientId?: number; projectId?: number }) {
  return useSupabaseQuery<Invoice[]>(
    params ? [...QUERY_KEY, JSON.stringify(params)] : QUERY_KEY,
    () => {
      let query = supabase
        .from('backoffice_invoices')
        .select('*')
        .order('invoice_date', { ascending: false });

      if (params?.clientId) {
        query = query.eq('client_id', params.clientId);
      }

      if (params?.projectId) {
        query = query.eq('project_id', params.projectId);
      }

      return query;
    }
  );
}

// Fetch single invoice
export function useInvoice(id?: number) {
  return useSupabaseQuery<InvoiceWithClient>(
    [...QUERY_KEY, String(id)],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_invoices')
        .select('*, companies:client_id(name)')
        .eq('id', id!)
        .single();

      if (error) throw error;

      return {
        ...data,
        client_name: data.companies?.name || null,
        companies: undefined,
      };
    },
    { enabled: !!id }
  );
}

// Fetch outstanding invoices
export function useOutstandingInvoices() {
  return useSupabaseQuery<InvoiceWithClient[]>(
    [...QUERY_KEY, 'outstanding'],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_invoices')
        .select('*, companies:client_id(name)')
        .in('payment_status', ['unpaid', 'partially_paid', 'overdue'])
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((invoice: any) => ({
        ...invoice,
        client_name: invoice.companies?.name || null,
        companies: undefined,
      }));
    }
  );
}

// Create invoice
export function useCreateInvoice() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Invoice, CreateInvoiceInput>(
    (input) => supabase.from('backoffice_invoices').insert([input]).select().single(),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Update invoice
export function useUpdateInvoice() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Invoice, { id: number; data: UpdateInvoiceInput }>(
    ({ id, data }) => supabase.from('backoffice_invoices').update(data).eq('id', id).select().single(),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Update invoice payment status
export function useUpdateInvoiceStatus() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Invoice, { id: number; payment_status: PaymentStatus }>(
    ({ id, payment_status }) =>
      supabase.from('backoffice_invoices').update({ payment_status }).eq('id', id).select().single(),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Delete invoice
export function useDeleteInvoice() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<void, { id: number }>(
    ({ id }) => supabase.from('backoffice_invoices').delete().eq('id', id),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Create invoice from project with time entries
export function useCreateInvoiceFromProject() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Invoice, CreateInvoiceFromProjectInput>(
    async (input) => {
      // Get project details
      const { data: project, error: projectError } = await supabase
        .from('backoffice_projects')
        .select('id, name, client_id, hourly_rate')
        .eq('id', input.projectId)
        .single();

      if (projectError) throw projectError;
      if (!project) throw new Error('Project not found');

      // Get time entries to calculate totals
      const { data: timeEntries, error: timeEntriesError } = await supabase
        .from('backoffice_time_entries')
        .select('id, chargeable_hours, is_invoiced')
        .in('id', input.timeEntryIds);

      if (timeEntriesError) throw timeEntriesError;

      // Check if any are already invoiced
      const alreadyInvoiced = timeEntries?.filter((te) => te.is_invoiced);
      if (alreadyInvoiced && alreadyInvoiced.length > 0) {
        throw new Error('Some time entries are already invoiced');
      }

      // Calculate totals
      const totalHours = (timeEntries || []).reduce(
        (sum, te) => sum + parseFloat((te.chargeable_hours as any) || '0'),
        0
      );
      const hourlyRate = parseFloat((project.hourly_rate as any) || '0');
      const subtotalAmount = totalHours * hourlyRate;
      const vatRate = 21; // Default Dutch VAT
      const vatAmount = subtotalAmount * (vatRate / 100);
      const totalAmount = subtotalAmount + vatAmount;

      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('backoffice_invoices')
        .insert([
          {
            client_id: project.client_id,
            project_id: input.projectId,
            invoice_number: input.invoiceNumber,
            invoice_date: input.invoiceDate,
            due_date: input.dueDate,
            subtotal_amount: subtotalAmount,
            vat_amount: vatAmount,
            total_amount: totalAmount,
            vat_rate: vatRate,
            payment_status: 'unpaid' as PaymentStatus,
            notes: input.notes,
          },
        ])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Mark time entries as invoiced
      const { error: updateError } = await supabase
        .from('backoffice_time_entries')
        .update({
          is_invoiced: true,
          invoice_id: invoice.id,
        })
        .in('id', input.timeEntryIds);

      if (updateError) throw updateError;

      return invoice;
    },
    {
      onSuccess: () => {
        invalidate(QUERY_KEY);
        invalidate(['time-entries']);
      },
    }
  );
}

// Generate PDF for an invoice
export function useGenerateInvoicePdf() {
  return useSupabaseMutation<any, { id: number }>(
    async ({ id }) => {
      // Get invoice with all related data
      const { data: invoice, error } = await supabase
        .from('backoffice_invoices')
        .select(
          `
          *,
          companies:client_id(id, name, street_address, postal_code, city, country, email, btw_number),
          projects:project_id(id, name)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!invoice) throw new Error('Invoice not found');

      // TODO: Implement PDF generation using InvoicePdfGenerator
      return {
        success: true,
        message: 'PDF generation not yet implemented',
        invoice,
      };
    }
  );
}
