import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc';

const contactAssociationRouter = router({
  // Get associations for a contact
  getByContactId: publicProcedure
    .input(z.object({ contactId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('backoffice_contact_associations')
        .select(`
          *,
          contacts:contact_id(id, first_name, last_name, email),
          companies:company_id(id, name),
          projects:project_id(id, name)
        `)
        .eq('contact_id', input.contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }),

  // Get associations for a company
  getByCompanyId: publicProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('backoffice_contact_associations')
        .select(`
          *,
          contacts:contact_id(id, first_name, last_name, email),
          companies:company_id(id, name),
          projects:project_id(id, name)
        `)
        .eq('company_id', input.companyId)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      return data || [];
    }),

  // Get associations for a project
  getByProjectId: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('backoffice_contact_associations')
        .select(`
          *,
          contacts:contact_id(id, first_name, last_name, email),
          companies:company_id(id, name),
          projects:project_id(id, name)
        `)
        .eq('project_id', input.projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }),

  // Create association
  create: publicProcedure
    .input(z.object({
      contact_id: z.number().int().positive(),
      company_id: z.number().int().positive().optional(),
      project_id: z.number().int().positive().optional(),
      role: z.string().max(100).optional().or(z.literal('')),
      is_primary: z.boolean().default(false),
      is_active: z.boolean().default(true),
      notes: z.string().optional().or(z.literal('')),
    }))
    .mutation(async ({ ctx, input }) => {
      // If setting as primary for a company, unset other primary contacts first
      if (input.is_primary && input.company_id) {
        await ctx.supabase
          .from('backoffice_contact_associations')
          .update({ is_primary: false })
          .eq('company_id', input.company_id)
          .eq('is_primary', true);
      }

      const { data, error } = await ctx.supabase
        .from('backoffice_contact_associations')
        .insert([{
          contact_id: input.contact_id,
          company_id: input.company_id || null,
          project_id: input.project_id || null,
          role: input.role || null,
          is_primary: input.is_primary,
          is_active: input.is_active,
          notes: input.notes || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Update association
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        role: z.string().max(100).optional().or(z.literal('')),
        is_primary: z.boolean().optional(),
        is_active: z.boolean().optional(),
        notes: z.string().optional().or(z.literal('')),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get existing association to check company_id
      const { data: existing, error: fetchError } = await ctx.supabase
        .from('backoffice_contact_associations')
        .select('*')
        .eq('id', input.id)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error('Association not found');

      // If setting as primary for a company, unset other primary contacts first
      if (input.data.is_primary && existing.company_id) {
        await ctx.supabase
          .from('backoffice_contact_associations')
          .update({ is_primary: false })
          .eq('company_id', existing.company_id)
          .eq('is_primary', true)
          .neq('id', input.id);
      }

      const { data, error } = await ctx.supabase
        .from('backoffice_contact_associations')
        .update(input.data)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Delete association
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('backoffice_contact_associations')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
      return { success: true };
    }),

  // Set as primary contact for company
  setPrimary: publicProcedure
    .input(z.object({
      contactId: z.number(),
      companyId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Unset all other primary contacts for this company
      await ctx.supabase
        .from('backoffice_contact_associations')
        .update({ is_primary: false })
        .eq('company_id', input.companyId)
        .eq('is_primary', true);

      // Set this contact as primary
      const { error } = await ctx.supabase
        .from('backoffice_contact_associations')
        .update({ is_primary: true })
        .eq('contact_id', input.contactId)
        .eq('company_id', input.companyId);

      if (error) throw error;
      return { success: true };
    }),
});

export { contactAssociationRouter };
