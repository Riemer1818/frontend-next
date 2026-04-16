import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc';

const companyRouter = router({
  // List all companies
  getAll: publicProcedure
    .input(z.object({
      type: z.enum(['client', 'supplier', 'both']).optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('backoffice_companies')
        .select('*')
        .order('name', { ascending: true });

      // Filter by type if provided
      if (input?.type) {
        query = query.eq('type', input.type);
      }

      // Filter by active status if provided
      if (input?.isActive !== undefined) {
        query = query.eq('is_active', input.isActive);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }),

  // Get single company by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { data: company, error } = await ctx.supabase
        .from('backoffice_companies')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error) throw error;
      if (!company) {
        throw new Error('Company not found');
      }

      // Get total spending if this is a supplier
      let totalSpent = 0;
      if (company.type === 'supplier' || company.type === 'both') {
        const { data, error: spendError } = await ctx.supabase
          .from('backoffice_incoming_invoices')
          .select('total_amount')
          .eq('supplier_id', input.id)
          .eq('review_status', 'approved');

        if (spendError) throw spendError;
        totalSpent = (data || []).reduce((sum: number, row: any) => sum + (parseFloat(row.total_amount) || 0), 0);
      }

      return {
        ...company,
        total_spent: totalSpent,
      };
    }),

  // Create company
  create: publicProcedure
    .input(z.object({
      type: z.enum(['client', 'supplier', 'both']),
      name: z.string().min(1).max(255),
      main_contact_person: z.string().max(255).optional(),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().max(50).optional(),
      street_address: z.string().max(255).optional(),
      postal_code: z.string().max(20).optional(),
      city: z.string().max(100).optional(),
      country: z.string().max(100).optional(),
      btw_number: z.string().max(50).optional(),
      kvk_number: z.string().max(50).optional(),
      iban: z.string().max(34).optional(),
      notes: z.string().optional(),
      is_active: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('backoffice_companies')
        .insert([{
          type: input.type,
          name: input.name,
          main_contact_person: input.main_contact_person || null,
          email: input.email || null,
          phone: input.phone || null,
          street_address: input.street_address || null,
          postal_code: input.postal_code || null,
          city: input.city || null,
          country: input.country || null,
          btw_number: input.btw_number || null,
          kvk_number: input.kvk_number || null,
          iban: input.iban || null,
          notes: input.notes || null,
          is_active: input.is_active,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Update company
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        type: z.enum(['client', 'supplier', 'both']).optional(),
        name: z.string().min(1).max(255).optional(),
        main_contact_person: z.string().max(255).optional(),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().max(50).optional(),
        street_address: z.string().max(255).optional(),
        postal_code: z.string().max(20).optional(),
        city: z.string().max(100).optional(),
        country: z.string().max(100).optional(),
        btw_number: z.string().max(50).optional(),
        kvk_number: z.string().max(50).optional(),
        iban: z.string().max(34).optional(),
        notes: z.string().optional(),
        is_active: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: any = {};

      // Only include fields that are provided
      if (input.data.type) updateData.type = input.data.type;
      if (input.data.name) updateData.name = input.data.name;
      if (input.data.main_contact_person !== undefined) updateData.main_contact_person = input.data.main_contact_person || null;
      if (input.data.email !== undefined) updateData.email = input.data.email || null;
      if (input.data.phone !== undefined) updateData.phone = input.data.phone || null;
      if (input.data.street_address !== undefined) updateData.street_address = input.data.street_address || null;
      if (input.data.postal_code !== undefined) updateData.postal_code = input.data.postal_code || null;
      if (input.data.city !== undefined) updateData.city = input.data.city || null;
      if (input.data.country !== undefined) updateData.country = input.data.country || null;
      if (input.data.btw_number !== undefined) updateData.btw_number = input.data.btw_number || null;
      if (input.data.kvk_number !== undefined) updateData.kvk_number = input.data.kvk_number || null;
      if (input.data.iban !== undefined) updateData.iban = input.data.iban || null;
      if (input.data.notes !== undefined) updateData.notes = input.data.notes || null;
      if (input.data.is_active !== undefined) updateData.is_active = input.data.is_active;

      const { data, error } = await ctx.supabase
        .from('backoffice_companies')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Delete company
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('backoffice_companies')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
      return { success: true };
    }),
});

export { companyRouter };
