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
});

export { taxRouter };
