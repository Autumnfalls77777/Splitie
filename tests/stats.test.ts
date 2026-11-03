import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The stats module only needs the category metadata; the icons are React Native
// components, so replace them with inert functions before the module graph loads.
vi.mock('lucide-react-native', () => {
  const Icon = () => null;
  return {
    BedDouble: Icon,
    Car: Icon,
    Coffee: Icon,
    Ellipsis: Icon,
    GraduationCap: Icon,
    HeartPulse: Icon,
    House: Icon,
    ReceiptText: Icon,
    ShoppingBag: Icon,
    ShoppingBasket: Icon,
    ShoppingCart: Icon,
    Ticket: Icon,
    Utensils: Icon,
    Wine: Icon,
  };
});

import {
  categoryTotals,
  dailySeries,
  expensesForMonth,
  expensesForYear,
  getMonthStats,
  getYearStats,
  monthlySeries,
  weekdayTotals,
  yearMonthlySeries,
} from '@/features/personal/stats';
import type { PersonalExpense } from '@/types/models';

function makeExpense(overrides: Partial<PersonalExpense> = {}): PersonalExpense {
  return {
    id: 'p1',
    title: 'Coffee',
    amountPaise: 10000,
    category: 'food',
    date: '2026-03-05',
    recurrence: 'none',
    paymentMethod: 'upi',
    createdAt: '2026-03-05T09:00:00.000Z',
    ...overrides,
  };
}

