import { supabase } from './client';
import { useSupabaseQuery, useSupabaseMutation, useInvalidateQuery } from './hooks';
import { PersonEntity } from './types';

/**
 * Contact model - extends PersonEntity with company relationship and role info
 */
export interface Contact extends PersonEntity {
  company_id?: number | null;
  role?: string | null;
  description?: string | null;
  is_primary: boolean;
}

export interface ContactWithCompany extends Contact {
  company_name?: string | null;
}

export type CreateContactInput = Omit<Contact, 'id' | 'created_at' | 'updated_at'>;
export type UpdateContactInput = Partial<CreateContactInput>;

const QUERY_KEY = ['contacts'];

// Fetch all contacts
export function useContacts(params?: { companyId?: number; isActive?: boolean }) {
  return useSupabaseQuery<Contact[]>(
    params ? [...QUERY_KEY, JSON.stringify(params)] : QUERY_KEY,
    () => {
      let query = supabase
        .from('backoffice_contacts')
        .select('*')
        .order('first_name', { ascending: true });

      if (params?.companyId) {
        query = query.eq('company_id', params.companyId);
      }

      if (params?.isActive !== undefined) {
        query = query.eq('is_active', params.isActive);
      }

      return query;
    }
  );
}

// Fetch all contacts with company info
export function useContactsWithCompany(params?: { isActive?: boolean }) {
  return useSupabaseQuery<ContactWithCompany[]>(
    [...QUERY_KEY, 'with-company', JSON.stringify(params || {})],
    async () => {
      let query = supabase
        .from('backoffice_contacts')
        .select('*, companies:company_id(name)')
        .order('first_name', { ascending: true });

      if (params?.isActive !== undefined) {
        query = query.eq('is_active', params.isActive);
      }

      const { data, error } = await query;
      if (error) return { data: null, error };

      const result = (data || []).map((contact: any) => ({
        ...contact,
        company_name: contact.companies?.name || null,
        companies: undefined,
      }));

      return { data: result, error: null };
    }
  );
}

// Fetch single contact
export function useContact(id?: number) {
  return useSupabaseQuery<ContactWithCompany>(
    [...QUERY_KEY, String(id)],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_contacts')
        .select('*, companies:company_id(name)')
        .eq('id', id!)
        .single();

      if (error) return { data: null, error };

      return {
        data: {
          ...data,
          company_name: data.companies?.name || null,
          companies: undefined,
        },
        error: null
      };
    },
    { enabled: !!id }
  );
}

// Fetch contacts by company
export function useContactsByCompany(companyId?: number, activeOnly?: boolean) {
  return useSupabaseQuery<Contact[]>(
    [...QUERY_KEY, 'by-company', String(companyId), String(activeOnly)],
    () => {
      let query = supabase
        .from('backoffice_contacts')
        .select('*')
        .eq('company_id', companyId!)
        .order('first_name', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      return query;
    },
    { enabled: !!companyId }
  );
}

// Fetch primary contact for a company
export function usePrimaryContact(companyId?: number) {
  return useSupabaseQuery<Contact | null>(
    [...QUERY_KEY, 'primary', String(companyId)],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_contacts')
        .select('*')
        .eq('company_id', companyId!)
        .eq('is_primary', true)
        .maybeSingle();

      if (error) return { data: null, error };
      return { data, error: null };
    },
    { enabled: !!companyId }
  );
}

// Search contacts
export function useSearchContacts(query?: string) {
  return useSupabaseQuery<Contact[]>(
    [...QUERY_KEY, 'search', query || ''],
    () =>
      supabase
        .from('backoffice_contacts')
        .select('*')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('first_name', { ascending: true }),
    { enabled: !!query && query.length > 0 }
  );
}

// Create contact
export function useCreateContact() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Contact, CreateContactInput>(
    async (input) => {
      // If setting as primary, unset other primary contacts for this company
      if (input.is_primary && input.company_id) {
        await supabase
          .from('backoffice_contacts')
          .update({ is_primary: false })
          .eq('company_id', input.company_id)
          .eq('is_primary', true);
      }

      return supabase.from('backoffice_contacts').insert([input]).select().single();
    },
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Update contact
export function useUpdateContact() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Contact, { id: number; data: UpdateContactInput }>(
    async ({ id, data }) => {
      // If setting as primary, unset other primary contacts for this company
      if (data.is_primary && data.company_id) {
        await supabase
          .from('backoffice_contacts')
          .update({ is_primary: false })
          .eq('company_id', data.company_id)
          .eq('is_primary', true)
          .neq('id', id);
      }

      return supabase.from('backoffice_contacts').update(data).eq('id', id).select().single();
    },
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Set contact as primary
export function useSetPrimaryContact() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<void, { id: number }>(
    async ({ id }) => {
      // Get the contact to find its company_id
      const { data: contact, error: fetchError } = await supabase
        .from('backoffice_contacts')
        .select('company_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!contact) throw new Error('Contact not found');

      // Unset other primary contacts for this company
      if (contact.company_id) {
        await supabase
          .from('backoffice_contacts')
          .update({ is_primary: false })
          .eq('company_id', contact.company_id)
          .eq('is_primary', true);
      }

      // Set this contact as primary
      return supabase.from('backoffice_contacts').update({ is_primary: true }).eq('id', id);
    },
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Delete contact
export function useDeleteContact() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<void, { id: number }>(
    ({ id }) => supabase.from('backoffice_contacts').delete().eq('id', id),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}
