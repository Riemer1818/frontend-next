import { supabase } from './client';
import { useSupabaseQuery, useSupabaseMutation, useInvalidateQuery } from './hooks';

export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'cancelled';

export interface Project {
  id: number;
  name: string;
  client_id: number;
  description?: string | null;
  hourly_rate: number;
  tax_rate_id: number;
  status: ProjectStatus;
  start_date?: string | null;
  end_date?: string | null;
  currency: string;
  color: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectWithClient extends Project {
  client_name?: string | null;
  total_spent?: number;
}

export type CreateProjectInput = Omit<Project, 'id' | 'created_at' | 'updated_at'>;
export type UpdateProjectInput = Partial<CreateProjectInput>;

const QUERY_KEY = ['projects'];

// Fetch all projects
export function useProjects(params?: { status?: ProjectStatus; clientId?: number }) {
  return useSupabaseQuery<ProjectWithClient[]>(
    params ? [...QUERY_KEY, JSON.stringify(params)] : QUERY_KEY,
    async () => {
      let query = supabase
        .from('backoffice_projects')
        .select('*, companies:client_id(name)')
        .order('id', { ascending: false });

      if (params?.status) {
        query = query.eq('status', params.status);
      }

      if (params?.clientId) {
        query = query.eq('client_id', params.clientId);
      }

      const { data, error } = await query;
      if (error) return { data: null, error };

      const result = (data || []).map((project: any) => ({
        ...project,
        client_name: project.companies?.name || null,
        companies: undefined,
      }));

      return { data: result, error: null };
    }
  );
}

// Fetch single project
export function useProject(id?: number) {
  return useSupabaseQuery<ProjectWithClient>(
    [...QUERY_KEY, String(id)],
    async () => {
      const { data: project, error: projectError } = await supabase
        .from('backoffice_projects')
        .select('*, companies:client_id(name)')
        .eq('id', id!)
        .single();

      if (projectError) return { data: null, error: projectError };
      if (!project) return { data: null, error: new Error('Project not found') as any };

      // Get total spending for this project
      const { data: invoices, error: invoiceError } = await supabase
        .from('backoffice_incoming_invoices')
        .select('total_amount')
        .eq('project_id', id)
        .eq('review_status', 'approved');

      if (invoiceError) return { data: null, error: invoiceError };

      const total_spent = (invoices || []).reduce(
        (sum: number, row: any) => sum + (parseFloat(row.total_amount) || 0),
        0
      );

      return {
        data: {
          ...project,
          client_name: project.companies?.name || null,
          companies: undefined,
          total_spent,
        },
        error: null
      };
    },
    { enabled: !!id }
  );
}

// Get monthly expenses for a project
export function useProjectMonthlyExpenses(id?: number) {
  return useSupabaseQuery<Array<{ month: string; invoice_count: number; total_spent: number }>>(
    [...QUERY_KEY, String(id), 'monthly-expenses'],
    async () => {
      const { data: invoices, error } = await supabase
        .from('backoffice_incoming_invoices')
        .select('invoice_date, total_amount')
        .eq('project_id', id!)
        .eq('review_status', 'approved')
        .order('invoice_date', { ascending: false });

      if (error) return { data: null, error };

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

      const result = Array.from(monthlyMap.entries())
        .map(([month, stats]) => ({
          month,
          invoice_count: stats.count,
          total_spent: stats.total,
        }))
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12);

      return { data: result, error: null };
    },
    { enabled: !!id }
  );
}

// Create project
export function useCreateProject() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Project, CreateProjectInput>(
    (input) => supabase.from('backoffice_projects').insert([input]).select().single(),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Update project
export function useUpdateProject() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<Project, { id: number; data: UpdateProjectInput }>(
    ({ id, data }) => supabase.from('backoffice_projects').update(data).eq('id', id).select().single(),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}

// Delete project
export function useDeleteProject() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<void, { id: number }>(
    ({ id }) => supabase.from('backoffice_projects').delete().eq('id', id),
    {
      onSuccess: () => invalidate(QUERY_KEY),
    }
  );
}
