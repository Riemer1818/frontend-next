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
  payment_status: string;
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
    async () => {
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

      const { data, error } = await query;
      if (error) return { data: null, error };

      // Map database fields to interface fields
      const mappedData = (data || []).map((invoice: any) => ({
        ...invoice,
        subtotal_amount: invoice.subtotal,
        vat_amount: invoice.tax_amount,
        payment_status: invoice.status,
      }));

      return { data: mappedData, error: null };
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

      if (error) return { data: null, error };

      // Fetch PDF separately using RPC to get it as base64
      let pdfFileBase64 = null;
      if (data.pdf_file) {
        try {
          const { data: pdfData, error: pdfError } = await supabase.rpc('get_invoice_pdf_base64', {
            invoice_id: id
          });

          if (!pdfError && pdfData) {
            pdfFileBase64 = pdfData;
            console.log('Got PDF as base64 from RPC, length:', pdfData.length);
          }
        } catch (e) {
          console.error('RPC not available, trying direct conversion:', e);

          // Fallback: try direct hex parsing
          const pdfFile = data.pdf_file;
          if (typeof pdfFile === 'string' && pdfFile.startsWith('\\x')) {
            // Parse the actual hex content: \x25504446 means bytes 0x25 0x50 0x44 0x46
            // Remove \x prefix and parse every 2 chars as hex byte
            let hexString = pdfFile.substring(2);

            // Remove escaped \x sequences (5c78)
            hexString = hexString.replace(/5c78/g, '');

            const bytes: number[] = [];
            for (let i = 0; i < hexString.length; i += 2) {
              const hex = hexString.substring(i, i + 2);
              if (hex.length === 2 && /^[0-9a-fA-F]{2}$/.test(hex)) {
                bytes.push(parseInt(hex, 16));
              }
            }

            const uint8 = new Uint8Array(bytes);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < uint8.length; i += chunkSize) {
              const chunk = uint8.subarray(i, i + chunkSize);
              binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            pdfFileBase64 = btoa(binary);
            console.log('Converted PDF to base64, length:', pdfFileBase64.length);
          }
        }
      }

      // Map database fields to interface fields
      const mappedData = {
        ...data,
        pdf_file: pdfFileBase64,
        subtotal_amount: data.subtotal,
        vat_amount: data.tax_amount,
        payment_status: data.status,
        client_name: data.companies?.name || null,
        companies: undefined,
      };

      return { data: mappedData, error: null };
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
        .in('status', ['unpaid', 'partially_paid', 'overdue'])
        .order('invoice_date', { ascending: false });

      if (error) return { data: null, error };

      const result = (data || []).map((invoice: any) => ({
        ...invoice,
        subtotal_amount: invoice.subtotal,
        vat_amount: invoice.tax_amount,
        payment_status: invoice.status,
        client_name: invoice.companies?.name || null,
        companies: undefined,
      }));

      return { data: result, error: null };
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
      supabase.from('backoffice_invoices').update({ status: payment_status }).eq('id', id).select().single(),
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

      // Create the invoice (map to database field names)
      const { data: invoice, error: invoiceError } = await supabase
        .from('backoffice_invoices')
        .insert([
          {
            client_id: project.client_id,
            project_id: input.projectId,
            invoice_number: input.invoiceNumber,
            invoice_date: input.invoiceDate,
            due_date: input.dueDate,
            subtotal: subtotalAmount,
            tax_amount: vatAmount,
            total_amount: totalAmount,
            status: 'unpaid',
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
