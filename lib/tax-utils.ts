/**
 * Tax Configuration Utilities
 * Helper functions for tax calculations and benefit management
 */

export interface TaxBracket {
  bracket_order: number;
  income_from: number;
  income_to: number | null;
  rate: number;
}

export interface TaxBenefit {
  benefit_type: 'zelfstandigenaftrek' | 'startersaftrek' | 'mkb_winstvrijstelling';
  name: string;
  amount?: number | null;
  percentage?: number | null;
  description: string;
  requires_hours_criterion: boolean;
  max_usage_count?: number | null;
}

export interface TaxProfile {
  year: number;
  brackets: TaxBracket[];
  benefits: TaxBenefit[];
  userSettings?: {
    applies_zelfstandigenaftrek: boolean;
    applies_startersaftrek: boolean;
    applies_mkb_winstvrijstelling: boolean;
    meets_hours_criterion: boolean;
    starter_years_used: number;
  };
}

export interface TaxCalculationResult {
  profit: number;
  deductions: {
    zelfstandigenaftrek: number;
    startersaftrek: number;
    total: number;
  };
  taxableProfit: number;
  mkbWinstvrijstelling: number;
  finalTaxableIncome: number;
  taxByBracket: {
    bracket_order: number;
    income_range: string;
    rate: number;
    taxable_amount: number;
    tax_amount: number;
  }[];
  totalTax: number;
  effectiveRate: number;
  netProfit: number;
}

/**
 * Calculate total tax based on profile and profit
 */
export function calculateTax(
  profile: TaxProfile,
  profit: number
): TaxCalculationResult {
  const deductions = {
    zelfstandigenaftrek: 0,
    startersaftrek: 0,
    total: 0,
  };

  // Apply zelfstandigenaftrek if applicable
  if (profile.userSettings?.applies_zelfstandigenaftrek) {
    const benefit = profile.benefits.find(b => b.benefit_type === 'zelfstandigenaftrek');
    if (benefit?.amount) {
      deductions.zelfstandigenaftrek = benefit.amount;
    }
  }

  // Apply startersaftrek if applicable
  if (profile.userSettings?.applies_startersaftrek) {
    const benefit = profile.benefits.find(b => b.benefit_type === 'startersaftrek');
    if (benefit?.amount) {
      deductions.startersaftrek = benefit.amount;
    }
  }

  deductions.total = deductions.zelfstandigenaftrek + deductions.startersaftrek;

  // Calculate taxable profit after deductions
  const taxableProfit = Math.max(0, profit - deductions.total);

  // Apply MKB-winstvrijstelling
  let mkbWinstvrijstelling = 0;
  if (profile.userSettings?.applies_mkb_winstvrijstelling && taxableProfit > 0) {
    const benefit = profile.benefits.find(b => b.benefit_type === 'mkb_winstvrijstelling');
    if (benefit?.percentage) {
      mkbWinstvrijstelling = (taxableProfit * benefit.percentage) / 100;
    }
  }

  // Final taxable income
  const finalTaxableIncome = Math.max(0, taxableProfit - mkbWinstvrijstelling);

  // Calculate tax per bracket
  const taxByBracket: TaxCalculationResult['taxByBracket'] = [];
  let totalTax = 0;

  for (const bracket of profile.brackets) {
    const from = bracket.income_from;
    const to = bracket.income_to ?? Infinity;

    if (finalTaxableIncome <= from) {
      break;
    }

    const taxableInBracket = Math.min(finalTaxableIncome, to) - from;
    if (taxableInBracket > 0) {
      const taxAmount = (taxableInBracket * bracket.rate) / 100;
      totalTax += taxAmount;

      taxByBracket.push({
        bracket_order: bracket.bracket_order,
        income_range: `€${from.toLocaleString()} - ${to === Infinity ? '∞' : `€${to.toLocaleString()}`}`,
        rate: bracket.rate,
        taxable_amount: taxableInBracket,
        tax_amount: taxAmount,
      });
    }
  }

  const effectiveRate = profit > 0 ? (totalTax / profit) * 100 : 0;
  const netProfit = profit - totalTax;

  return {
    profit,
    deductions,
    taxableProfit,
    mkbWinstvrijstelling,
    finalTaxableIncome,
    taxByBracket,
    totalTax,
    effectiveRate,
    netProfit,
  };
}

/**
 * Get benefit summary for display
 */
export function getBenefitSummary(profile: TaxProfile): {
  name: string;
  value: string;
  applies: boolean;
  requires_hours?: boolean;
}[] {
  const summary: ReturnType<typeof getBenefitSummary> = [];

  for (const benefit of profile.benefits) {
    const applies = profile.userSettings?.[`applies_${benefit.benefit_type}` as keyof typeof profile.userSettings] ?? false;

    let value = '—';
    if (benefit.amount) {
      value = `€${benefit.amount.toLocaleString()}`;
    } else if (benefit.percentage) {
      value = `${benefit.percentage}%`;
    }

    summary.push({
      name: benefit.name,
      value,
      applies: applies as boolean,
      requires_hours: benefit.requires_hours_criterion,
    });
  }

  return summary;
}

/**
 * Calculate total tax savings from benefits
 */
export function calculateTaxSavings(
  profile: TaxProfile,
  profit: number
): {
  withBenefits: TaxCalculationResult;
  withoutBenefits: TaxCalculationResult;
  savings: number;
  savingsPercentage: number;
} {
  // Calculate with benefits
  const withBenefits = calculateTax(profile, profit);

  // Calculate without benefits (temporarily disable all)
  const profileWithoutBenefits: TaxProfile = {
    ...profile,
    userSettings: {
      ...profile.userSettings!,
      applies_zelfstandigenaftrek: false,
      applies_startersaftrek: false,
      applies_mkb_winstvrijstelling: false,
    },
  };

  const withoutBenefits = calculateTax(profileWithoutBenefits, profit);

  const savings = withoutBenefits.totalTax - withBenefits.totalTax;
  const savingsPercentage = withoutBenefits.totalTax > 0
    ? (savings / withoutBenefits.totalTax) * 100
    : 0;

  return {
    withBenefits,
    withoutBenefits,
    savings,
    savingsPercentage,
  };
}

/**
 * Validate if user meets requirements for a benefit
 */
export function validateBenefitEligibility(
  benefit: TaxBenefit,
  hoursWorked?: number,
  yearsAsEntrepreneur?: number
): {
  eligible: boolean;
  reason?: string;
} {
  // Check hours criterion
  if (benefit.requires_hours_criterion) {
    if (!hoursWorked || hoursWorked < 1225) {
      return {
        eligible: false,
        reason: 'You must work at least 1,225 hours per year',
      };
    }
  }

  // Check starter eligibility
  if (benefit.benefit_type === 'startersaftrek') {
    if (yearsAsEntrepreneur && yearsAsEntrepreneur > 5) {
      return {
        eligible: false,
        reason: 'Only available in the first 5 years as an entrepreneur',
      };
    }
  }

  return { eligible: true };
}
