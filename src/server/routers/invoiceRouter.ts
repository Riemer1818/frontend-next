import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc';

const invoiceRouter = router({
  // Get all invoices (outgoing to clients)
  getAll: publicProcedure
    .input(z.object({
      clientId: z.number().optional(),
      projectId: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('backoffice_invoices')
        .select('*')
        .order('invoice_date', { ascending: false });

      if (input?.clientId) {
        query = query.eq('client_id', input.clientId);
      }

      if (input?.projectId) {
        query = query.eq('project_id', input.projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }),

  // Get invoice by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { data: invoice, error } = await ctx.supabase
        .from('backoffice_invoices')
        .select('*, companies:client_id(name)')
        .eq('id', input.id)
        .single();

      if (error) throw error;
      if (!invoice) throw new Error('Invoice not found');

      return {
        ...invoice,
        client_name: (invoice.companies as any)?.name || null,
        companies: undefined,
      };
    }),

  // Create invoice
  create: publicProcedure
    .input(z.object({
      client_id: z.number(),
      project_id: z.number().optional().nullable(),
      invoice_number: z.string().min(1).max(50),
      invoice_date: z.string(),
      due_date: z.string().optional().nullable().or(z.literal('')),
      subtotal_amount: z.number(),
      vat_amount: z.number().optional().default(0),
      total_amount: z.number(),
      vat_rate: z.number().optional().nullable(),
      payment_status: z.enum(['unpaid', 'partially_paid', 'paid', 'overdue']).default('unpaid'),
      notes: z.string().optional().nullable().or(z.literal('')),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('backoffice_invoices')
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Update invoice
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        client_id: z.number().optional(),
        project_id: z.number().optional().nullable(),
        invoice_number: z.string().min(1).max(50).optional(),
        invoice_date: z.string().optional(),
        due_date: z.string().optional().nullable().or(z.literal('')),
        subtotal_amount: z.number().optional(),
        vat_amount: z.number().optional(),
        total_amount: z.number().optional(),
        vat_rate: z.number().optional().nullable(),
        payment_status: z.enum(['unpaid', 'partially_paid', 'paid', 'overdue']).optional(),
        notes: z.string().optional().nullable().or(z.literal('')),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('backoffice_invoices')
        .update(input.data)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Delete invoice
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('backoffice_invoices')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
      return { success: true };
    }),

  // Update invoice payment status
  updateStatus: publicProcedure
    .input(z.object({
      id: z.number(),
      payment_status: z.enum(['unpaid', 'partially_paid', 'paid', 'overdue']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('backoffice_invoices')
        .update({ payment_status: input.payment_status })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Create invoice from project with time entries
  createFromProject: publicProcedure
    .input(z.object({
      projectId: z.number(),
      timeEntryIds: z.array(z.number()),
      invoiceNumber: z.string().min(1),
      invoiceDate: z.string(),
      dueDate: z.string().optional().nullable().or(z.literal('')),
      notes: z.string().optional().nullable().or(z.literal('')),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get project details
      const { data: project, error: projectError } = await ctx.supabase
        .from('backoffice_projects')
        .select('id, name, client_id, hourly_rate')
        .eq('id', input.projectId)
        .single();

      if (projectError) throw projectError;
      if (!project) throw new Error('Project not found');

      // Get time entries to calculate totals
      const { data: timeEntries, error: timeEntriesError } = await ctx.supabase
        .from('backoffice_time_entries')
        .select('id, chargeable_hours, is_invoiced')
        .in('id', input.timeEntryIds);

      if (timeEntriesError) throw timeEntriesError;

      // Check if any are already invoiced
      const alreadyInvoiced = timeEntries?.filter(te => te.is_invoiced);
      if (alreadyInvoiced && alreadyInvoiced.length > 0) {
        throw new Error('Some time entries are already invoiced');
      }

      // Calculate totals
      const totalHours = (timeEntries || []).reduce((sum, te) => sum + parseFloat(te.chargeable_hours as any || '0'), 0);
      const hourlyRate = parseFloat(project.hourly_rate as any || '0');
      const subtotalAmount = totalHours * hourlyRate;
      const vatRate = 21; // Default Dutch VAT
      const vatAmount = subtotalAmount * (vatRate / 100);
      const totalAmount = subtotalAmount + vatAmount;

      // Create the invoice
      const { data: invoice, error: invoiceError } = await ctx.supabase
        .from('backoffice_invoices')
        .insert([{
          client_id: project.client_id,
          project_id: input.projectId,
          invoice_number: input.invoiceNumber,
          invoice_date: input.invoiceDate,
          due_date: input.dueDate,
          subtotal_amount: subtotalAmount,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          vat_rate: vatRate,
          payment_status: 'unpaid',
          notes: input.notes,
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Mark time entries as invoiced
      const { error: updateError } = await ctx.supabase
        .from('backoffice_time_entries')
        .update({
          is_invoiced: true,
          invoice_id: invoice.id,
        })
        .in('id', input.timeEntryIds);

      if (updateError) throw updateError;

      return invoice;
    }),

  // Generate PDF for an invoice
  generatePdf: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get invoice with all related data
      const { data: invoice, error } = await ctx.supabase
        .from('backoffice_invoices')
        .select(`
          *,
          companies:client_id(id, name, street_address, postal_code, city, country, email, btw_number),
          projects:project_id(id, name)
        `)
        .eq('id', input.id)
        .single();

      if (error) throw error;
      if (!invoice) throw new Error('Invoice not found');

      // TODO: Implement PDF generation using InvoicePdfGenerator
      // For now, return a placeholder
      return {
        success: true,
        message: 'PDF generation not yet implemented',
        invoice,
      };
    }),
});

export { invoiceRouter };
