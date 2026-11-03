import { describe, expect, it } from 'vitest';

import {
  calculateTransfers,
  computeBalances,
  computeTripSummary,
  equalSplits,
  exactSplits,
  expenseYourShare,
  getTripStatus,
  groupExpensesByDate,
  memberById,
  percentSplits,
  weightedSplits,
} from '@/features/trips/split';
import type {
  Expense,
  Member,
  MemberBalance,
  Settlement,
  Trip,
} from '@/types/models';

const members: Member[] = [
  { id: 'a', name: 'Asha', color: '#C9F25B' },
  { id: 'b', name: 'Ben', color: '#F3A26F' },
  { id: 'c', name: 'Chen', color: '#8FC9F5' },
];

const dev: Member = { id: 'd', name: 'Dev', color: '#C8B4F5' };

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    name: 'Goa',
    destination: 'Goa',
    emoji: '🏖️',
    cover: 'ocean',
    startDate: '2026-03-01',
    endDate: '2026-03-03',
    members,
    createdBy: 'a',
    createdAt: '2026-02-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-1',
    tripId: 'trip-1',
    title: 'Dinner',
    amountPaise: 1000,
    category: 'food',
    paidBy: 'a',
    date: '2026-03-01',
    splitType: 'equal',
    splits: equalSplits(1000, ['a', 'b', 'c']),
    createdAt: '2026-03-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeSettlement(overrides: Partial<Settlement> = {}): Settlement {
  return {
    id: 'set-1',
    tripId: 'trip-1',
    fromMemberId: 'c',
    toMemberId: 'a',
    amountPaise: 333,
    date: '2026-03-02',
    createdAt: '2026-03-02T10:00:00.000Z',
    ...overrides,
  };
}

function makeBalance(member: Member, balancePaise: number): MemberBalance {
  return {
    member,
    paidPaise: Math.max(balancePaise, 0),
    sharePaise: Math.max(-balancePaise, 0),
    settledPaise: 0,
    receivedPaise: 0,
    balancePaise,
  };
}

function total(splits: { amountPaise: number }[]): number {
  return splits.reduce((sum, split) => sum + split.amountPaise, 0);
}

describe('equalSplits', () => {
  it('splits equally and distributes leftover paise', () => {
    expect(equalSplits(1000, ['a', 'b', 'c'])).toEqual([
      { memberId: 'a', amountPaise: 334 },
      { memberId: 'b', amountPaise: 333 },
      { memberId: 'c', amountPaise: 333 },
    ]);
  });

  it('gives the full amount to a single member', () => {
    expect(equalSplits(999, ['a'])).toEqual([{ memberId: 'a', amountPaise: 999 }]);
  });

  it('handles zero amounts and no members', () => {
    expect(equalSplits(0, ['a', 'b'])).toEqual([
      { memberId: 'a', amountPaise: 0 },
      { memberId: 'b', amountPaise: 0 },
    ]);
    expect(equalSplits(100, [])).toEqual([]);
  });

  it('always sums to the original amount and preserves member order', () => {
    const memberSets = [['a'], ['a', 'b'], ['a', 'b', 'c'], ['a', 'b', 'c', 'd']];

    for (const amount of [1, 7, 100, 1000, 12345]) {
      for (const ids of memberSets) {
        const splits = equalSplits(amount, ids);
        expect(total(splits)).toBe(amount);
        expect(splits.map((split) => split.memberId)).toEqual(ids);
      }
    }
  });
});

