import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc';

const timeEntriesRouter = router({
  // List all time entries with optional filters
  getAll: publicProcedure
    .input(z.object({
      projectId: z.number().optional(),
      contactId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      isInvoiced: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('backoffice_time_entries')
        .select(`
          *,
          projects:project_id(id, name, client_id, color),
          contacts:backoffice_time_entry_contacts(contact_id, contacts:contact_id(id, first_name, last_name))
        `);

      // Apply filters
      if (input?.projectId) {
        query = query.eq('project_id', input.projectId);
      }

      if (input?.startDate && input?.endDate) {
        query = query.gte('date', input.startDate).lte('date', input.endDate);
      }

      if (input?.isInvoiced !== undefined) {
        query = query.eq('is_invoiced', input.isInvoiced);
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }),

  // Get single time entry by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('backoffice_time_entries')
        .select(`
          *,
          projects:project_id(id, name, client_id),
          contacts:backoffice_time_entry_contacts(contact_id, contacts:contact_id(id, first_name, last_name))
        `)
        .eq('id', input.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Time entry not found');
      return data;
    }),

  // Get time entries by date range
  getByDateRange: publicProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      console.log('========================================');
      console.log('[getByDateRange] START');
      console.log('[getByDateRange] Input:', JSON.stringify(input));
      console.log('[getByDateRange] Supabase client exists?', !!ctx.supabase);

      const { data, error, status, statusText } = await ctx.supabase
        .from('backoffice_time_entries')
        .select(`
          *,
          projects:project_id(id, name, client_id, color, companies:client_id(id, name)),
          contacts:backoffice_time_entry_contacts(contact_id, contacts:contact_id(id, first_name, last_name))
        `)
        .gte('date', input.startDate)
        .lte('date', input.endDate)
        .order('date', { ascending: false });

      console.log('[getByDateRange] Response status:', status, statusText);
      console.log('[getByDateRange] Error:', error);
      console.log('[getByDateRange] Data count:', data?.length);
      console.log('[getByDateRange] First entry:', data?.[0]?.id);
      console.log('[getByDateRange] END');
      console.log('========================================');

      if (error) {
        console.error('[getByDateRange] ERROR DETAILS:', JSON.stringify(error));
        throw error;
      }
      return data || [];
    }),

  // Get uninvoiced time entries
  getUninvoiced: publicProcedure
    .input(z.object({
      projectId: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('backoffice_time_entries')
        .select(`
          *,
          projects:project_id(id, name, client_id)
        `)
        .eq('is_invoiced', false);

      if (input?.projectId) {
        query = query.eq('project_id', input.projectId);
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }),

  // Get total hours by project
  getTotalHoursByProject: publicProcedure
    .input(z.object({
      projectId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('backoffice_time_entries')
        .select('total_hours, chargeable_hours')
        .eq('project_id', input.projectId);

      if (input.startDate) {
        query = query.gte('date', input.startDate);
      }

      if (input.endDate) {
        query = query.lte('date', input.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate totals
      const totals = (data || []).reduce(
        (acc, entry) => ({
          totalHours: acc.totalHours + (parseFloat(entry.total_hours as any) || 0),
          chargeableHours: acc.chargeableHours + (parseFloat(entry.chargeable_hours as any) || 0),
        }),
        { totalHours: 0, chargeableHours: 0 }
      );

      return totals;
    }),

  // Create time entry
  create: publicProcedure
    .input(z.object({
      project_id: z.number(),
      contact_id: z.number().optional(),
      contact_ids: z.array(z.number()).optional(),
      date: z.string(),
      start_time: z.string(),
      end_time: z.string(),
      total_hours: z.number().min(0).max(24),
      chargeable_hours: z.number().min(0).max(24),
      location: z.string().optional(),
      objective: z.string().optional(),
      notes: z.string().optional(),
      is_wbso: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('[CREATE TIME ENTRY] Received input:', JSON.stringify(input, null, 2));

      const { contact_ids, ...entryData } = input;

      // Create the time entry - convert empty strings to null for optional fields
      const insertData = {
        project_id: entryData.project_id,
        date: entryData.date,
        start_time: entryData.start_time && entryData.start_time !== '' ? entryData.start_time : null,
        end_time: entryData.end_time && entryData.end_time !== '' ? entryData.end_time : null,
        total_hours: entryData.total_hours,
        chargeable_hours: entryData.chargeable_hours,
        location: entryData.location && entryData.location !== '' ? entryData.location : null,
        objective: entryData.objective && entryData.objective !== '' ? entryData.objective : null,
        notes: entryData.notes && entryData.notes !== '' ? entryData.notes : null,
        is_wbso: entryData.is_wbso || false,
        is_invoiced: false,
      };

      console.log('[CREATE TIME ENTRY] Insert data:', JSON.stringify(insertData, null, 2));

      const { data: entry, error: entryError } = await ctx.supabase
        .from('backoffice_time_entries')
        .insert([insertData])
        .select()
        .single();

      if (entryError) throw entryError;

      // Add contacts to junction table if provided
      if (contact_ids && contact_ids.length > 0) {
        const contactRecords = contact_ids.map(contactId => ({
          time_entry_id: entry.id,
          contact_id: contactId,
        }));

        const { error: contactError } = await ctx.supabase
          .from('backoffice_time_entry_contacts')
          .insert(contactRecords);

        if (contactError && !contactError.message.includes('duplicate')) {
          throw contactError;
        }
      }

      return entry;
    }),

  // Update time entry
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        project_id: z.number().optional(),
        contact_id: z.number().optional(),
        contact_ids: z.array(z.number()).optional(),
        date: z.string().optional(),
        start_time: z.string().optional().nullable().or(z.literal('')),
        end_time: z.string().optional().nullable().or(z.literal('')),
        total_hours: z.number().min(0).max(24).optional(),
        chargeable_hours: z.number().min(0).max(24).optional(),
        location: z.string().optional().nullable().or(z.literal('')),
        objective: z.string().optional().nullable().or(z.literal('')),
        notes: z.string().optional().nullable().or(z.literal('')),
        is_wbso: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if exists and is not invoiced
      const { data: existing, error: fetchError } = await ctx.supabase
        .from('backoffice_time_entries')
        .select('id, is_invoiced')
        .eq('id', input.id)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error('Time entry not found');
      if (existing.is_invoiced) {
        throw new Error('Cannot update invoiced time entry');
      }

      const { contact_ids, ...updateData } = input.data;

      // Update the time entry
      const { data: updated, error: updateError } = await ctx.supabase
        .from('backoffice_time_entries')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update contacts in junction table if provided
      if (contact_ids !== undefined) {
        // Remove existing contacts
        await ctx.supabase
          .from('backoffice_time_entry_contacts')
          .delete()
          .eq('time_entry_id', input.id);

        // Add new contacts
        if (contact_ids.length > 0) {
          const contactRecords = contact_ids.map(contactId => ({
            time_entry_id: input.id,
            contact_id: contactId,
          }));

          const { error: contactError } = await ctx.supabase
            .from('backoffice_time_entry_contacts')
            .insert(contactRecords);

          if (contactError && !contactError.message.includes('duplicate')) {
            throw contactError;
          }
        }
      }

      return updated;
    }),

  // Delete time entry
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Check if exists and is not invoiced
      const { data: existing, error: fetchError } = await ctx.supabase
        .from('backoffice_time_entries')
        .select('id, is_invoiced')
        .eq('id', input.id)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error('Time entry not found');
      if (existing.is_invoiced) {
        throw new Error('Cannot delete invoiced time entry');
      }

      // Delete the time entry (cascade will handle contacts)
      const { error } = await ctx.supabase
        .from('backoffice_time_entries')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
      return { success: true };
    }),

  // Mark time entries as invoiced
  markAsInvoiced: publicProcedure
    .input(z.object({
      timeEntryIds: z.array(z.number()),
      invoiceId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('backoffice_time_entries')
        .update({
          is_invoiced: true,
          invoice_id: input.invoiceId,
        })
        .in('id', input.timeEntryIds);

      if (error) throw error;
      return { success: true };
    }),
});

export { timeEntriesRouter };
