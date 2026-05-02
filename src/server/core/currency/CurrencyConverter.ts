import fetch from 'node-fetch';

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  rate: number;
  date: string;
}

/**
 * Currency conversion service using Frankfurter API
 */
export class CurrencyConverter {
  private baseUrl = 'https://api.frankfurter.app';

  /**
   * Convert amount from one currency to another using historical rate for given date
   * Falls back to most recent available rate if date is unavailable
   */
  async convert(
    amount: number,
    from: string,
    to: string = 'EUR',
    date?: string // YYYY-MM-DD format
  ): Promise<ConversionResult> {
    // If already in target currency, no conversion needed
    if (from.toUpperCase() === to.toUpperCase()) {
      return {
        originalAmount: amount,
        originalCurrency: from,
        convertedAmount: amount,
        targetCurrency: to,
        rate: 1,
        date: date || new Date().toISOString().split('T')[0],
      };
    }

    // Try historical rate first, then fallback to progressively earlier dates
    const attemptDates = this.generateFallbackDates(date);

    for (const attemptDate of attemptDates) {
      try {
        const endpoint = attemptDate
          ? `${this.baseUrl}/${attemptDate}?amount=${amount}&from=${from.toUpperCase()}&to=${to.toUpperCase()}`
          : `${this.baseUrl}/latest?amount=${amount}&from=${from.toUpperCase()}&to=${to.toUpperCase()}`;

        const response = await fetch(endpoint);

        if (!response.ok) {
          console.warn(`⚠️ Rate not found for ${attemptDate}, trying fallback...`);
          continue; // Try next date
        }

        const data: any = await response.json();
        const convertedAmount = data.rates[to.toUpperCase()];

        if (attemptDate !== date) {
          console.warn(`⚠️ Using fallback rate from ${data.date} (requested: ${date})`);
        }

        return {
          originalAmount: amount,
          originalCurrency: from.toUpperCase(),
          convertedAmount: convertedAmount,
          targetCurrency: to.toUpperCase(),
          rate: convertedAmount / amount,
          date: data.date,
        };
      } catch (error) {
        console.warn(`Failed to fetch rate for ${attemptDate}:`, error);
        continue;
      }
    }

    // All attempts failed - this is a critical error
    const errorMsg = `❌ CRITICAL: Failed to get exchange rate ${from} → ${to} for ${date} (tried ${attemptDates.length} dates)`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  /**
   * Generate fallback dates: go back 1 day at a time for up to 7 days, then try latest
   */
  private generateFallbackDates(date?: string): (string | undefined)[] {
    if (!date) {
      return [undefined]; // Just use latest
    }

    const dates: string[] = [date];
    const targetDate = new Date(date);

    // Try up to 7 days back
    for (let i = 1; i <= 7; i++) {
      const fallbackDate = new Date(targetDate);
      fallbackDate.setDate(targetDate.getDate() - i);
      dates.push(fallbackDate.toISOString().split('T')[0]);
    }

    // Finally try latest as last resort
    dates.push(undefined as any);
    return dates;
  }

  /**
   * Get current exchange rate
   */
  async getRate(from: string, to: string = 'EUR'): Promise<number> {
    if (from.toUpperCase() === to.toUpperCase()) {
      return 1;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/latest?from=${from.toUpperCase()}&to=${to.toUpperCase()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get exchange rate: ${response.statusText}`);
      }

      const data: any = await response.json();
      return data.rates[to.toUpperCase()];
    } catch (error) {
      console.error('Failed to get exchange rate:', error);
      return 1; // Fallback
    }
  }
}
