import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc';

const expenseRouter = router({
  // Get all expenses (incoming invoices from suppliers)
  getAll: publicProcedure
    .input(z.object({
      supplierId: z.number().optional(),
      projectId: z.number().optional(),
      reviewStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('backoffice_incoming_invoices')
        .select('*')
        .order('invoice_date', { ascending: false });

      if (input?.supplierId) {
        query = query.eq('supplier_id', input.supplierId);
      }

      if (input?.projectId) {
        query = query.eq('project_id', input.projectId);
      }

      if (input?.reviewStatus) {
        query = query.eq('review_status', input.reviewStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }),

  // Get expense by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { data: expense, error } = await ctx.supabase
        .from('backoffice_incoming_invoices')
        .select('*, companies:supplier_id(name)')
        .eq('id', input.id)
        .single();

      if (error) throw error;
      if (!expense) throw new Error('Expense not found');

      return {
        ...expense,
        supplier_name: (expense.companies as any)?.name || null,
        companies: undefined,
      };
    }),

  // Create expense
  create: publicProcedure
    .input(z.object({
      supplier_id: z.number(),
      project_id: z.number().optional().nullable(),
      invoice_number: z.string().optional().nullable().or(z.literal('')),
      invoice_date: z.string(),
      due_date: z.string().optional().nullable().or(z.literal('')),
      description: z.string().optional().nullable().or(z.literal('')),
      subtotal_amount: z.number(),
      vat_amount: z.number().optional().default(0),
      total_amount: z.number(),
      vat_rate: z.number().optional().nullable(),
      category_id: z.number().optional().nullable(),
      review_status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
      notes: z.string().optional().nullable().or(z.literal('')),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('backoffice_incoming_invoices')
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Update expense
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        supplier_id: z.number().optional(),
        project_id: z.number().optional().nullable(),
        invoice_number: z.string().optional().nullable().or(z.literal('')),
        invoice_date: z.string().optional(),
        due_date: z.string().optional().nullable().or(z.literal('')),
        description: z.string().optional().nullable().or(z.literal('')),
        subtotal_amount: z.number().optional(),
        vat_amount: z.number().optional(),
        total_amount: z.number().optional(),
        vat_rate: z.number().optional().nullable(),
        category_id: z.number().optional().nullable(),
        review_status: z.enum(['pending', 'approved', 'rejected']).optional(),
        notes: z.string().optional().nullable().or(z.literal('')),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.data) {
        throw new Error('No update data provided');
      }

      const { data, error } = await ctx.supabase
        .from('backoffice_incoming_invoices')
        .update(input.data)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Delete expense
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('backoffice_incoming_invoices')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
      return { success: true };
    }),

  // Approve expense
  approve: publicProcedure
    .input(z.object({
      id: z.number(),
      edits: z.object({
        supplier_name: z.string().optional(),
        description: z.string().optional(),
        subtotal: z.number().optional(),
        tax_amount: z.number().optional(),
        total_amount: z.number().optional(),
        project_id: z.number().optional().nullable(),
        currency: z.string().optional(),
        invoice_date: z.string().optional(),
        notes: z.string().optional(),
        category: z.number().optional().nullable(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Prepare update data
      const updateData: any = { review_status: 'approved', reviewed_at: new Date().toISOString() };

      // If edits are provided, merge them in
      if (input.edits) {
        if (input.edits.supplier_name) updateData.supplier_name = input.edits.supplier_name;
        if (input.edits.description !== undefined) updateData.description = input.edits.description;
        if (input.edits.subtotal !== undefined) updateData.subtotal_amount = input.edits.subtotal;
        if (input.edits.tax_amount !== undefined) updateData.vat_amount = input.edits.tax_amount;
        if (input.edits.total_amount !== undefined) updateData.total_amount = input.edits.total_amount;
        if (input.edits.project_id !== undefined) updateData.project_id = input.edits.project_id;
        if (input.edits.invoice_date) updateData.invoice_date = input.edits.invoice_date;
        if (input.edits.notes !== undefined) updateData.notes = input.edits.notes;
        if (input.edits.category !== undefined) updateData.category_id = input.edits.category;
        if (input.edits.currency) {
          updateData.original_currency = input.edits.currency;
          updateData.original_amount = input.edits.total_amount;
          updateData.original_subtotal = input.edits.subtotal;
          updateData.original_tax_amount = input.edits.tax_amount;
        }
      }

      const { data, error } = await ctx.supabase
        .from('backoffice_incoming_invoices')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Reject expense
  reject: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('backoffice_incoming_invoices')
        .update({ review_status: 'rejected' })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Get pending expenses
  getPending: publicProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('backoffice_incoming_invoices')
        .select('*, companies:supplier_id(name)')
        .eq('review_status', 'pending')
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((expense: any) => ({
        ...expense,
        supplier_name: (expense.companies as any)?.name || null,
        companies: undefined,
      }));
    }),

  // Upload PDF
  uploadPdf: publicProcedure
    .input(z.object({
      id: z.number(),
      pdfBase64: z.string(), // base64 encoded
    }))
    .mutation(async ({ ctx, input }) => {
      // Store the PDF as base64 in the database for now
      // TODO: Later migrate to Supabase Storage
      const { data, error } = await ctx.supabase
        .from('backoffice_incoming_invoices')
        .update({ invoice_file_base64: input.pdfBase64 })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),
});

export { expenseRouter };
