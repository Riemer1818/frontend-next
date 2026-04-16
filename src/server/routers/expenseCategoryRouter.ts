import { router, publicProcedure } from '@/server/trpc';

const expenseCategoryRouter = router({
  // Get all expense categories
  getAll: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('backoffice_expense_categories')
      .select('id, name, description, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }),
});

export { expenseCategoryRouter };
