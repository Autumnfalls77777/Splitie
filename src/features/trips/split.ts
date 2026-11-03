import { allocateByWeights, allocateEvenly, sum } from '@/lib/money';
import { findYouMember } from './identity';
import type {
  Expense,
  ExpenseSplit,
  Member,
  MemberBalance,
  Settlement,
  SuggestedTransfer,
  Trip,
  TripSummary,
} from '@/types/models';

/** Split equally, distributing leftover paise so the parts always sum to the total. */
export function equalSplits(amountPaise: number, memberIds: string[]): ExpenseSplit[] {
  const parts = allocateEvenly(amountPaise, memberIds.length);
  return memberIds.map((memberId, index) => ({ memberId, amountPaise: parts[index] }));
}

/** Split by shares, e.g. [2, 1, 1]. */
export function weightedSplits(
  amountPaise: number,
  entries: { memberId: string; weight: number }[],
): ExpenseSplit[] {
  const parts = allocateByWeights(
    amountPaise,
    entries.map((entry) => entry.weight),
  );
  return entries.map((entry, index) => ({ memberId: entry.memberId, amountPaise: parts[index] }));
}

/** Split by percentages. Percentages are expected to add up to 100. */
export function percentSplits(
  amountPaise: number,
  entries: { memberId: string; percent: number }[],
): ExpenseSplit[] {
  return weightedSplits(
    amountPaise,
    entries.map((entry) => ({ memberId: entry.memberId, weight: entry.percent })),
  );
}

export function exactSplits(entries: ExpenseSplit[]): ExpenseSplit[] {
  return entries.filter((entry) => entry.amountPaise > 0);
}

export function computeBalances(
  trip: Trip,
  expenses: Expense[],
  settlements: Settlement[],
): MemberBalance[] {
  const tripExpenses = expenses.filter((expense) => expense.tripId === trip.id);
  const tripSettlements = settlements.filter((settlement) => settlement.tripId === trip.id);

  const paid = new Map<string, number>();
  const share = new Map<string, number>();
  const settled = new Map<string, number>();
  const received = new Map<string, number>();

  for (const member of trip.members) {
    paid.set(member.id, 0);
    share.set(member.id, 0);
    settled.set(member.id, 0);
    received.set(member.id, 0);
  }

  for (const expense of tripExpenses) {
    paid.set(expense.paidBy, (paid.get(expense.paidBy) ?? 0) + expense.amountPaise);
    for (const split of expense.splits) {
      share.set(split.memberId, (share.get(split.memberId) ?? 0) + split.amountPaise);
    }
  }

  for (const settlement of tripSettlements) {
    settled.set(
      settlement.fromMemberId,
      (settled.get(settlement.fromMemberId) ?? 0) + settlement.amountPaise,
    );
    received.set(
      settlement.toMemberId,
      (received.get(settlement.toMemberId) ?? 0) + settlement.amountPaise,
    );
  }

  return trip.members.map((member) => {
    const paidPaise = paid.get(member.id) ?? 0;
    const sharePaise = share.get(member.id) ?? 0;
    const settledPaise = settled.get(member.id) ?? 0;
    const receivedPaise = received.get(member.id) ?? 0;
    return {
      member,
      paidPaise,
      sharePaise,
      settledPaise,
      receivedPaise,
      balancePaise: paidPaise - sharePaise + settledPaise - receivedPaise,
    };
  });
}

/** Greedy min-cash-flow: produces at most n-1 transfers. */
export function calculateTransfers(balances: MemberBalance[]): SuggestedTransfer[] {
  const creditors = balances
    .filter((balance) => balance.balancePaise > 1)
    .map((balance) => ({ member: balance.member, amount: balance.balancePaise }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = balances
    .filter((balance) => balance.balancePaise < -1)
    .map((balance) => ({ member: balance.member, amount: -balance.balancePaise }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: SuggestedTransfer[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amountPaise = Math.min(creditor.amount, debtor.amount);

    if (amountPaise > 0) {
      transfers.push({ from: debtor.member, to: creditor.member, amountPaise });
    }

    creditor.amount -= amountPaise;
    debtor.amount -= amountPaise;

    if (creditor.amount <= 1) creditorIndex += 1;
    if (debtor.amount <= 1) debtorIndex += 1;
  }

  return transfers;
}

export function computeTripSummary(
  trip: Trip,
  expenses: Expense[],
  settlements: Settlement[],
  youId: string,
): TripSummary {
  const tripExpenses = expenses.filter((expense) => expense.tripId === trip.id);
  const tripSettlements = settlements.filter((settlement) => settlement.tripId === trip.id);
  const totalPaise = sum(tripExpenses.map((expense) => expense.amountPaise));
  const balances = computeBalances(trip, tripExpenses, tripSettlements);
  // Trip member row ids are not auth user ids for people who joined later.
  // Resolve "you" through the linked user_id, then fall back to the creator id.
  const youMember = findYouMember(trip.members, youId);
  const you = balances.find((balance) => balance.member.id === youMember?.id);
  const dayCount = Math.max(1, Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86_400_000) + 1);
  const budgetProgress = trip.budgetPaise ? Math.min(1.5, totalPaise / trip.budgetPaise) : 0;

  return {
    totalPaise,
    yourPaidPaise: you?.paidPaise ?? 0,
    yourSharePaise: you?.sharePaise ?? 0,
    yourBalancePaise: you?.balancePaise ?? 0,
    balances,
    transfers: calculateTransfers(balances),
    settled: balances.every((balance) => Math.abs(balance.balancePaise) <= 1),
    budgetProgress,
    perDayPaise: Math.round(totalPaise / dayCount),
    dayCount,
  };
}

export type TripStatus = 'upcoming' | 'active' | 'past' | 'settled';

export function getTripStatus(trip: Trip, settled: boolean, today: string): TripStatus {
  if (settled) return 'settled';
  if (trip.startDate > today) return 'upcoming';
  if (trip.endDate < today) return 'past';
  return 'active';
}

export function memberById(trip: Trip, memberId: string): Member | undefined {
  return trip.members.find((member) => member.id === memberId);
}

export function groupExpensesByDate(expenses: Expense[]): { date: string; data: Expense[] }[] {
  const groups = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const existing = groups.get(expense.date) ?? [];
    existing.push(expense);
    groups.set(expense.date, existing);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, data]) => ({
      date,
      data: data.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    }));
}

/** `memberId` is a trip_members row id, not an auth user id. */
export function expenseYourShare(expense: Expense, memberId: string): number {
  return expense.splits.find((split) => split.memberId === memberId)?.amountPaise ?? 0;
}
