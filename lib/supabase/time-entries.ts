import { supabase } from './client';
import { useSupabaseQuery, useSupabaseMutation, useInvalidateQuery } from './hooks';

export interface TimeEntry {
  id: number;
  project_id: number;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  total_hours: number;
  chargeable_hours: number;
  location?: string | null;
  objective?: string | null;
  notes?: string | null;
  is_wbso: boolean;
  is_invoiced: boolean;
  invoice_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface TimeEntryWithRelations extends TimeEntry {
  projects?: {
    id: number;
    name: string;
    client_id: number;
    color?: string;
    companies?: {
      id: number;
      name: string;
    };
  } | null;
  contacts?: Array<{
    contact_id: number;
    contacts: {
      id: number;
      first_name: string;
      last_name?: string | null;
    };
  }>;
}

export type CreateTimeEntryInput = Omit<TimeEntry, 'id' | 'created_at' | 'updated_at' | 'is_invoiced' | 'invoice_id'> & {
  contact_ids?: number[];
};
export type UpdateTimeEntryInput = Partial<CreateTimeEntryInput>;

const QUERY_KEY = ['time-entries'];

// Fetch all time entries
export function useTimeEntries(params?: {
  projectId?: number;
  contactId?: number;
  startDate?: string;
  endDate?: string;
  isInvoiced?: boolean;
}) {
  return useSupabaseQuery<TimeEntryWithRelations[]>(
    params ? [...QUERY_KEY, JSON.stringify(params)] : QUERY_KEY,
    () => {
      let query = supabase
        .from('backoffice_time_entries')
        .select(
          `
          *,
          projects:project_id(id, name, client_id, color),
          contacts:backoffice_time_entry_contacts(contact_id, contacts:contact_id(id, first_name, last_name))
        `
        )
        .order('date', { ascending: false });

      if (params?.projectId) {
        query = query.eq('project_id', params.projectId);
      }

      if (params?.startDate && params?.endDate) {
        query = query.gte('date', params.startDate).lte('date', params.endDate);
      }

      if (params?.isInvoiced !== undefined) {
        query = query.eq('is_invoiced', params.isInvoiced);
      }

      return query;
    }
  );
}

// Fetch single time entry
export function useTimeEntry(id?: number) {
  return useSupabaseQuery<TimeEntryWithRelations>(
    [...QUERY_KEY, String(id)],
    () =>
      supabase
        .from('backoffice_time_entries')
        .select(
          `
          *,
          projects:project_id(id, name, client_id),
          contacts:backoffice_time_entry_contacts(contact_id, contacts:contact_id(id, first_name, last_name))
        `
        )
        .eq('id', id!)
        .single(),
    { enabled: !!id }
  );
}

// Fetch time entries by date range
export function useTimeEntriesByDateRange(startDate?: string, endDate?: string) {
  return useSupabaseQuery<TimeEntryWithRelations[]>(
    [...QUERY_KEY, 'by-date-range', startDate || '', endDate || ''],
    () =>
      supabase
        .from('backoffice_time_entries')
        .select(
          `
          *,
          projects:project_id(id, name, client_id, color, companies:client_id(id, name)),
          contacts:backoffice_time_entry_contacts(contact_id, contacts:contact_id(id, first_name, last_name))
        `
        )
        .gte('date', startDate!)
        .lte('date', endDate!)
        .order('date', { ascending: false }),
    { enabled: !!startDate && !!endDate }
  );
}

// Fetch uninvoiced time entries
export function useUninvoicedTimeEntries(projectId?: number) {
  return useSupabaseQuery<TimeEntryWithRelations[]>(
    projectId ? [...QUERY_KEY, 'uninvoiced', String(projectId)] : [...QUERY_KEY, 'uninvoiced'],
    () => {
      let query = supabase
        .from('backoffice_time_entries')
        .select(
          `
          *,
          projects:project_id(id, name, client_id)
        `
        )
        .eq('is_invoiced', false)
        .order('date', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      return query;
    }
  );
}

// Get total hours by project
export function useProjectTotalHours(
  projectId?: number,
  params?: { startDate?: string; endDate?: string }
) {
  return useSupabaseQuery<{ totalHours: number; chargeableHours: number }>(
    [...QUERY_KEY, 'total-hours', String(projectId), JSON.stringify(params || {})],
    async () => {
      let query = supabase
        .from('backoffice_time_entries')
        .select('total_hours, chargeable_hours')
        .eq('project_id', projectId!);

      if (params?.startDate) {
        query = query.gte('date', params.startDate);
      }

      if (params?.endDate) {
        query = query.lte('date', params.endDate);
      }

      const { data, error } = await query;
      if (error) return { data: null, error };

      // Calculate totals
      const totals = (data || []).reduce(
        (acc, entry) => ({
          totalHours: acc.totalHours + (Number(entry.total_hours) || 0),
          chargeableHours: acc.chargeableHours + (Number(entry.chargeable_hours) || 0),
        }),
        { totalHours: 0, chargeableHours: 0 }
      );

      return { data: totals, error: null };
    },
    { enabled: !!projectId }
  );
}

// Create time entry
export function useCreateTimeEntry() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<TimeEntry, CreateTimeEntryInput>(
    async (input) => {
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

      const { data: entry, error: entryError } = await supabase
        .from('backoffice_time_entries')
        .insert([insertData])
        .select()
        .single();

      if (entryError) throw entryError;

      // Add contacts to junction table if provided
      if (contact_ids && contact_ids.length > 0) {
        const contactRecords = contact_ids.map((contactId) => ({
          time_entry_id: entry.id,
          contact_id: contactId,
        }));

        const { error: contactError } = await supabase
          .from('backoffice_time_entry_contacts')
          .insert(contactRecords);

        if (contactError && !contactError.message.includes('duplicate')) {
          throw contactError;
        }
      }

      return entry;
    },
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Update time entry
export function useUpdateTimeEntry() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<TimeEntry, { id: number; data: UpdateTimeEntryInput }>(
    async ({ id, data }) => {
      // Check if exists and is not invoiced
      const { data: existing, error: fetchError } = await supabase
        .from('backoffice_time_entries')
        .select('id, is_invoiced')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error('Time entry not found');
      if (existing.is_invoiced) {
        throw new Error('Cannot update invoiced time entry');
      }

      const { contact_ids, ...updateData } = data;

      // Update the time entry
      const { data: updated, error: updateError } = await supabase
        .from('backoffice_time_entries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update contacts in junction table if provided
      if (contact_ids !== undefined) {
        // Remove existing contacts
        await supabase.from('backoffice_time_entry_contacts').delete().eq('time_entry_id', id);

        // Add new contacts
        if (contact_ids.length > 0) {
          const contactRecords = contact_ids.map((contactId) => ({
            time_entry_id: id,
            contact_id: contactId,
          }));

          const { error: contactError } = await supabase
            .from('backoffice_time_entry_contacts')
            .insert(contactRecords);

          if (contactError && !contactError.message.includes('duplicate')) {
            throw contactError;
          }
        }
      }

      return updated;
    },
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Delete time entry
export function useDeleteTimeEntry() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<void, { id: number }>(
    async ({ id }) => {
      // Check if exists and is not invoiced
      const { data: existing, error: fetchError } = await supabase
        .from('backoffice_time_entries')
        .select('id, is_invoiced')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) throw new Error('Time entry not found');
      if (existing.is_invoiced) {
        throw new Error('Cannot delete invoiced time entry');
      }

      // Delete the time entry (cascade will handle contacts)
      return supabase.from('backoffice_time_entries').delete().eq('id', id);
    },
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Mark time entries as invoiced
export function useMarkTimeEntriesAsInvoiced() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<void, { timeEntryIds: number[]; invoiceId: number }>(
    ({ timeEntryIds, invoiceId }) =>
      supabase
        .from('backoffice_time_entries')
        .update({
          is_invoiced: true,
          invoice_id: invoiceId,
        })
        .in('id', timeEntryIds),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}