describe('weightedSplits', () => {
  it('splits by shares', () => {
    expect(
      weightedSplits(1000, [
        { memberId: 'a', weight: 2 },
        { memberId: 'b', weight: 1 },
        { memberId: 'c', weight: 1 },
      ]),
    ).toEqual([
      { memberId: 'a', amountPaise: 500 },
      { memberId: 'b', amountPaise: 250 },
      { memberId: 'c', amountPaise: 250 },
    ]);
  });

  it('uses largest-remainder rounding for leftover paise', () => {
    expect(
      weightedSplits(1001, [
        { memberId: 'a', weight: 1 },
        { memberId: 'b', weight: 1 },
        { memberId: 'c', weight: 1 },
      ]),
    ).toEqual([
      { memberId: 'a', amountPaise: 334 },
      { memberId: 'b', amountPaise: 334 },
      { memberId: 'c', amountPaise: 333 },
    ]);
  });

  it('keeps zero-weight members at zero and still sums to the total', () => {
    const splits = weightedSplits(100, [
      { memberId: 'a', weight: 1 },
      { memberId: 'b', weight: 0 },
      { memberId: 'c', weight: 2 },
    ]);

    expect(splits).toEqual([
      { memberId: 'a', amountPaise: 33 },
      { memberId: 'b', amountPaise: 0 },
      { memberId: 'c', amountPaise: 67 },
    ]);
    expect(total(splits)).toBe(100);
  });
});

describe('percentSplits', () => {
  it('splits by percentages', () => {
    expect(
      percentSplits(1000, [
        { memberId: 'a', percent: 50 },
        { memberId: 'b', percent: 50 },
      ]),
    ).toEqual([
      { memberId: 'a', amountPaise: 500 },
      { memberId: 'b', amountPaise: 500 },
    ]);
  });

  it('handles fractional percentages that sum to 100', () => {
    expect(
      percentSplits(100, [
        { memberId: 'a', percent: 33.33 },
        { memberId: 'b', percent: 33.33 },
        { memberId: 'c', percent: 33.34 },
      ]),
    ).toEqual([
      { memberId: 'a', amountPaise: 33 },
      { memberId: 'b', amountPaise: 33 },
      { memberId: 'c', amountPaise: 34 },
    ]);
  });

  it('normalizes percentages that do not add up to 100', () => {
    expect(
      percentSplits(900, [
        { memberId: 'a', percent: 60 },
        { memberId: 'b', percent: 40 },
      ]),
    ).toEqual([
      { memberId: 'a', amountPaise: 540 },
      { memberId: 'b', amountPaise: 360 },
    ]);

    expect(
      percentSplits(100, [
        { memberId: 'a', percent: 60 },
        { memberId: 'b', percent: 60 },
      ]),
    ).toEqual([
      { memberId: 'a', amountPaise: 50 },
      { memberId: 'b', amountPaise: 50 },
    ]);
  });

  it('always sums exactly to the amount', () => {
    const splits = percentSplits(1001, [
      { memberId: 'a', percent: 33 },
      { memberId: 'b', percent: 33 },
      { memberId: 'c', percent: 34 },
    ]);

    expect(total(splits)).toBe(1001);
  });
});

describe('exactSplits', () => {
  it('filters out zero and negative entries', () => {
    const entries = [
      { memberId: 'a', amountPaise: 500 },
      { memberId: 'b', amountPaise: 0 },
      { memberId: 'c', amountPaise: -10 },
      { memberId: 'd', amountPaise: 500 },
    ];

    expect(exactSplits(entries)).toEqual([
      { memberId: 'a', amountPaise: 500 },
      { memberId: 'd', amountPaise: 500 },
    ]);
    expect(exactSplits([])).toEqual([]);
  });
});

