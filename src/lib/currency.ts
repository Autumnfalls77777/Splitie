import type { CurrencyCode } from '@/features/settings/settings.store';

let displayCurrency: CurrencyCode = 'INR';

/** Keeps money formatting in sync with the persisted display preference. */
export function setDisplayCurrency(currency: CurrencyCode) {
  displayCurrency = currency;
}

export function getDisplayCurrency(): CurrencyCode {
  return displayCurrency;
}
