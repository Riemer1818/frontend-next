import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc';

const reportingRouter = router({
  // Get dashboard statistics
  getDashboardStats: publicProcedure
    .query(async ({ ctx }) => {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

      // Get invoices (income)
      const { data: allInvoices, error: invoiceError } = await ctx.supabase
        .from('backoffice_invoices')
        .select('invoice_date, total_amount');

      if (invoiceError) throw invoiceError;

      const invoices = allInvoices || [];
      const income_this_month = invoices
        .filter((inv: any) => inv.invoice_date >= firstDayOfMonth)
        .reduce((sum: number, inv: any) => sum + (parseFloat(inv.total_amount) || 0), 0);

      const income_ytd = invoices
        .filter((inv: any) => inv.invoice_date >= firstDayOfYear)
        .reduce((sum: number, inv: any) => sum + (parseFloat(inv.total_amount) || 0), 0);

      // Get expenses
      const { data: allExpenses, error: expenseError } = await ctx.supabase
        .from('backoffice_incoming_invoices')
        .select('invoice_date, total_amount')
        .eq('review_status', 'approved');

      if (expenseError) throw expenseError;

      const expenses = allExpenses || [];
      const expenses_this_month = expenses
        .filter((exp: any) => exp.invoice_date >= firstDayOfMonth)
        .reduce((sum: number, exp: any) => sum + (parseFloat(exp.total_amount) || 0), 0);

      const expenses_ytd = expenses
        .filter((exp: any) => exp.invoice_date >= firstDayOfYear)
        .reduce((sum: number, exp: any) => sum + (parseFloat(exp.total_amount) || 0), 0);

      // Count active clients
      const { count: clientCount, error: clientError } = await ctx.supabase
        .from('backoffice_companies')
        .select('*', { count: 'exact', head: true })
        .in('type', ['client', 'both'])
        .eq('is_active', true);

      if (clientError) throw clientError;

      // Count active projects
      const { count: projectCount, error: projectError } = await ctx.supabase
        .from('backoffice_projects')
        .select('*', { count: 'exact', head: true });

      if (projectError) throw projectError;

      // Get VAT data for current quarter
      const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
      const currentYear = now.getFullYear();

      const { data: vatData, error: vatError } = await ctx.supabase
        .from('vat_settlement')
        .select('net_vat_to_pay')
        .eq('year', currentYear)
        .eq('quarter', currentQuarter)
        .maybeSingle();

      if (vatError) throw vatError;

      const vat_this_quarter = vatData ? parseFloat(vatData.net_vat_to_pay) || 0 : 0;

      // Get total outstanding VAT
      const { data: allVatData, error: allVatError } = await ctx.supabase
        .from('vat_settlement')
        .select('net_vat_to_pay, balance');

      if (allVatError) throw allVatError;

      const vat_to_pay_total = (allVatData || []).reduce((sum: number, row: any) =>
        sum + (parseFloat(row.balance) || 0), 0
      );

      // Rough estimate of income tax (30% of profit for simplicity)
      const estimated_income_tax_ytd = (income_ytd - expenses_ytd) * 0.30;

      // Count pending expenses
      const { data: pendingExpenses, error: pendingError } = await ctx.supabase
        .from('backoffice_incoming_invoices')
        .select('total_amount')
        .eq('review_status', 'pending');

      if (pendingError) throw pendingError;

      const pending_expenses_count = (pendingExpenses || []).length;
      const pending_expenses_amount = (pendingExpenses || []).reduce((sum: number, exp: any) =>
        sum + (parseFloat(exp.total_amount) || 0), 0
      );

      return {
        income_this_month,
        income_ytd,
        expenses_this_month,
        expenses_ytd,
        profit_this_month: income_this_month - expenses_this_month,
        profit_ytd: income_ytd - expenses_ytd,
        active_clients: clientCount || 0,
        active_projects: projectCount || 0,
        vat_this_quarter,
        vat_to_pay_total,
        estimated_income_tax_ytd,
        pending_expenses_count,
        pending_expenses_amount,
      };
    }),

  // Get outstanding (unpaid) invoices
  getOutstandingInvoices: publicProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('backoffice_invoices')
        .select('*, companies:client_id(name)')
        .in('payment_status', ['unpaid', 'partially_paid', 'overdue'])
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((invoice: any) => ({
        ...invoice,
        client_name: (invoice.companies as any)?.name || null,
        companies: undefined,
      }));
    }),

  // Get income vs expense trend over time
  getIncomeExpenseTrend: publicProcedure
    .input(z.object({
      months: z.number().min(1).max(24).default(6),
    }))
    .query(async ({ ctx, input }) => {
      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - input.months);
      const startDate = monthsAgo.toISOString().split('T')[0];

      // Get invoices (income)
      const { data: invoices, error: invoiceError } = await ctx.supabase
        .from('backoffice_invoices')
        .select('invoice_date, total_amount')
        .gte('invoice_date', startDate)
        .order('invoice_date', { ascending: true });

      if (invoiceError) throw invoiceError;

      // Get expenses
      const { data: expenses, error: expenseError } = await ctx.supabase
        .from('backoffice_incoming_invoices')
        .select('invoice_date, total_amount')
        .eq('review_status', 'approved')
        .gte('invoice_date', startDate)
        .order('invoice_date', { ascending: true });

      if (expenseError) throw expenseError;

      // Group by month
      const monthlyData: Record<string, { income: number; expenses: number }> = {};

      (invoices || []).forEach((inv: any) => {
        const month = inv.invoice_date.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0 };
        monthlyData[month].income += parseFloat(inv.total_amount) || 0;
      });

      (expenses || []).forEach((exp: any) => {
        const month = exp.invoice_date.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0 };
        monthlyData[month].expenses += parseFloat(exp.total_amount) || 0;
      });

      // Convert to array and sort
      return Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          income: data.income,
          expenses: data.expenses,
          net: data.income - data.expenses,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }),

  // Get tax rates (stub for now)
  getTaxRates: publicProcedure
    .query(async () => {
      return [
        { id: 1, name: 'Standard VAT', rate: 21, type: 'vat' },
        { id: 2, name: 'Reduced VAT', rate: 9, type: 'vat' },
        { id: 3, name: 'Zero VAT', rate: 0, type: 'vat' },
      ];
    }),
});

export { reportingRouter };
