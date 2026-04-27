import { supabase } from './client';
import { useSupabaseQuery } from './hooks';

export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
}

const QUERY_KEY = ['expense-categories'];

// Fetch all active expense categories
export function useExpenseCategories() {
  return useSupabaseQuery<ExpenseCategory[]>(
    QUERY_KEY,
    () =>
      supabase
        .from('backoffice_expense_categories')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
  );
}
