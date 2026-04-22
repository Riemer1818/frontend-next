import { supabase } from './client';
import { useSupabaseQuery, useSupabaseMutation, useInvalidateQuery } from './hooks';

// Types
export interface TaxYear {
  id: number;
  year: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IncomeTaxBracket {
  id: number;
  tax_year_id: number;
  bracket_order: number;
  income_from: number;
  income_to: number | null;
  rate: number;
  created_at?: string;
  updated_at?: string;
}

export interface TaxBenefit {
  id: number;
  tax_year_id: number;
  benefit_type: string;
  name: string;
  amount: number | null;
  percentage: number | null;
  description: string | null;
  is_active: boolean;
  requires_hours_criterion: boolean;
  minimum_hours_required: number | null;
  eligibility_criteria: string | null;
  max_usage_count: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface TaxCredit {
  id: number;
  tax_year_id: number;
  credit_type: string;
  name: string;
  max_amount: number | null;
  phaseout_start: number | null;
  phaseout_end: number | null;
  phaseout_rate: number | null;
  description: string | null;
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ArbeidsKortingBracket {
  id: number;
  tax_year_id: number;
  bracket_order: number;
  income_from: number;
  income_to: number | null;
  base_amount: number | null;
  rate: number | null;
  rate_applies_to_excess: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserBenefitSelection {
  id: number;
  user_id: string;
  benefit_id: number;
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

const QUERY_KEY = ['tax'];

// Get all tax years
export function useTaxYears() {
  return useSupabaseQuery<TaxYear[]>(
    [...QUERY_KEY, 'years'],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_tax_years')
        .select('*')
        .order('year', { ascending: true });

      if (error) return { data: null, error };
      return { data: data || [], error: null };
    }
  );
}

// Get income tax brackets for a year
export function useIncomeTaxBrackets(taxYearId?: number) {
  return useSupabaseQuery<IncomeTaxBracket[]>(
    [...QUERY_KEY, 'brackets', String(taxYearId)],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_income_tax_brackets')
        .select('*')
        .eq('tax_year_id', taxYearId!)
        .order('bracket_order', { ascending: true });

      if (error) return { data: null, error };
      return { data: data || [], error: null };
    },
    { enabled: !!taxYearId }
  );
}

// Get tax benefits for a year
export function useTaxBenefits(taxYearId?: number) {
  return useSupabaseQuery<TaxBenefit[]>(
    [...QUERY_KEY, 'benefits', String(taxYearId)],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_tax_benefits')
        .select('*')
        .eq('tax_year_id', taxYearId!)
        .order('benefit_type', { ascending: true });

      if (error) return { data: null, error };
      return { data: data || [], error: null };
    },
    { enabled: !!taxYearId }
  );
}

// Get tax credits for a year
export function useTaxCredits(taxYearId?: number) {
  return useSupabaseQuery<TaxCredit[]>(
    [...QUERY_KEY, 'credits', String(taxYearId)],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_tax_credits')
        .select('*')
        .eq('tax_year_id', taxYearId!)
        .order('credit_type', { ascending: true });

      if (error) return { data: null, error };
      return { data: data || [], error: null };
    },
    { enabled: !!taxYearId }
  );
}

// Get arbeidskorting brackets for a year
export function useArbeidsKortingBrackets(taxYearId?: number) {
  return useSupabaseQuery<ArbeidsKortingBracket[]>(
    [...QUERY_KEY, 'arbeidskorting-brackets', String(taxYearId)],
    async () => {
      const { data, error } = await supabase
        .from('backoffice_arbeidskorting_brackets')
        .select('*')
        .eq('tax_year_id', taxYearId!)
        .order('bracket_order', { ascending: true });

      if (error) return { data: null, error };
      return { data: data || [], error: null };
    },
    { enabled: !!taxYearId }
  );
}

// Get all tax configuration (years with brackets, benefits, and credits)
export function useAllTaxConfigurations() {
  return useSupabaseQuery<any[]>(
    [...QUERY_KEY, 'all-configurations'],
    async () => {
      // Get all tax years
      const { data: years, error: yearsError } = await supabase
        .from('backoffice_tax_years')
        .select('*')
        .order('year', { ascending: true });

      if (yearsError) return { data: null, error: yearsError };

      // For each year, get brackets, benefits, and credits
      const configurations = await Promise.all(
        (years || []).map(async (year) => {
          const [bracketsRes, benefitsRes, creditsRes] = await Promise.all([
            supabase
              .from('backoffice_income_tax_brackets')
              .select('*')
              .eq('tax_year_id', year.id)
              .order('bracket_order', { ascending: true }),
            supabase
              .from('backoffice_tax_benefits')
              .select('*')
              .eq('tax_year_id', year.id)
              .order('benefit_type', { ascending: true }),
            supabase
              .from('backoffice_tax_credits')
              .select('*')
              .eq('tax_year_id', year.id)
              .order('credit_type', { ascending: true }),
          ]);

          return {
            year,
            brackets: bracketsRes.data || [],
            benefits: benefitsRes.data || [],
            credits: creditsRes.data || [],
          };
        })
      );

      return { data: configurations, error: null };
    }
  );
}

// Get tax credits with arbeidskorting brackets
export function useTaxCreditsWithBrackets(year: number) {
  return useSupabaseQuery<any>(
    [...QUERY_KEY, 'credits-with-brackets', String(year)],
    async () => {
      // Get tax year ID
      const { data: taxYear, error: yearError } = await supabase
        .from('backoffice_tax_years')
        .select('id')
        .eq('year', year)
        .single();

      if (yearError || !taxYear) return { data: null, error: yearError };

      // Get credits and arbeidskorting brackets
      const [creditsRes, bracketsRes] = await Promise.all([
        supabase
          .from('backoffice_tax_credits')
          .select('*')
          .eq('tax_year_id', taxYear.id),
        supabase
          .from('backoffice_arbeidskorting_brackets')
          .select('*')
          .eq('tax_year_id', taxYear.id)
          .order('bracket_order', { ascending: true }),
      ]);

      return {
        data: {
          credits: creditsRes.data || [],
          arbeidskorting_brackets: bracketsRes.data || [],
        },
        error: null,
      };
    }
  );
}

// Toggle benefit enabled/disabled
export function useToggleBenefit() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<{ benefitId: number; enabled: boolean }, TaxBenefit>(
    async ({ benefitId, enabled }) => {
      const { data, error } = await supabase
        .from('backoffice_tax_benefits')
        .update({ is_active: enabled })
        .eq('id', benefitId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        invalidate([...QUERY_KEY]);
      },
    }
  );
}

