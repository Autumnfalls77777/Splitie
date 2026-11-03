import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { sleep } from '@/lib/query';
import { todayISO } from '@/lib/date';
import type { Expense, Member, Trip, TripSummary } from '@/types/models';
import { useTripStore } from './trips.store';
import { computeTripSummary, getTripStatus, type TripStatus } from './split';

export type TripWithSummary = {
  trip: Trip;
  summary: TripSummary;
  status: TripStatus;
  expenseCount: number;
};

export function useTripsQuery(youId: string) {
  return useQuery({
    queryKey: ['trips', youId],
    queryFn: async (): Promise<TripWithSummary[]> => {
      await sleep(280);
      const { trips, expenses, settlements } = useTripStore.getState();
      return trips.map((trip) => {
        const summary = computeTripSummary(trip, expenses, settlements, youId);
        return {
          trip,
          summary,
          status: getTripStatus(trip, summary.settled, todayISO()),
          expenseCount: expenses.filter((expense) => expense.tripId === trip.id).length,
        };
      });
    },
    placeholderData: keepPreviousData,
  });
}

export function useTripQuery(tripId: string, youId: string) {
  return useQuery({
    queryKey: ['trip', tripId, youId],
    queryFn: async () => {
      await sleep(220);
      const { trips, expenses, settlements } = useTripStore.getState();
      const trip = trips.find((item) => item.id === tripId);
      if (!trip) return null;
      const tripExpenses = expenses
        .filter((expense) => expense.tripId === tripId)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      const tripSettlements = settlements.filter((settlement) => settlement.tripId === tripId);
      return {
        trip,
        expenses: tripExpenses,
        settlements: tripSettlements,
        summary: computeTripSummary(trip, tripExpenses, tripSettlements, youId),
      };
    },
    placeholderData: keepPreviousData,
  });
}

export function useOverallBalanceQuery(youId: string) {
  return useQuery({
    queryKey: ['overall-balance', youId],
    queryFn: async () => {
      await sleep(320);
      const { trips, expenses, settlements } = useTripStore.getState();
      let youAreOwed = 0;
      let youOwe = 0;
      let activeTrips = 0;
      let settledTrips = 0;

      for (const trip of trips) {
        if (trip.archived) continue;
        const summary = computeTripSummary(trip, expenses, settlements, youId);
        if (summary.settled) settledTrips += 1;
        else activeTrips += 1;
        if (summary.yourBalancePaise > 0) youAreOwed += summary.yourBalancePaise;
        else youOwe += Math.abs(summary.yourBalancePaise);
      }

      return {
        netPaise: youAreOwed - youOwe,
        youAreOwed,
        youOwe,
        activeTrips,
        settledTrips,
        totalTrips: trips.length,
      };
    },
    placeholderData: keepPreviousData,
  });
}

export type ActivityItem = {
  expense: Expense;
  trip: Trip;
  payer: Member;
  yourSharePaise: number;
};

export function useRecentActivityQuery(youId: string, limit = 6) {
  return useQuery({
    queryKey: ['recent-activity', youId, limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      await sleep(380);
      const { trips, expenses } = useTripStore.getState();
      const tripMap = new Map(trips.map((trip) => [trip.id, trip]));
      return [...expenses]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .slice(0, limit)
        .map((expense) => {
          const trip = tripMap.get(expense.tripId);
          if (!trip) return null;
          const payer = trip.members.find((member) => member.id === expense.paidBy) ?? trip.members[0];
          return {
            expense,
            trip,
            payer,
            yourSharePaise:
              expense.splits.find((split) => split.memberId === youId)?.amountPaise ?? 0,
          };
        })
        .filter((item): item is ActivityItem => item !== null);
    },
    placeholderData: keepPreviousData,
  });
}
