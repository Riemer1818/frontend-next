import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc';

const projectRouter = router({
  // List all projects
  getAll: publicProcedure
    .input(z.object({
      status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).optional(),
      clientId: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      // Use Supabase query with company relation
      let query = ctx.supabase
        .from('backoffice_projects')
        .select('*, companies:client_id(name)')
        .order('id', { ascending: false });

      if (input?.status) {
        query = query.eq('status', input.status);
      }

      if (input?.clientId) {
        query = query.eq('client_id', input.clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match expected format
      return (data || []).map((project: any) => ({
        ...project,
        client_name: (project.companies as any)?.name || null,
        companies: undefined, // Remove the nested object
      }));
    }),

  // Get single project by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { data: project, error: projectError } = await ctx.supabase
        .from('backoffice_projects')
        .select('*, companies:client_id(name)')
        .eq('id', input.id)
        .single();

      if (projectError) throw projectError;
      if (!project) throw new Error('Project not found');

      // Get total spending for this project
      const { data: invoices, error: invoiceError } = await ctx.supabase
        .from('backoffice_incoming_invoices')
        .select('total_amount')
        .eq('project_id', input.id)
        .eq('review_status', 'approved');

      if (invoiceError) throw invoiceError;

      const total_spent = (invoices || []).reduce((sum: number, row: any) => sum + (parseFloat(row.total_amount) || 0), 0);

      return {
        ...project,
        client_name: (project.companies as any)?.name || null,
        companies: undefined,
        total_spent,
      };
    }),

  // Create project
  create: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      client_id: z.number(),
      description: z.string().optional(),
      hourly_rate: z.number().default(0),
      tax_rate_id: z.number(),
      status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).default('active'),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      currency: z.string().default('EUR'),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#1e3a8a'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('backoffice_projects')
        .insert([{
          name: input.name,
          client_id: input.client_id,
          description: input.description || null,
          hourly_rate: input.hourly_rate,
          tax_rate_id: input.tax_rate_id,
          status: input.status,
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          currency: input.currency,
          color: input.color,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Update project
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        name: z.string().min(1).max(255).optional(),
        client_id: z.number().optional(),
        description: z.string().optional(),
        hourly_rate: z.number().optional(),
        tax_rate_id: z.number().optional(),
        status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        currency: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: any = {};

      // Only include fields that are provided
      if (input.data.name) updateData.name = input.data.name;
      if (input.data.client_id) updateData.client_id = input.data.client_id;
      if (input.data.description !== undefined) updateData.description = input.data.description || null;
      if (input.data.hourly_rate !== undefined) updateData.hourly_rate = input.data.hourly_rate;
      if (input.data.tax_rate_id) updateData.tax_rate_id = input.data.tax_rate_id;
      if (input.data.status) updateData.status = input.data.status;
      if (input.data.start_date !== undefined) updateData.start_date = input.data.start_date || null;
      if (input.data.end_date !== undefined) updateData.end_date = input.data.end_date || null;
      if (input.data.currency) updateData.currency = input.data.currency;
      if (input.data.color) updateData.color = input.data.color;

      const { data, error } = await ctx.supabase
        .from('backoffice_projects')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Delete project
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('backoffice_projects')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
      return { success: true };
    }),

  // Get monthly expenses for a project
  getMonthlyExpenses: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { data: invoices, error } = await ctx.supabase
        .from('backoffice_incoming_invoices')
        .select('invoice_date, total_amount')
        .eq('project_id', input.id)
        .eq('review_status', 'approved')
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      // Group by month on client side
      const monthlyMap = new Map<string, { count: number; total: number }>();
      (invoices || []).forEach((inv: any) => {
        const month = new Date(inv.invoice_date).toISOString().substring(0, 7);
        const existing = monthlyMap.get(month) || { count: 0, total: 0 };
        monthlyMap.set(month, {
          count: existing.count + 1,
          total: existing.total + (parseFloat(inv.total_amount) || 0),
        });
      });

      return Array.from(monthlyMap.entries())
        .map(([month, stats]) => ({
          month,
          invoice_count: stats.count,
          total_spent: stats.total,
        }))
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12);
    }),
});

export { projectRouter };
