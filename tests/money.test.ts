import { describe, expect, it } from 'vitest';

import {
  allocateByWeights,
  allocateEvenly,
  formatMoney,
  formatSignedMoney,
  fromPaise,
  parseAmount,
  percentOf,
  sum,
  toPaise,
} from '@/lib/money';

describe('toPaise', () => {
  it('converts major units to integer paise', () => {
    expect(toPaise(0)).toBe(0);
    expect(toPaise(1)).toBe(100);
    expect(toPaise(12.34)).toBe(1234);
    expect(toPaise(19.99)).toBe(1999);
    expect(toPaise(-12.34)).toBe(-1234);
  });

  it('parses formatted strings and currency symbols', () => {
    expect(toPaise('₹ 1,250.50')).toBe(125050);
    expect(toPaise('$12.99')).toBe(1299);
    expect(toPaise('1,25,000.75')).toBe(12500075);
    expect(toPaise('-₹1,234.50')).toBe(-123450);
  });

  it('returns 0 for empty or non-numeric input', () => {
    expect(toPaise('')).toBe(0);
    expect(toPaise('abc')).toBe(0);
    expect(toPaise(Number.NaN)).toBe(0);
    expect(toPaise(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('rounds to the nearest paise', () => {
    expect(toPaise('12.345')).toBe(1235);
    expect(toPaise('12.344')).toBe(1234);
  });
});

describe('fromPaise', () => {
  it('converts integer paise back to major units', () => {
    expect(fromPaise(12345)).toBe(123.45);
    expect(fromPaise(0)).toBe(0);
    expect(fromPaise(-500)).toBe(-5);
  });
});

describe('sum', () => {
  it('adds values and treats an empty list as zero', () => {
    expect(sum([])).toBe(0);
    expect(sum([1, 2, 3])).toBe(6);
    expect(sum([100, -250, 50])).toBe(-100);
  });
});

describe('formatMoney', () => {
  it('formats whole and fractional amounts with the right currency symbol', () => {
    expect(formatMoney(123400, { currency: 'INR' })).toBe('₹1,234');
    expect(formatMoney(123450, { currency: 'INR' })).toBe('₹1,234.50');
    expect(formatMoney(123450, { currency: 'USD' })).toBe('$1,234.50');
    expect(formatMoney(123450, { currency: 'EUR' })).toBe('€1.234,50');
    expect(formatMoney(123450, { currency: 'GBP' })).toBe('£1,234.50');
    expect(formatMoney(123450, { currency: 'AED' })).toBe('AED 1,234.50');
  });

  it('respects the decimals option', () => {
    expect(formatMoney(123450, { currency: 'INR', decimals: 'always' })).toBe('₹1,234.50');
    expect(formatMoney(123400, { currency: 'INR', decimals: 'always' })).toBe('₹1,234.00');
    expect(formatMoney(123456, { currency: 'INR', decimals: 'never' })).toBe('₹1,235');
  });

  it('formats negative and signed values', () => {
    expect(formatMoney(-123450, { currency: 'INR' })).toBe('−₹1,234.50');
    expect(formatMoney(123450, { currency: 'INR', signed: true })).toBe('+₹1,234.50');
    expect(formatMoney(-123450, { currency: 'INR', signed: true })).toBe('−₹1,234.50');
  });

  it('uses Indian compact units', () => {
    expect(formatMoney(1234500, { currency: 'INR', compact: true })).toBe('₹12.3k');
    expect(formatMoney(12345600, { currency: 'INR', compact: true })).toBe('₹1.2L');
    expect(formatMoney(1000000000, { currency: 'INR', compact: true })).toBe('₹1Cr');
  });

  it('uses western compact units for non-INR currencies', () => {
    expect(formatMoney(1500000, { currency: 'USD', compact: true })).toBe('$15k');
    expect(formatMoney(150000000, { currency: 'USD', compact: true })).toBe('$1.5M');
  });

  it('falls back to standard formatting below 1000 major units', () => {
    expect(formatMoney(99999, { currency: 'INR', compact: true })).toBe('₹999.99');
  });
});

describe('formatSignedMoney', () => {
  it('adds an explicit sign', () => {
    expect(formatSignedMoney(123450, 'INR')).toBe('+₹1,234.50');
    expect(formatSignedMoney(-123450, 'INR')).toBe('−₹1,234.50');
    expect(formatSignedMoney(0, 'INR')).toBe('+₹0');
  });
});

describe('allocateEvenly', () => {
  it('distributes leftover paise to the first members', () => {
    expect(allocateEvenly(100, 3)).toEqual([34, 33, 33]);
    expect(allocateEvenly(101, 3)).toEqual([34, 34, 33]);
    expect(allocateEvenly(2, 3)).toEqual([1, 1, 0]);
  });

  it('handles zero, single, and empty allocations', () => {
    expect(allocateEvenly(0, 3)).toEqual([0, 0, 0]);
    expect(allocateEvenly(500, 1)).toEqual([500]);
    expect(allocateEvenly(500, 0)).toEqual([]);
    expect(allocateEvenly(500, -2)).toEqual([]);
  });

  it('always sums exactly to the total', () => {
    for (const total of [0, 1, 7, 100, 999, 12345]) {
      for (const count of [1, 2, 3, 4, 7]) {
        expect(sum(allocateEvenly(total, count))).toBe(total);
      }
    }
  });
});

describe('allocateByWeights', () => {
  it('allocates by weights exactly when they divide cleanly', () => {
    expect(allocateByWeights(1000, [2, 1, 1])).toEqual([500, 250, 250]);
    expect(allocateByWeights(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocateByWeights(101, [2, 1, 1])).toEqual([51, 25, 25]);
  });

  it('falls back to equal allocation when all weights are zero or invalid', () => {
    expect(allocateByWeights(100, [0, 0, 0])).toEqual([34, 33, 33]);
    expect(allocateByWeights(100, [-1, Number.NaN, Number.POSITIVE_INFINITY])).toEqual([
      34, 33, 33,
    ]);
    expect(allocateByWeights(100, [])).toEqual([]);
  });

  it('keeps zero-weight members at zero', () => {
    expect(allocateByWeights(100, [1, 0, 0])).toEqual([100, 0, 0]);
  });

  it('always sums exactly to the total', () => {
    const weightSets = [
      [1],
      [1, 1],
      [1, 2, 3],
      [2, 1, 1],
      [5, 0, 2],
      [0.5, 0.25, 0.25],
    ];

    for (const total of [0, 1, 7, 100, 999, 12345]) {
      for (const weights of weightSets) {
        expect(sum(allocateByWeights(total, weights))).toBe(total);
      }
    }
  });
});

describe('percentOf', () => {
  it('rounds a part-to-whole percentage', () => {
    expect(percentOf(0, 100)).toBe(0);
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(100, 100)).toBe(100);
  });

  it('returns 0 when the whole is not positive', () => {
    expect(percentOf(50, 0)).toBe(0);
    expect(percentOf(50, -10)).toBe(0);
  });
});

describe('parseAmount', () => {
  it('parses common user input formats', () => {
    expect(parseAmount('1,250.50')).toBe(125050);
    expect(parseAmount('₹ 900')).toBe(90000);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('not a number')).toBe(0);
  });
});
