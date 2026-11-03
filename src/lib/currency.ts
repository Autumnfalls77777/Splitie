import type { CurrencyCode } from '@/features/settings/settings.store';

let displayCurrency: CurrencyCode = 'INR';

export const CURRENCY_CODES: CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

/** Keeps money formatting in sync with the persisted display preference. */
export function setDisplayCurrency(currency: CurrencyCode) {
  displayCurrency = currency;
}

export function getDisplayCurrency(): CurrencyCode {
  return displayCurrency;
}

/** Trip currency is stored as text, so normalise unknown values to INR. */
export function asCurrencyCode(value?: string | null): CurrencyCode {
  return CURRENCY_CODES.includes(value as CurrencyCode) ? (value as CurrencyCode) : 'INR';
}
