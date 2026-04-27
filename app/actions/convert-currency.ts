'use server';

import { CurrencyConverter } from '@/server/core/currency/CurrencyConverter';

export async function convertCurrency(
  amount: number,
  from: string,
  to: string = 'EUR',
  date?: string
) {
  const converter = new CurrencyConverter();
  return await converter.convert(amount, from, to, date);
}
