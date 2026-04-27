import { supabase } from './client';
import { useSupabaseQuery } from './hooks';

export interface DashboardStats {
  income_this_month: number;
  income_ytd: number;
  expenses_this_month: number;
  expenses_ytd: number;
  profit_this_month: number;
  profit_ytd: number;
  active_clients: number;
  active_projects: number;
  vat_this_quarter: number;
  vat_to_pay_total: number;
  estimated_income_tax_ytd: number;
  pending_expenses_count: number;
  pending_expenses_amount: number;
}

export interface OutstandingInvoice {
  id: number;
  client_id: number;
  client_name?: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  total_amount: number;
  payment_status: string;
}

export interface IncomeExpenseTrend {
  period: string;
  income: number;
  expenses: number;
  profit: number;
  uninvoiced?: number;
}

export interface TaxRate {
  id: number;
  name: string;
  rate: number;
  type: string;
}

const QUERY_KEY = ['reporting'];

// Get dashboard statistics
export function useDashboardStats(referenceDate: Date = new Date()) {
  const dateKey = referenceDate.toISOString().split('T')[0];
  return useSupabaseQuery<DashboardStats>(
    [...QUERY_KEY, 'dashboard-stats', dateKey],
    async () => {
      const now = referenceDate;
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

      // Get invoices (income)
      const { data: allInvoices, error: invoiceError} = await supabase
        .from('backoffice_invoices')
        .select('invoice_date, total_amount');

      console.log('[Dashboard Stats] Invoices query result:', {
        data: allInvoices,
        error: invoiceError,
        count: allInvoices?.length
      });

      if (invoiceError) throw invoiceError;

      const invoices = allInvoices || [];
      const income_this_month = invoices
        .filter((inv: any) => inv.invoice_date >= firstDayOfMonth && inv.invoice_date <= lastDayOfMonth)
        .reduce((sum: number, inv: any) => sum + (parseFloat(inv.total_amount) || 0), 0);

      const income_ytd = invoices
        .filter((inv: any) => inv.invoice_date >= firstDayOfYear && inv.invoice_date <= lastDayOfMonth)
        .reduce((sum: number, inv: any) => sum + (parseFloat(inv.total_amount) || 0), 0);

      // Get expenses
      const { data: allExpenses, error: expenseError } = await supabase
        .from('backoffice_incoming_invoices')
        .select('invoice_date, total_amount, deductibility_percentage')
        .eq('review_status', 'approved');

      console.log('[Dashboard Stats] Expenses query result:', {
        data: allExpenses,
        error: expenseError,
        count: allExpenses?.length
      });

      if (expenseError) throw expenseError;

      const expenses = allExpenses || [];
      const expenses_this_month = expenses
        .filter((exp: any) => exp.invoice_date >= firstDayOfMonth && exp.invoice_date <= lastDayOfMonth)
        .reduce((sum: number, exp: any) => {
          const amount = parseFloat(exp.total_amount) || 0;
          const deductibility = (exp.deductibility_percentage || 100) / 100;
          return sum + (amount * deductibility);
        }, 0);

      const expenses_ytd = expenses
        .filter((exp: any) => exp.invoice_date >= firstDayOfYear && exp.invoice_date <= lastDayOfMonth)
        .reduce((sum: number, exp: any) => {
          const amount = parseFloat(exp.total_amount) || 0;
          const deductibility = (exp.deductibility_percentage || 100) / 100;
          return sum + (amount * deductibility);
        }, 0);

      // Count active clients
      const { count: clientCount, error: clientError } = await supabase
        .from('backoffice_companies')
        .select('*', { count: 'exact', head: true })
        .in('type', ['client', 'both'])
        .eq('is_active', true);

      console.log('[Dashboard Stats] Client count result:', {
        count: clientCount,
        error: clientError
      });

      if (clientError) throw clientError;

      // Count active projects
      const { count: projectCount, error: projectError } = await supabase
        .from('backoffice_projects')
        .select('*', { count: 'exact', head: true });

      console.log('[Dashboard Stats] Project count result:', {
        count: projectCount,
        error: projectError
      });

      if (projectError) throw projectError;

      // Get VAT data for current quarter
      const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
      const currentYear = now.getFullYear();

      const { data: vatData, error: vatError } = await supabase
        .from('vat_settlement')
        .select('net_vat_to_pay')
        .eq('year', currentYear)
        .eq('quarter', currentQuarter)
        .maybeSingle();

      console.log('[Dashboard Stats] VAT quarter query result:', {
        data: vatData,
        error: vatError,
        currentQuarter,
        currentYear
      });

      if (vatError) throw vatError;

      const vat_this_quarter = vatData ? parseFloat(vatData.net_vat_to_pay) || 0 : 0;

      // Get total outstanding VAT
      const { data: allVatData, error: allVatError } = await supabase
        .from('vat_settlement')
        .select('net_vat_to_pay, balance');

      console.log('[Dashboard Stats] All VAT data query result:', {
        data: allVatData,
        error: allVatError,
        count: allVatData?.length
      });

      if (allVatError) throw allVatError;

      const vat_to_pay_total = (allVatData || []).reduce(
        (sum: number, row: any) => sum + (parseFloat(row.balance) || 0),
        0
      );

      // Rough estimate of income tax (30% of profit for simplicity)
      const estimated_income_tax_ytd = (income_ytd - expenses_ytd) * 0.3;

      // Count pending expenses
      const { data: pendingExpenses, error: pendingError } = await supabase
        .from('backoffice_incoming_invoices')
        .select('total_amount')
        .eq('review_status', 'pending');

      console.log('[Dashboard Stats] Pending expenses query result:', {
        data: pendingExpenses,
        error: pendingError,
        count: pendingExpenses?.length
      });

      if (pendingError) throw pendingError;

      const pending_expenses_count = (pendingExpenses || []).length;
      const pending_expenses_amount = (pendingExpenses || []).reduce(
        (sum: number, exp: any) => sum + (parseFloat(exp.total_amount) || 0),
        0
      );

      const result = {
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

      console.log('[Dashboard Stats] Final calculations:', result);

      return {
        data: result,
        error: null
      };
    }
  );
}

// Get outstanding (unpaid) invoices
export function useOutstandingInvoices() {
  return useSupabaseQuery<OutstandingInvoice[]>(
    [...QUERY_KEY, 'outstanding-invoices'],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_invoices')
        .select('*, companies:client_id(name)')
        .in('status', ['unpaid', 'partially_paid', 'overdue'])
        .order('invoice_date', { ascending: false });

      if (error) return { data: null, error };

      const result = (data || []).map((invoice: any) => ({
        ...invoice,
        payment_status: invoice.status,
        client_name: invoice.companies?.name || null,
        companies: undefined,
      }));

      return { data: result, error: null };
    }
  );
}