// Create custom benefit
export function useCreateCustomBenefit() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<{
    taxYearId: number;
    name: string;
    benefitType: string;
    amount?: number;
    percentage?: number;
    description?: string;
    minimumHoursRequired?: number;
    eligibilityCriteria?: string;
    maxUsageCount?: number;
  }, TaxBenefit>(
    async (input) => {
      const { data, error } = await supabase
        .from('backoffice_tax_benefits')
        .insert({
          tax_year_id: input.taxYearId,
          benefit_type: input.benefitType,
          name: input.name,
          amount: input.amount || null,
          percentage: input.percentage || null,
          description: input.description || null,
          is_active: true,
          requires_hours_criterion: !!input.minimumHoursRequired,
          minimum_hours_required: input.minimumHoursRequired || null,
          eligibility_criteria: input.eligibilityCriteria || null,
          max_usage_count: input.maxUsageCount || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        invalidate([...QUERY_KEY]);
      },
    }
  );
}

// Update benefit
export function useUpdateBenefit() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<{
    benefitId: number;
    name?: string;
    description?: string;
    amount?: number;
    percentage?: number;
    minimumHoursRequired?: number;
    eligibilityCriteria?: string;
    maxUsageCount?: number;
  }, TaxBenefit>(
    async (input) => {
      const updates: any = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.amount !== undefined) updates.amount = input.amount;
      if (input.percentage !== undefined) updates.percentage = input.percentage;
      if (input.minimumHoursRequired !== undefined) {
        updates.minimum_hours_required = input.minimumHoursRequired;
        updates.requires_hours_criterion = !!input.minimumHoursRequired;
      }
      if (input.eligibilityCriteria !== undefined) updates.eligibility_criteria = input.eligibilityCriteria;
      if (input.maxUsageCount !== undefined) updates.max_usage_count = input.maxUsageCount;

      const { data, error } = await supabase
        .from('backoffice_tax_benefits')
        .update(updates)
        .eq('id', input.benefitId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        invalidate([...QUERY_KEY]);
      },
    }
  );
}

