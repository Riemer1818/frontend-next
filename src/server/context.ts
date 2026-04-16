import { supabase } from '@/lib/supabase';

const db = {
  query: async (sql: string, params?: any[]) => {
    throw new Error(
      'ctx.db.query() is deprecated. Use ctx.supabase.from() to query tables/views instead.'
    );
  }
};

export const createContext = () => {
  return {
    supabase,
    db,
    repos: new Proxy({}, {
      get() {
        throw new Error('ctx.repos is deprecated. Use ctx.supabase instead.');
      }
    }) as any,
  };
};

export type Context = ReturnType<typeof createContext>;