// Get income vs expense trend over time
export function useIncomeExpenseTrend(months?: number, referenceDate: Date = new Date()) {
  const monthCount = months || 6;
  const dateKey = referenceDate.toISOString().split('T')[0];

  return useSupabaseQuery<IncomeExpenseTrend[]>(
    [...QUERY_KEY, 'income-expense-trend', String(monthCount), dateKey],
    async () => {
      const endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
      const monthsAgo = new Date(endDate);
      monthsAgo.setMonth(monthsAgo.getMonth() - monthCount + 1);
      const startDate = new Date(monthsAgo.getFullYear(), monthsAgo.getMonth(), 1).toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get invoices (income)
      const { data: invoices, error: invoiceError } = await supabase
        .from('backoffice_invoices')
        .select('invoice_date, total_amount')
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDateStr)
        .order('invoice_date', { ascending: true });

      if (invoiceError) throw invoiceError;

      // Get expenses
      const { data: expenses, error: expenseError } = await supabase
        .from('backoffice_incoming_invoices')
        .select('invoice_date, total_amount, deductibility_percentage')
        .eq('review_status', 'approved')
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDateStr)
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
        const amount = parseFloat(exp.total_amount) || 0;
        const deductibility = (exp.deductibility_percentage || 100) / 100;
        monthlyData[month].expenses += amount * deductibility;
      });

      // Convert to array and sort
      const result = Object.entries(monthlyData)
        .map(([month, data]) => ({
          period: month,
          income: data.income,
          expenses: data.expenses,
          profit: data.income - data.expenses,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      return {
        data: result,
        error: null
      };
    }
  );
}

// Get tax rates
export function useTaxRates() {
  return useSupabaseQuery<TaxRate[]>(
    [...QUERY_KEY, 'tax-rates'],
    async () => {
      // TODO: Replace with actual database query when tax rates table exists
      return [
        { id: 1, name: 'Standard VAT', rate: 21, type: 'vat' },
        { id: 2, name: 'Reduced VAT', rate: 9, type: 'vat' },
        { id: 3, name: 'Zero VAT', rate: 0, type: 'vat' },
      ];
    }
  );
}