// Delete benefit
export function useDeleteBenefit() {
  const invalidate = useInvalidateQuery();

  return useSupabaseMutation<{ benefitId: number }, void>(
    async ({ benefitId }) => {
      const { error } = await supabase
        .from('backoffice_tax_benefits')
        .delete()
        .eq('id', benefitId);

      if (error) throw error;
    },
    {
      onSuccess: () => {
        invalidate([...QUERY_KEY]);
      },
    }
  );
}

// Calculate income tax for a year
export interface IncomeTaxCalculation {
  gross_profit: number;
  self_employed_deduction: number;
  startup_deduction: number;
  custom_benefits: Array<{ name: string; amount: number }>;
  profit_after_deductions: number;
  mkb_profit_exemption: number;
  mkb_exemption_amount: number;
  taxable_income: number;
  bracket_1_limit: number;
  bracket_1_rate: number;
  bracket_2_rate: number;
  tax_bracket_1: number;
  tax_bracket_2: number;
  total_income_tax_before_credits: number;
  algemene_heffingskorting: number;
  arbeidskorting: number;
  total_income_tax: number;
  effective_tax_rate: number;
  net_profit_after_tax: number;
}

export function useIncomeTaxCalculation(year: number) {
  return useSupabaseQuery<IncomeTaxCalculation>(
    [...QUERY_KEY, 'income-tax-calculation', String(year)],
    async () => {
      // Get tax year
      const { data: taxYear, error: yearError } = await supabase
        .from('backoffice_tax_years')
        .select('id')
        .eq('year', year)
        .single();

      if (yearError || !taxYear) {
        // Return zeros when tax year doesn't exist - this is expected behavior
        return {
          data: {
            gross_profit: 0,
            self_employed_deduction: 0,
            startup_deduction: 0,
            custom_benefits: [],
            profit_after_deductions: 0,
            mkb_profit_exemption: 0,
            mkb_exemption_amount: 0,
            taxable_income: 0,
            bracket_1_limit: 0,
            bracket_1_rate: 0,
            bracket_2_rate: 0,
            tax_bracket_1: 0,
            tax_bracket_2: 0,
            total_income_tax_before_credits: 0,
            algemene_heffingskorting: 0,
            arbeidskorting: 0,
            total_income_tax: 0,
            effective_tax_rate: 0,
            net_profit_after_tax: 0,
          },
          error: null // Don't treat missing year as an error - just show zeros
        };
      }

      // Get invoices for the year
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const { data: invoices, error: invoicesError } = await supabase
        .from('backoffice_invoices')
        .select('total_amount')
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate);

      if (invoicesError) return { data: null, error: invoicesError };

      // Get expenses for the year
      const { data: expenses, error: expensesError } = await supabase
        .from('backoffice_incoming_invoices')
        .select('total_amount')
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate);

      if (expensesError) return { data: null, error: expensesError };

      // Calculate gross profit
      const totalRevenue = (invoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const totalExpenses = (expenses || []).reduce((sum, exp) => sum + (exp.total_amount || 0), 0);
      const grossProfit = totalRevenue - totalExpenses;

      // Get tax benefits
      const { data: benefits, error: benefitsError } = await supabase
        .from('backoffice_tax_benefits')
        .select('*')
        .eq('tax_year_id', taxYear.id)
        .eq('is_active', true);

      if (benefitsError) return { data: null, error: benefitsError };

      // Calculate deductions
      let selfEmployedDeduction = 0;
      let startupDeduction = 0;
      const customBenefits: Array<{ name: string; amount: number }> = [];

      (benefits || []).forEach((benefit) => {
        if (benefit.benefit_type === 'zelfstandigenaftrek') {
          selfEmployedDeduction = benefit.amount || 0;
        } else if (benefit.benefit_type === 'startersaftrek') {
          startupDeduction = benefit.amount || 0;
        } else if (benefit.benefit_type !== 'mkb_winstvrijstelling') {
          customBenefits.push({
            name: benefit.name,
            amount: benefit.amount || 0,
          });
        }
      });

      const totalCustomBenefits = customBenefits.reduce((sum, b) => sum + b.amount, 0);
      const profitAfterDeductions = Math.max(0, grossProfit - selfEmployedDeduction - startupDeduction - totalCustomBenefits);

      // Get MKB exemption
      const mkbBenefit = (benefits || []).find((b) => b.benefit_type === 'mkb_winstvrijstelling');
      const mkbPercentage = mkbBenefit?.percentage || 0;
      const mkbExemptionAmount = profitAfterDeductions * (mkbPercentage / 100);
      const taxableIncome = Math.max(0, profitAfterDeductions - mkbExemptionAmount);

      // Get tax brackets
      const { data: brackets, error: bracketsError } = await supabase
        .from('backoffice_income_tax_brackets')
        .select('*')
        .eq('tax_year_id', taxYear.id)
        .order('bracket_order', { ascending: true });

      if (bracketsError) return { data: null, error: bracketsError };

      // Calculate tax by bracket
      let taxBracket1 = 0;
      let taxBracket2 = 0;
      let bracket1Limit = 0;
      let bracket1Rate = 0;
      let bracket2Rate = 0;

      if (brackets && brackets.length >= 1) {
        const bracket1 = brackets[0];
        bracket1Limit = bracket1.income_to || 0;
        bracket1Rate = bracket1.rate || 0;

        const incomeInBracket1 = Math.min(taxableIncome, bracket1Limit);
        taxBracket1 = incomeInBracket1 * (bracket1Rate / 100);

        if (brackets.length >= 2 && taxableIncome > bracket1Limit) {
          const bracket2 = brackets[1];
          bracket2Rate = bracket2.rate || 0;
          const incomeInBracket2 = taxableIncome - bracket1Limit;
          taxBracket2 = incomeInBracket2 * (bracket2Rate / 100);
        }
      }

      const totalIncomeTaxBeforeCredits = taxBracket1 + taxBracket2;

      // Get tax credits
      const { data: credits, error: creditsError } = await supabase
        .from('backoffice_tax_credits')
        .select('*')
        .eq('tax_year_id', taxYear.id)
        .eq('is_enabled', true);

      if (creditsError) return { data: null, error: creditsError };

      let algemeneHeffingskorting = 0;
      let arbeidskorting = 0;

      (credits || []).forEach((credit) => {
        if (credit.credit_type === 'algemene_heffingskorting') {
          algemeneHeffingskorting = credit.max_amount || 0;
        }
      });

      // Calculate arbeidskorting from brackets
      const { data: arbeidskortingBrackets, error: arbeidskortingError } = await supabase
        .from('backoffice_arbeidskorting_brackets')
        .select('*')
        .eq('tax_year_id', taxYear.id)
        .order('bracket_order', { ascending: true });

      if (!arbeidskortingError && arbeidskortingBrackets) {
        for (const bracket of arbeidskortingBrackets) {
          if (taxableIncome >= bracket.income_from && (!bracket.income_to || taxableIncome <= bracket.income_to)) {
            if (bracket.rate_applies_to_excess && bracket.rate) {
              const excess = taxableIncome - bracket.income_from;
              arbeidskorting = (bracket.base_amount || 0) + (excess * bracket.rate / 100);
            } else {
              arbeidskorting = bracket.base_amount || 0;
            }
            break;
          }
        }
      }

      const totalIncomeTax = Math.max(0, totalIncomeTaxBeforeCredits - algemeneHeffingskorting - arbeidskorting);
      const effectiveTaxRate = grossProfit > 0 ? (totalIncomeTax / grossProfit) * 100 : 0;
      const netProfitAfterTax = grossProfit - totalIncomeTax;

      return {
        data: {
          gross_profit: grossProfit,
          self_employed_deduction: selfEmployedDeduction,
          startup_deduction: startupDeduction,
          custom_benefits: customBenefits,
          profit_after_deductions: profitAfterDeductions,
          mkb_profit_exemption: mkbPercentage,
          mkb_exemption_amount: mkbExemptionAmount,
          taxable_income: taxableIncome,
          bracket_1_limit: bracket1Limit,
          bracket_1_rate: bracket1Rate,
          bracket_2_rate: bracket2Rate,
          tax_bracket_1: taxBracket1,
          tax_bracket_2: taxBracket2,
          total_income_tax_before_credits: totalIncomeTaxBeforeCredits,
          algemene_heffingskorting: algemeneHeffingskorting,
          arbeidskorting: arbeidskorting,
          total_income_tax: totalIncomeTax,
          effective_tax_rate: effectiveTaxRate,
          net_profit_after_tax: netProfitAfterTax,
        },
        error: null,
      };
    }
  );
}
