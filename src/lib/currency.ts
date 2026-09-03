import { CurrencyCode } from '../types';

export const DEFAULT_CURRENCY: CurrencyCode = 'INR';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

// Default exchange rates relative to 1 INR (Base currency is INR)
export const DEFAULT_EXCHANGE_RATES: Record<CurrencyCode, number> = {
  INR: 1,
  USD: 0.0118, // 1 INR ~ 0.0118 USD
  EUR: 0.011,  // 1 INR ~ 0.011 EUR
  GBP: 0.0094, // 1 INR ~ 0.0094 GBP
};

/**
 * Calculates total order amount in INR safely.
 * formula: (quantity / 1000) * pricePer1000
 */
export function calculateOrderAmount(quantity: number, pricePer1000: number): number {
  if (quantity <= 0 || pricePer1000 <= 0) return 0;
  const raw = (quantity / 1000) * pricePer1000;
  // Round to 4 decimal places internally to avoid JS floating point errors, then standard 2 decimals
  return Math.round((raw + Number.EPSILON) * 100) / 100;
}

/**
 * Formats an amount with the currency symbol and 2 decimal places.
 */
export function formatCurrency(
  amountInINR: number,
  targetCurrency: CurrencyCode = 'INR',
  rates: Record<CurrencyCode, number> = DEFAULT_EXCHANGE_RATES
): string {
  const symbol = CURRENCY_SYMBOLS[targetCurrency] || '₹';
  const rate = rates[targetCurrency] || 1;
  const converted = amountInINR * rate;
  
  // Format with thousands separator and 2 decimal places
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);

  return `${symbol}${formattedNumber}`;
}
