import { supabase } from './client';
import { useSupabaseQuery, useSupabaseMutation, useInvalidateQuery } from './hooks';
import { OrganizationEntity, DutchBusinessInfo } from './types';

export type CompanyType = 'client' | 'supplier' | 'both';

/**
 * Company model - extends OrganizationEntity with business-specific fields
 */
export interface Company extends OrganizationEntity, DutchBusinessInfo {
  type: CompanyType;
  main_contact_person?: string | null;
}

export type CreateCompanyInput = Omit<Company, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCompanyInput = Partial<CreateCompanyInput>;

const QUERY_KEY = ['companies'];

// Fetch all companies
export function useCompanies() {
  return useSupabaseQuery<Company[]>(
    QUERY_KEY,
    () => supabase.from('backoffice_companies').select('*').order('name')
  );
}

export interface CompanyWithSpent extends Company {
  total_spent?: number;
}

// Fetch single company
export function useCompany(id?: number) {
  return useSupabaseQuery<CompanyWithSpent>(
    [...QUERY_KEY, String(id)],
    async () => {
      const { data: company, error } = await supabase
        .from('backoffice_companies')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) return { data: null, error };
      if (!company) return { data: null, error: new Error('Company not found') as any };

      // Get total spending if this is a supplier
      let totalSpent = 0;
      if (company.type === 'supplier' || company.type === 'both') {
        const { data, error: spendError } = await supabase
          .from('backoffice_incoming_invoices')
          .select('total_amount')
          .eq('supplier_id', id!)
          .eq('review_status', 'approved');

        if (spendError) return { data: null, error: spendError };
        totalSpent = (data || []).reduce((sum: number, row: any) => sum + (parseFloat(row.total_amount) || 0), 0);
      }

      return {
        data: {
          ...company,
          total_spent: totalSpent,
        },
        error: null
      };
    },
    { enabled: !!id }
  );
}

// Create company
export function useCreateCompany() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Company, CreateCompanyInput>(
    (input) => supabase.from('backoffice_companies').insert([input]).select().single(),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Update company
export function useUpdateCompany() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Company, { id: number; data: UpdateCompanyInput }>(
    ({ id, data }) => supabase.from('backoffice_companies').update(data).eq('id', id).select().single(),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Delete company
export function useDeleteCompany() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<void, { id: number }>(
    ({ id }) => supabase.from('backoffice_companies').delete().eq('id', id),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}