const expenses: PersonalExpense[] = [
  makeExpense({
    id: 'p1',
    title: 'Lunch',
    amountPaise: 30000,
    category: 'food',
    date: '2026-03-05',
  }),
  makeExpense({
    id: 'p2',
    title: 'Coffee subscription',
    amountPaise: 20000,
    category: 'food',
    date: '2026-03-05',
    recurrence: 'monthly',
  }),
  makeExpense({
    id: 'p3',
    title: 'Train',
    amountPaise: 60000,
    category: 'transport',
    date: '2026-03-10',
  }),
  makeExpense({
    id: 'p4',
    title: 'Rent',
    amountPaise: 40000,
    category: 'rent',
    date: '2026-02-01',
    recurrence: 'monthly',
  }),
  makeExpense({
    id: 'p5',
    title: 'New year dinner',
    amountPaise: 10000,
    category: 'food',
    date: '2025-12-31',
  }),
  makeExpense({
    id: 'p6',
    title: 'Concert',
    amountPaise: 25000,
    category: 'fun',
    date: '2026-04-01',
  }),
  makeExpense({
    id: 'p7',
    title: 'Electricity',
    amountPaise: 10000,
    category: 'bills',
    date: '2026-01-15',
  }),
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('expensesForMonth', () => {
  it('filters by month prefix and respects boundaries', () => {
    expect(expensesForMonth(expenses, '2026-03').map((expense) => expense.id)).toEqual([
      'p1',
      'p2',
      'p3',
    ]);
    expect(expensesForMonth(expenses, '2026-04').map((expense) => expense.id)).toEqual(['p6']);
    expect(expensesForMonth(expenses, '2026-05')).toEqual([]);
  });
});

describe('expensesForYear', () => {
  it('filters by calendar year', () => {
    expect(expensesForYear(expenses, 2026).map((expense) => expense.id)).toEqual([
      'p1',
      'p2',
      'p3',
      'p4',
      'p6',
      'p7',
    ]);
    expect(expensesForYear(expenses, 2025).map((expense) => expense.id)).toEqual(['p5']);
    expect(expensesForYear(expenses, 2024)).toEqual([]);
  });
});

describe('categoryTotals', () => {
  it('aggregates categories, filters empty ones, and sorts by amount', () => {
    const totals = categoryTotals(expensesForMonth(expenses, '2026-03'));

    expect(
      totals.map((category) => ({
        id: category.id,
        label: category.label,
        amount: category.amountPaise,
        percent: category.percent,
        count: category.count,
      })),
    ).toEqual([
      { id: 'transport', label: 'Transport', amount: 60000, percent: 55, count: 1 },
      { id: 'food', label: 'Food & dining', amount: 50000, percent: 45, count: 2 },
    ]);
  });

  it('returns an empty array for no expenses', () => {
    expect(categoryTotals([])).toEqual([]);
  });
});

describe('dailySeries', () => {
  it('builds a zero-filled series and aggregates same-day expenses', () => {
    const daily = dailySeries(expensesForMonth(expenses, '2026-03'), '2026-03');

    expect(daily).toHaveLength(31);
    expect(daily[0]).toEqual({ day: 1, date: '2026-03-01', amountPaise: 0 });
    expect(daily[4]).toEqual({ day: 5, date: '2026-03-05', amountPaise: 50000 });
    expect(daily[9]).toEqual({ day: 10, date: '2026-03-10', amountPaise: 60000 });
    expect(daily.reduce((sum, point) => sum + point.amountPaise, 0)).toBe(110000);
  });

  it('handles February in leap and non-leap years', () => {
    expect(dailySeries([], '2026-02')).toHaveLength(28);
    expect(dailySeries([], '2028-02')).toHaveLength(29);
  });
});

describe('weekdayTotals', () => {
  it('always returns Monday-to-Sunday buckets', () => {
    expect(weekdayTotals([])).toEqual([
      { day: 'Mon', amountPaise: 0 },
      { day: 'Tue', amountPaise: 0 },
      { day: 'Wed', amountPaise: 0 },
      { day: 'Thu', amountPaise: 0 },
      { day: 'Fri', amountPaise: 0 },
      { day: 'Sat', amountPaise: 0 },
      { day: 'Sun', amountPaise: 0 },
    ]);
  });

  it('aggregates by local weekday', () => {
    expect(weekdayTotals(expensesForMonth(expenses, '2026-03'))).toEqual([
      { day: 'Mon', amountPaise: 0 },
      { day: 'Tue', amountPaise: 60000 },
      { day: 'Wed', amountPaise: 0 },
      { day: 'Thu', amountPaise: 50000 },
      { day: 'Fri', amountPaise: 0 },
      { day: 'Sat', amountPaise: 0 },
      { day: 'Sun', amountPaise: 0 },
    ]);
  });
});

describe('monthlySeries', () => {
  it('returns the last N months ending with the current month', () => {
    expect(monthlySeries(expenses, 4)).toEqual([
      { key: '2025-12', label: 'Dec', amountPaise: 10000 },
      { key: '2026-01', label: 'Jan', amountPaise: 10000 },
      { key: '2026-02', label: 'Feb', amountPaise: 40000 },
      { key: '2026-03', label: 'Mar', amountPaise: 110000 },
    ]);
  });

  it('supports a custom window and excludes out-of-window months', () => {
    expect(monthlySeries(expenses, 1)).toEqual([
      { key: '2026-03', label: 'Mar', amountPaise: 110000 },
    ]);
    expect(monthlySeries(expenses, 0)).toEqual([]);
  });
});

describe('yearMonthlySeries', () => {
  it('returns all twelve months for a year with totals', () => {
    const series = yearMonthlySeries(expenses, 2026);

    expect(series).toHaveLength(12);
    expect(series[0]).toEqual({ key: '2026-01', label: 'Jan', amountPaise: 10000 });
    expect(series[1]).toEqual({ key: '2026-02', label: 'Feb', amountPaise: 40000 });
    expect(series[2]).toEqual({ key: '2026-03', label: 'Mar', amountPaise: 110000 });
    expect(series[3]).toEqual({ key: '2026-04', label: 'Apr', amountPaise: 25000 });
    expect(series[11]).toEqual({ key: '2026-12', label: 'Dec', amountPaise: 0 });
    expect(series.reduce((sum, month) => sum + month.amountPaise, 0)).toBe(185000);
  });
});

describe('getMonthStats', () => {
  it('computes totals, budget, averages, categories, and insights', () => {
    const stats = getMonthStats(expenses, '2026-03', 100000);

    expect(stats.key).toBe('2026-03');
    expect(stats.label).toBe('March 2026');
    expect(stats.totalPaise).toBe(110000);
    expect(stats.count).toBe(3);
    expect(stats.previousTotalPaise).toBe(40000);
    expect(stats.changePercent).toBe(175);
    expect(stats.avgPerDayPaise).toBe(11000);
    expect(stats.budgetPaise).toBe(100000);
    expect(stats.budgetProgress).toBeCloseTo(1.1);
    expect(stats.remainingPaise).toBe(-10000);
    expect(stats.recurringTotalPaise).toBe(20000);

    expect(
      stats.categories.map((category) => ({
        id: category.id,
        amount: category.amountPaise,
        percent: category.percent,
        count: category.count,
      })),
    ).toEqual([
      { id: 'transport', amount: 60000, percent: 55, count: 1 },
      { id: 'food', amount: 50000, percent: 45, count: 2 },
    ]);
    expect(stats.topCategory?.id).toBe('transport');
    expect(stats.biggestExpense?.id).toBe('p3');

    expect(stats.daily).toHaveLength(31);
    expect(stats.daily[4]).toEqual({ day: 5, date: '2026-03-05', amountPaise: 50000 });
    expect(stats.daily[9]).toEqual({ day: 10, date: '2026-03-10', amountPaise: 60000 });

    expect(stats.weekdays).toEqual([
      { day: 'Mon', amountPaise: 0 },
      { day: 'Tue', amountPaise: 60000 },
      { day: 'Wed', amountPaise: 0 },
      { day: 'Thu', amountPaise: 50000 },
      { day: 'Fri', amountPaise: 0 },
      { day: 'Sat', amountPaise: 0 },
      { day: 'Sun', amountPaise: 0 },
    ]);

    expect(stats.insights.map((insight) => insight.id)).toEqual([
      'top-category',
      'month-change',
      'biggest',
      'weekday',
    ]);
    expect(stats.insights[0].title).toBe('Transport took the biggest bite');
    expect(stats.insights[0].body).toBe('55% of your spending this month, across 1 entry.');
    expect(stats.insights[1].title).toBe('175% more than last month');
    expect(stats.insights[1].tone).toBe('negative');
    expect(stats.insights[1].body).toBe(
      'You have spent ₹1,100 so far. Last month ended at ₹400.',
    );
    expect(stats.insights[2].title).toBe('Biggest single spend: ₹600');
    expect(stats.insights[2].body).toBe('Train on 2026-03-10.');
    expect(stats.insights[3].title).toBe('Tue is your spendiest day');
  });

  it('reports a spending decrease with a positive insight', () => {
    const stats = getMonthStats(
      [
        makeExpense({ id: 'cheap', amountPaise: 20000, date: '2026-03-05' }),
        makeExpense({ id: 'previous', amountPaise: 40000, date: '2026-02-10' }),
      ],
      '2026-03',
      0,
    );

    expect(stats.totalPaise).toBe(20000);
    expect(stats.previousTotalPaise).toBe(40000);
    expect(stats.changePercent).toBe(-50);

    const insight = stats.insights.find((item) => item.id === 'month-change');
    expect(insight?.title).toBe('50% less than last month');
    expect(insight?.tone).toBe('positive');
  });

  it('averages a past month across all of its days', () => {
    const stats = getMonthStats(expenses, '2026-02', 0);

    expect(stats.totalPaise).toBe(40000);
    expect(stats.count).toBe(1);
    expect(stats.previousTotalPaise).toBe(10000);
    expect(stats.avgPerDayPaise).toBe(Math.round(40000 / 28));
    expect(stats.daily).toHaveLength(28);
    expect(stats.budgetProgress).toBe(0);
    expect(stats.remainingPaise).toBe(-40000);
  });

  it('uses elapsed days for the current month average', () => {
    const stats = getMonthStats(
      [makeExpense({ id: 'current', amountPaise: 100000, date: '2026-03-01' })],
      '2026-03',
      200000,
    );

    expect(stats.avgPerDayPaise).toBe(10000);
    expect(stats.budgetProgress).toBeCloseTo(0.5);
    expect(stats.remainingPaise).toBe(100000);
  });

  it('handles a month with no expenses', () => {
    const stats = getMonthStats([], '2026-05', 50000);

    expect(stats.totalPaise).toBe(0);
    expect(stats.count).toBe(0);
    expect(stats.previousTotalPaise).toBe(0);
    expect(stats.changePercent).toBe(0);
    expect(stats.avgPerDayPaise).toBe(0);
    expect(stats.budgetPaise).toBe(50000);
    expect(stats.budgetProgress).toBe(0);
    expect(stats.remainingPaise).toBe(50000);
    expect(stats.categories).toEqual([]);
    expect(stats.topCategory).toBeUndefined();
    expect(stats.biggestExpense).toBeUndefined();
    expect(stats.recurringTotalPaise).toBe(0);
    expect(stats.insights).toEqual([]);
    expect(stats.daily).toHaveLength(31);
    expect(stats.weekdays).toHaveLength(7);
    expect(stats.weekdays.every((weekday) => weekday.amountPaise === 0)).toBe(true);
  });

  it('uses 29 days for a leap-year February', () => {
    const stats = getMonthStats([], '2028-02', 0);

    expect(stats.daily).toHaveLength(29);
    expect(stats.daily[28].date).toBe('2028-02-29');
    expect(stats.avgPerDayPaise).toBe(0);
  });
});

describe('getYearStats', () => {
  it('computes annual totals, averages, categories, and months', () => {
    const stats = getYearStats(expenses, 2026, 50000);

    expect(stats.totalPaise).toBe(185000);
    expect(stats.count).toBe(6);
    expect(stats.avgPerMonthPaise).toBe(15417);
    expect(stats.categories.map((category) => category.id)).toEqual([
      'transport',
      'food',
      'rent',
      'fun',
      'bills',
    ]);
    expect(stats.topCategory?.id).toBe('transport');
    expect(stats.months).toHaveLength(12);
    expect(stats.months[2].amountPaise).toBe(110000);
  });

  it('handles a year with no expenses', () => {
    const stats = getYearStats(expenses, 2024, 0);

    expect(stats.totalPaise).toBe(0);
    expect(stats.count).toBe(0);
    expect(stats.avgPerMonthPaise).toBe(0);
    expect(stats.categories).toEqual([]);
    expect(stats.topCategory).toBeUndefined();
    expect(stats.months.every((month) => month.amountPaise === 0)).toBe(true);
  });
});
