import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { supabase } from './client';
import { PostgrestError } from '@supabase/supabase-js';

// Generic hook for fetching data
export function useSupabaseQuery<T = any>(
  key: string[],
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await queryFn();
      if (error) {
        console.error(`[Supabase Error] ${key.join('/')}:`, error);
        throw error;
      }
      // Ensure we never return null/undefined - return empty array for array types, empty object for objects
      if (data === null || data === undefined) {
        console.warn(`[Supabase] Query returned null for ${key.join('/')}, returning empty array`);
        return [] as T;
      }
      return data as T;
    },
    ...options,
  });
}

// Generic hook for mutations (create, update, delete)
export function useSupabaseMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData | null; error: PostgrestError | null }>,
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const { data, error } = await mutationFn(variables);
      if (error) throw error;
      return data as TData;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate relevant queries on success
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

// Helper to invalidate queries
export function useInvalidateQuery() {
  const queryClient = useQueryClient();
  return (key: string[]) => queryClient.invalidateQueries({ queryKey: key });
}