describe('computeBalances', () => {
  it('computes paid, share, and net balance per member', () => {
    const trip = makeTrip();
    const expenses = [
      makeExpense(),
      makeExpense({
        id: 'exp-2',
        amountPaise: 600,
        paidBy: 'b',
        splits: equalSplits(600, ['a', 'b', 'c']),
      }),
      makeExpense({
        id: 'exp-other-trip',
        tripId: 'trip-2',
        amountPaise: 5000,
        paidBy: 'c',
        splits: equalSplits(5000, ['c']),
      }),
    ];

    const balances = computeBalances(trip, expenses, []);

    expect(
      balances.map((balance) => ({
        id: balance.member.id,
        paid: balance.paidPaise,
        share: balance.sharePaise,
        net: balance.balancePaise,
      })),
    ).toEqual([
      { id: 'a', paid: 1000, share: 534, net: 466 },
      { id: 'b', paid: 600, share: 533, net: 67 },
      { id: 'c', paid: 0, share: 533, net: -533 },
    ]);
    expect(balances.reduce((sum, balance) => sum + balance.balancePaise, 0)).toBe(0);
  });

  it('applies settlements only for the current trip', () => {
    const trip = makeTrip();
    const expenses = [makeExpense()];
    const settlements = [
      makeSettlement({ id: 'set-1', fromMemberId: 'c', toMemberId: 'a', amountPaise: 333 }),
      makeSettlement({
        id: 'set-other-trip',
        tripId: 'trip-2',
        fromMemberId: 'b',
        toMemberId: 'a',
        amountPaise: 999,
      }),
    ];

    const balances = computeBalances(trip, expenses, settlements);

    expect(
      balances.map((balance) => ({
        id: balance.member.id,
        settled: balance.settledPaise,
        received: balance.receivedPaise,
        net: balance.balancePaise,
      })),
    ).toEqual([
      { id: 'a', settled: 0, received: 333, net: 333 },
      { id: 'b', settled: 0, received: 0, net: -333 },
      { id: 'c', settled: 333, received: 0, net: 0 },
    ]);
  });

  it('returns zero balances for a trip with no activity', () => {
    const balances = computeBalances(makeTrip(), [], []);

    expect(balances.map((balance) => balance.balancePaise)).toEqual([0, 0, 0]);
  });
});

describe('calculateTransfers', () => {
  it('returns no transfers when everyone is settled', () => {
    expect(
      calculateTransfers([
        makeBalance(members[0], 0),
        makeBalance(members[1], 0),
        makeBalance(members[2], 0),
      ]),
    ).toEqual([]);
  });

  it('ignores balances within one paise', () => {
    expect(
      calculateTransfers([makeBalance(members[0], 1), makeBalance(members[1], -1)]),
    ).toEqual([]);
  });

  it('produces minimal greedy transfers', () => {
    const transfers = calculateTransfers([
      makeBalance(members[0], 500),
      makeBalance(members[1], -200),
      makeBalance(members[2], -300),
    ]);

    expect(
      transfers.map((transfer) => ({
        from: transfer.from.id,
        to: transfer.to.id,
        amount: transfer.amountPaise,
      })),
    ).toEqual([
      { from: 'c', to: 'a', amount: 300 },
      { from: 'b', to: 'a', amount: 200 },
    ]);
  });

  it('handles a settlement chain with at most n - 1 transfers', () => {
    const transfers = calculateTransfers([
      makeBalance(members[0], 700),
      makeBalance(members[1], 300),
      makeBalance(members[2], -400),
      makeBalance(dev, -600),
    ]);

    expect(
      transfers.map((transfer) => ({
        from: transfer.from.id,
        to: transfer.to.id,
        amount: transfer.amountPaise,
      })),
    ).toEqual([
      { from: 'd', to: 'a', amount: 600 },
      { from: 'c', to: 'a', amount: 100 },
      { from: 'c', to: 'b', amount: 300 },
    ]);
    expect(transfers).toHaveLength(3);
  });
});

