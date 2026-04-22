import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc';

const contactRouter = router({
  // List all contacts (with optional company filter)
  getAll: publicProcedure
    .input(z.object({
      companyId: z.number().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('backoffice_contacts')
        .select('*')
        .order('first_name', { ascending: true });

      if (input?.companyId) {
        query = query.eq('company_id', input.companyId);
      }

      if (input?.isActive !== undefined) {
        query = query.eq('is_active', input.isActive);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }),

  // Get all contacts with company info
  getAllWithCompany: publicProcedure
    .input(z.object({
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('backoffice_contacts')
        .select('*, companies:company_id(name)')
        .order('first_name', { ascending: true });

      if (input?.isActive !== undefined) {
        query = query.eq('is_active', input.isActive);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((contact: any) => ({
        ...contact,
        company_name: (contact.companies as any)?.name || null,
        companies: undefined,
      }));
    }),

  // Get single contact by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { data: contact, error } = await ctx.supabase
        .from('backoffice_contacts')
        .select('*, companies:company_id(name)')
        .eq('id', input.id)
        .single();

      if (error) throw error;
      if (!contact) throw new Error('Contact not found');

      return {
        ...contact,
        company_name: (contact.companies as any)?.name || null,
        companies: undefined,
      };
    }),

  // Get contacts by company ID
  getByCompanyId: publicProcedure
    .input(z.object({
      companyId: z.number(),
      activeOnly: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('backoffice_contacts')
        .select('*')
        .eq('company_id', input.companyId)
        .order('first_name', { ascending: true });

      if (input.activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }),

  // Get primary contact for a company
  getPrimaryByCompanyId: publicProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { data: contact, error } = await ctx.supabase
        .from('backoffice_contacts')
        .select('*')
        .eq('company_id', input.companyId)
        .eq('is_primary', true)
        .maybeSingle();

      if (error) throw error;
      return contact || null;
    }),

  // Create contact
  create: publicProcedure
    .input(z.object({
      company_id: z.number().int().positive().optional(),
      first_name: z.string().min(1).max(100),
      last_name: z.string().max(100).optional().or(z.literal('')),
      role: z.string().max(100).optional().or(z.literal('')),
      description: z.string().max(500).optional().or(z.literal('')),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().max(50).optional().or(z.literal('')),
      is_primary: z.boolean().default(false),
      is_active: z.boolean().default(true),
      notes: z.string().optional().or(z.literal('')),
    }))
    .mutation(async ({ ctx, input }) => {
      // If setting as primary, unset other primary contacts for this company
      if (input.is_primary && input.company_id) {
        await ctx.supabase
          .from('backoffice_contacts')
          .update({ is_primary: false })
          .eq('company_id', input.company_id)
          .eq('is_primary', true);
      }

      const { data, error } = await ctx.supabase
        .from('backoffice_contacts')
        .insert([input])
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Update contact
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        company_id: z.number().int().positive().optional(),
        first_name: z.string().min(1).max(100).optional(),
        last_name: z.string().max(100).optional().or(z.literal('')),
        role: z.string().max(100).optional().or(z.literal('')),
        description: z.string().max(500).optional().or(z.literal('')),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().max(50).optional().or(z.literal('')),
        is_primary: z.boolean().optional(),
        is_active: z.boolean().optional(),
        notes: z.string().optional().or(z.literal('')),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // If setting as primary, unset other primary contacts for this company
      if (input.data.is_primary && input.data.company_id) {
        await ctx.supabase
          .from('backoffice_contacts')
          .update({ is_primary: false })
          .eq('company_id', input.data.company_id)
          .eq('is_primary', true)
          .neq('id', input.id);
      }

      const { data, error } = await ctx.supabase
        .from('backoffice_contacts')
        .update(input.data)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Set contact as primary
  setPrimary: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get the contact to find its company_id
      const { data: contact, error: fetchError } = await ctx.supabase
        .from('backoffice_contacts')
        .select('company_id')
        .eq('id', input.id)
        .single();

      if (fetchError) throw fetchError;
      if (!contact) throw new Error('Contact not found');

      // Unset other primary contacts for this company
      if (contact.company_id) {
        await ctx.supabase
          .from('backoffice_contacts')
          .update({ is_primary: false })
          .eq('company_id', contact.company_id)
          .eq('is_primary', true);
      }

      // Set this contact as primary
      const { error } = await ctx.supabase
        .from('backoffice_contacts')
        .update({ is_primary: true })
        .eq('id', input.id);

      if (error) throw error;
      return { success: true };
    }),

  // Delete contact
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('backoffice_contacts')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
      return { success: true };
    }),

  // Search contacts
  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('backoffice_contacts')
        .select('*')
        .or(`first_name.ilike.%${input.query}%,last_name.ilike.%${input.query}%,email.ilike.%${input.query}%`)
        .order('first_name', { ascending: true });

      if (error) throw error;
      return data || [];
    }),
});

export { contactRouter };
