import { z } from 'zod';
import { router, publicProcedure } from '@/server/trpc';

const taxRouter = router({
  // Get VAT settlement (quarterly breakdown with payments)
  getVATSettlement: publicProcedure
    .input(z.object({
      year: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('vat_settlement')
        .select('*')
        .order('year', { ascending: false })
        .order('quarter', { ascending: false });

      if (input?.year) {
        query = query.eq('year', input.year);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row: any) => ({
        year: parseInt(row.year),
        quarter: parseInt(row.quarter),
        period: row.period,
        high_rate_revenue: parseFloat(row.high_rate_revenue) || 0,
        high_rate_vat_collected: parseFloat(row.high_rate_vat_collected) || 0,
        low_rate_revenue: parseFloat(row.low_rate_revenue) || 0,
        low_rate_vat_collected: parseFloat(row.low_rate_vat_collected) || 0,
        zero_rate_revenue: parseFloat(row.zero_rate_revenue) || 0,
        input_vat: parseFloat(row.input_vat) || 0,
        net_vat_to_pay: parseFloat(row.net_vat_to_pay) || 0,
        amount_paid: parseFloat(row.amount_paid) || 0,
        payment_date: row.payment_date,
        balance: parseFloat(row.balance) || 0,
        status: row.status,
        expected_refund: parseFloat(row.expected_refund) || 0,
        exports_non_eu: parseFloat(row.exports_non_eu) || 0,
        exports_eu: parseFloat(row.exports_eu) || 0,
        imports_non_eu_revenue: parseFloat(row.imports_non_eu_revenue) || 0,
        imports_non_eu_vat: parseFloat(row.imports_non_eu_vat) || 0,
        imports_eu_revenue: parseFloat(row.imports_eu_revenue) || 0,
        imports_eu_vat: parseFloat(row.imports_eu_vat) || 0,
      }));
    }),

  // Get all tax configurations (stub for now)
  getAllTaxConfigurations: publicProcedure
    .query(async () => {
      return [
        {
          id: 1,
          year: new Date().getFullYear(),
          vat_rate_high: 21,
          vat_rate_low: 9,
          income_tax_rate: 37.35,
          tax_free_allowance: 50000,
        },
      ];
    }),

  // Get tax credits (stub for now)
  getTaxCredits: publicProcedure
    .input(z.object({
      year: z.number(),
    }))
    .query(async () => {
      return [];
    }),

  // Update user tax settings (stub for now)
  updateUserTaxSettings: publicProcedure
    .input(z.object({
      settings: z.any(),
    }))
    .mutation(async () => {
      return { success: true };
    }),

  // Toggle benefit (stub for now)
  toggleBenefit: publicProcedure
    .input(z.object({
      benefit: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async () => {
      return { success: true };
    }),

  // Get income tax calculation (stub for now)
  getIncomeTaxCalculation: publicProcedure
    .input(z.object({
      year: z.number(),
    }))
    .query(async () => {
      return {
        gross_income: 0,
        deductions: 0,
        taxable_income: 0,
        tax_owed: 0,
      };
    }),

  // Create custom benefit (stub for now)
  createCustomBenefit: publicProcedure
    .input(z.object({
      name: z.string(),
      amount: z.number(),
    }))
    .mutation(async () => {
      return { success: true };
    }),

  // Update benefit (stub for now)
  updateBenefit: publicProcedure
    .input(z.object({
      id: z.string(),
      amount: z.number(),
    }))
    .mutation(async () => {
      return { success: true };
    }),

  // Delete benefit (stub for now)
  deleteBenefit: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async () => {
      return { success: true };
    }),

  // Get monthly tax insights with projections
  getMonthlyTaxInsights: publicProcedure
    .input(z.object({
      year: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { year } = input;
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // 1-12

      // Get tax year configuration
      const { data: taxYear } = await ctx.supabase
        .from('backoffice_tax_years')
        .select('id')
        .eq('year', year)
        .single();

      if (!taxYear) {
        return { months: [], summary: null };
      }

      // Get tax benefits for the year
      const { data: benefits } = await ctx.supabase
        .from('backoffice_tax_benefits')
        .select('*')
        .eq('tax_year_id', taxYear.id)
        .eq('is_active', true);

      // Calculate annual deductions
      const selfEmployedDeduction = benefits?.find(b => b.benefit_type === 'zelfstandigenaftrek')?.amount || 0;
      const startupDeduction = benefits?.find(b => b.benefit_type === 'startersaftrek')?.amount || 0;
      const mkbPercentage = benefits?.find(b => b.benefit_type === 'mkb_winstvrijstelling')?.percentage || 0;

      // Monthly breakdown
      const months = [];
      let cumulativeRevenue = 0;
      let cumulativeExpenses = 0;

      for (let month = 1; month <= 12; month++) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

        // Check if this is a historical month or projection
        const isHistorical = year < currentYear || (year === currentYear && month <= currentMonth);

        let revenue = 0;
        let expenses = 0;

        if (isHistorical) {
          // Get actual data for historical months
          const { data: invoices } = await ctx.supabase
            .from('backoffice_invoices')
            .select('total_amount')
            .gte('invoice_date', startDate)
            .lte('invoice_date', endDate);

          const { data: incomingInvoices } = await ctx.supabase
            .from('backoffice_incoming_invoices')
            .select('total_amount')
            .gte('invoice_date', startDate)
            .lte('invoice_date', endDate);

          revenue = (invoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
          expenses = (incomingInvoices || []).reduce((sum, exp) => sum + (exp.total_amount || 0), 0);
        } else {
          // Project future months based on average
          const monthsCompleted = currentMonth;
          if (monthsCompleted > 0) {
            revenue = cumulativeRevenue / monthsCompleted;
            expenses = cumulativeExpenses / monthsCompleted;
          }
        }

        cumulativeRevenue += revenue;
        cumulativeExpenses += expenses;

        const profit = revenue - expenses;

        // Monthly deductions (annual deductions / 12)
        const monthlyDeductions = (selfEmployedDeduction + startupDeduction) / 12;
        const profitAfterDeductions = Math.max(0, profit - monthlyDeductions);
        const mkbExemption = profitAfterDeductions * (mkbPercentage / 100);
        const taxableIncome = Math.max(0, profitAfterDeductions - mkbExemption);

        months.push({
          month,
          month_name: new Date(year, month - 1).toLocaleString('nl-NL', { month: 'long' }),
          is_historical: isHistorical,
          revenue,
          expenses,
          profit,
          deductions: monthlyDeductions,
          profit_after_deductions: profitAfterDeductions,
          mkb_exemption: mkbExemption,
          taxable_income: taxableIncome,
          cumulative_revenue: cumulativeRevenue,
          cumulative_expenses: cumulativeExpenses,
          cumulative_profit: cumulativeRevenue - cumulativeExpenses,
        });
      }

      // Calculate summary
      const totalRevenue = cumulativeRevenue;
      const totalExpenses = cumulativeExpenses;
      const totalProfit = totalRevenue - totalExpenses;
      const avgMonthlyRevenue = totalRevenue / 12;
      const avgMonthlyExpenses = totalExpenses / 12;
      const avgMonthlyProfit = totalProfit / 12;

      // YTD actuals
      const ytdMonths = months.filter(m => m.is_historical);
      const ytdRevenue = ytdMonths.reduce((sum, m) => sum + m.revenue, 0);
      const ytdExpenses = ytdMonths.reduce((sum, m) => sum + m.expenses, 0);
      const ytdProfit = ytdRevenue - ytdExpenses;

      return {
        months,
        summary: {
          year,
          current_month: currentMonth,
          months_completed: currentMonth,
          months_remaining: 12 - currentMonth,
          // YTD Actuals
          ytd_revenue: ytdRevenue,
          ytd_expenses: ytdExpenses,
          ytd_profit: ytdProfit,
          // Averages
          avg_monthly_revenue: ytdRevenue / currentMonth,
          avg_monthly_expenses: ytdExpenses / currentMonth,
          avg_monthly_profit: ytdProfit / currentMonth,
          // Annual projections
          projected_annual_revenue: totalRevenue,
          projected_annual_expenses: totalExpenses,
          projected_annual_profit: totalProfit,
          // Deductions
          annual_self_employed_deduction: selfEmployedDeduction,
          annual_startup_deduction: startupDeduction,
          monthly_deductions: (selfEmployedDeduction + startupDeduction) / 12,
          mkb_percentage: mkbPercentage,
        },
      };
    }),
});

export { taxRouter };