describe('computeTripSummary', () => {
  const expenses = [
    makeExpense(),
    makeExpense({
      id: 'exp-2',
      amountPaise: 600,
      paidBy: 'b',
      splits: equalSplits(600, ['a', 'b', 'c']),
    }),
  ];

  it('summarizes totals, your position, per-day spend, and transfers', () => {
    const summary = computeTripSummary(makeTrip({ budgetPaise: 1500 }), expenses, [], 'a');

    expect(summary.totalPaise).toBe(1600);
    expect(summary.yourPaidPaise).toBe(1000);
    expect(summary.yourSharePaise).toBe(534);
    expect(summary.yourBalancePaise).toBe(466);
    expect(summary.dayCount).toBe(3);
    expect(summary.perDayPaise).toBe(533);
    expect(summary.budgetProgress).toBeCloseTo(1600 / 1500);
    expect(summary.settled).toBe(false);
    expect(
      summary.transfers.map((transfer) => ({
        from: transfer.from.id,
        to: transfer.to.id,
        amount: transfer.amountPaise,
      })),
    ).toEqual([
      { from: 'c', to: 'a', amount: 466 },
      { from: 'c', to: 'b', amount: 67 },
    ]);
  });

  it('caps budget progress at 150% and treats a missing budget as zero progress', () => {
    const overBudget = computeTripSummary(
      makeTrip({ budgetPaise: 1000 }),
      [
        makeExpense({
          amountPaise: 2000,
          splits: equalSplits(2000, ['a']),
          paidBy: 'a',
        }),
      ],
      [],
      'a',
    );

    expect(overBudget.budgetProgress).toBe(1.5);

    const noBudget = computeTripSummary(makeTrip(), [], [], 'a');
    expect(noBudget.budgetProgress).toBe(0);
    expect(noBudget.totalPaise).toBe(0);
    expect(noBudget.dayCount).toBe(3);
    expect(noBudget.perDayPaise).toBe(0);
  });

  it('reports settled when every balance is within one paise', () => {
    const summary = computeTripSummary(
      makeTrip({ members: [members[0]] }),
      [
        makeExpense({
          amountPaise: 1000,
          splits: equalSplits(1000, ['a']),
          paidBy: 'a',
        }),
      ],
      [],
      'a',
    );

    expect(summary.balances[0].balancePaise).toBe(0);
    expect(summary.settled).toBe(true);
    expect(summary.transfers).toEqual([]);
  });

  it('returns zero personal figures when you are not a trip member', () => {
    const summary = computeTripSummary(makeTrip(), expenses, [], 'nobody');

    expect(summary.yourPaidPaise).toBe(0);
    expect(summary.yourSharePaise).toBe(0);
    expect(summary.yourBalancePaise).toBe(0);
  });

  it('counts a same-day trip as one day', () => {
    const summary = computeTripSummary(
      makeTrip({ startDate: '2026-03-05', endDate: '2026-03-05' }),
      [],
      [],
      'a',
    );

    expect(summary.dayCount).toBe(1);
    expect(summary.perDayPaise).toBe(0);
  });
});

describe('getTripStatus', () => {
  const trip = makeTrip();

  it('uses date boundaries inclusively', () => {
    expect(getTripStatus(trip, false, '2026-02-28')).toBe('upcoming');
    expect(getTripStatus(trip, false, '2026-03-01')).toBe('active');
    expect(getTripStatus(trip, false, '2026-03-02')).toBe('active');
    expect(getTripStatus(trip, false, '2026-03-03')).toBe('active');
    expect(getTripStatus(trip, false, '2026-03-04')).toBe('past');
  });

  it('prefers settled over date-based status', () => {
    expect(getTripStatus(trip, true, '2026-02-28')).toBe('settled');
    expect(getTripStatus(trip, true, '2026-03-04')).toBe('settled');
  });
});

describe('groupExpensesByDate', () => {
  it('groups by date, newest date first, then newest createdAt first', () => {
    const expenses = [
      makeExpense({ id: 'e1', date: '2026-03-01', createdAt: '2026-03-01T09:00:00.000Z' }),
      makeExpense({ id: 'e2', date: '2026-03-02', createdAt: '2026-03-02T10:00:00.000Z' }),
      makeExpense({ id: 'e3', date: '2026-03-01', createdAt: '2026-03-01T12:00:00.000Z' }),
      makeExpense({ id: 'e4', date: '2026-03-02', createdAt: '2026-03-02T08:00:00.000Z' }),
    ];

    const groups = groupExpensesByDate(expenses);

    expect(groups.map((group) => group.date)).toEqual(['2026-03-02', '2026-03-01']);
    expect(groups[0].data.map((expense) => expense.id)).toEqual(['e2', 'e4']);
    expect(groups[1].data.map((expense) => expense.id)).toEqual(['e3', 'e1']);
  });

  it('returns an empty array for no expenses', () => {
    expect(groupExpensesByDate([])).toEqual([]);
  });
});

describe('memberById and expenseYourShare', () => {
  it('looks up members and a member share in an expense', () => {
    const trip = makeTrip();
    const expense = makeExpense();

    expect(memberById(trip, 'b')?.name).toBe('Ben');
    expect(memberById(trip, 'missing')).toBeUndefined();
    expect(expenseYourShare(expense, 'b')).toBe(333);
    expect(expenseYourShare(expense, 'missing')).toBe(0);
  });
});
