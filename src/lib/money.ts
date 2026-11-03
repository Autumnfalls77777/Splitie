import type { CurrencyCode } from '@/features/settings/settings.store';
import { getDisplayCurrency } from '@/lib/currency';

const SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
};

const LOCALES: Record<CurrencyCode, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AED: 'en-AE',
};

/** Convert a rupee-style amount into integer paise. */
export function toPaise(value: number | string): number {
  const n = typeof value === 'string' ? Number.parseFloat(value.replace(/[^\d.-]/g, '')) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Convert integer paise back into a major-unit number. */
export function fromPaise(paise: number): number {
  return paise / 100;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

type FormatOptions = {
  currency?: CurrencyCode;
  decimals?: 'auto' | 'always' | 'never';
  signed?: boolean;
  compact?: boolean;
};

export function formatMoney(paise: number, options: FormatOptions = {}): string {
  const {
    currency = getDisplayCurrency(),
    decimals = 'auto',
    signed = false,
    compact = false,
  } = options;
  const amount = Math.abs(paise) / 100;
  const symbol = SYMBOLS[currency];
  const locale = LOCALES[currency];

  if (compact && amount >= 1000) {
    const compactValue = formatCompactNumber(amount, currency);
    return `${signed ? (paise < 0 ? '−' : '+') : paise < 0 ? '−' : ''}${symbol}${compactValue}`;
  }

  const fractionDigits =
    decimals === 'always' ? 2 : decimals === 'never' ? 0 : Number.isInteger(amount) ? 0 : 2;

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);

  const prefix = paise < 0 ? '−' : signed ? '+' : '';
  return `${prefix}${symbol}${formatted}`;
}

export function formatCompactNumber(amount: number, currency: CurrencyCode = 'INR'): string {
  if (currency === 'INR') {
    if (amount >= 10_000_000) return `${trimZero(amount / 10_000_000)}Cr`;
    if (amount >= 100_000) return `${trimZero(amount / 100_000)}L`;
    if (amount >= 1_000) return `${trimZero(amount / 1_000)}k`;
    return `${Math.round(amount)}`;
  }
  if (amount >= 1_000_000) return `${trimZero(amount / 1_000_000)}M`;
  if (amount >= 1_000) return `${trimZero(amount / 1_000)}k`;
  return `${Math.round(amount)}`;
}

function trimZero(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

export function formatMoneyShort(paise: number, currency: CurrencyCode = 'INR'): string {
  return formatMoney(paise, { currency, compact: true });
}

export function formatSignedMoney(paise: number, currency: CurrencyCode = 'INR'): string {
  return formatMoney(paise, { currency, signed: true });
}

/** Split an integer amount evenly, distributing the remainder one paise at a time. */
export function allocateEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

/** Allocate an amount by weights using the largest-remainder method. */
export function allocateByWeights(total: number, weights: number[]): number[] {
  const safeWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const weightTotal = sum(safeWeights);
  if (weightTotal <= 0) return allocateEvenly(total, weights.length);

  const raw = safeWeights.map((weight) => (total * weight) / weightTotal);
  const floored = raw.map(Math.floor);
  let remainder = total - sum(floored);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    floored[order[cursor % order.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }
  return floored;
}

export function percentOf(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

/** Parse user input like "1,250.50" or "₹ 900" into paise. */
export function parseAmount(input: string): number {
  return toPaise(input);
}
