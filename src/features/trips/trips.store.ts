import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createId } from '@/lib/id';
import { captureEvent } from '@/lib/posthog';
import { appStorage } from '@/lib/storage';
import { enqueue } from '@/features/sync/outbox';
import { useSettingsStore } from '@/features/settings/settings.store';
import {
  expenseToRow,
  memberToRow,
  settlementToRow,
  tripToRow,
} from '@/features/sync/mappers';
import type { Expense, Settlement, Trip, User } from '@/types/models';

export type NewTripInput = {
  name: string;
  destination: string;
  emoji: string;
  cover: Trip['cover'];
  startDate: string;
  endDate: string;
  budgetPaise?: number;
  currency?: string;
  memberNames: string[];
  you: User;
};

type TripState = {
  trips: Trip[];
  expenses: Expense[];
  settlements: Settlement[];
  addTrip: (input: NewTripInput) => Trip;
  updateTrip: (tripId: string, patch: Partial<Trip>) => void;
  deleteTrip: (tripId: string) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Expense;
  updateExpense: (expenseId: string, patch: Partial<Expense>) => void;
  deleteExpense: (expenseId: string) => void;
  addSettlement: (settlement: Omit<Settlement, 'id' | 'createdAt'>) => Settlement;
  deleteSettlement: (settlementId: string) => void;
  addMember: (tripId: string, name: string, color: string) => void;
  removeMember: (tripId: string, memberId: string) => void;
  setJoinCode: (tripId: string, joinCode: string) => void;
  resetTrips: () => void;
  replaceAll: (data: { trips: Trip[]; expenses: Expense[]; settlements: Settlement[] }) => void;
};

const MEMBER_COLORS = ['#C9F25B', '#F3A26F', '#8FC9F5', '#C8B4F5', '#F2A7C3', '#7FD8C2'];

function queueTrip(trip: Trip) {
  // Members are never written through the trip payload. The creator's row is
  // created by the database trigger; invitees are created by the SECURITY
  // DEFINER RPCs; name-only rows are queued individually.
  enqueue('trips', 'upsert', trip.id, tripToRow(trip) as unknown as Record<string, unknown>);
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      expenses: [],
      settlements: [],

      addTrip: (input) => {
        const now = new Date().toISOString();
        const youMember = {
          id: input.you.id,
          name: input.you.name,
          email: input.you.email,
          color: MEMBER_COLORS[0],
          userId: input.you.id,
          isYou: true,
        };
        const otherMembers = input.memberNames
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name, index) => ({
            id: createId('mem'),
            name,
            color: MEMBER_COLORS[(index + 1) % MEMBER_COLORS.length],
          }));

        const trip: Trip = {
          id: createId('trip'),
          name: input.name.trim(),
          destination: input.destination.trim(),
          emoji: input.emoji,
          cover: input.cover,
          startDate: input.startDate,
          endDate: input.endDate,
          budgetPaise: input.budgetPaise,
          currency: input.currency ?? useSettingsStore.getState().currency,
          members: [youMember, ...otherMembers],
          createdBy: input.you.id,
          createdAt: now,
        };

        set((state) => ({ trips: [trip, ...state.trips] }));
        queueTrip(trip);
        // The creator row is created by the database trigger. Initial
        // name-only members still need an explicit trip_members upsert.
        for (const member of otherMembers) {
          enqueue(
            'trip_members',
            'upsert',
            member.id,
            memberToRow(member, trip.id) as unknown as Record<string, unknown>,
          );
        }
        captureEvent('trip_created', {
          cover: trip.cover,
          member_count: trip.members.length,
          has_budget: Boolean(trip.budgetPaise),
        });
        return trip;
      },

      updateTrip: (tripId, patch) => {
        set((state) => ({
          trips: state.trips.map((trip) => (trip.id === tripId ? { ...trip, ...patch } : trip)),
        }));
        const updated = get().trips.find((trip) => trip.id === tripId);
        if (updated) queueTrip(updated);
        captureEvent('trip_updated', { cover: updated?.cover });
      },

      deleteTrip: (tripId) => {
        set((state) => ({
          trips: state.trips.filter((trip) => trip.id !== tripId),
          expenses: state.expenses.filter((expense) => expense.tripId !== tripId),
          settlements: state.settlements.filter((settlement) => settlement.tripId !== tripId),
        }));
        enqueue('trips', 'delete', tripId);
        captureEvent('trip_deleted');
      },

      addExpense: (input) => {
        const expense: Expense = {
          ...input,
          id: createId('exp'),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ expenses: [expense, ...state.expenses] }));
        enqueue(
          'expenses',
          'upsert',
          expense.id,
          expenseToRow(expense) as unknown as Record<string, unknown>,
        );
        captureEvent('trip_expense_added', {
          amount_paise: expense.amountPaise,
          category: expense.category,
          split_type: expense.splitType,
          split_count: expense.splits.length,
        });
        return expense;
      },

      updateExpense: (expenseId, patch) => {
        set((state) => ({
          expenses: state.expenses.map((expense) =>
            expense.id === expenseId ? { ...expense, ...patch } : expense,
          ),
        }));
        const updated = get().expenses.find((expense) => expense.id === expenseId);
        if (updated) {
          enqueue(
            'expenses',
            'upsert',
            updated.id,
            expenseToRow(updated) as unknown as Record<string, unknown>,
          );
        }
      },

      deleteExpense: (expenseId) => {
        set((state) => ({
          expenses: state.expenses.filter((expense) => expense.id !== expenseId),
        }));
        enqueue('expenses', 'delete', expenseId);
        captureEvent('trip_expense_deleted');
      },

      addSettlement: (input) => {
        const settlement: Settlement = {
          ...input,
          id: createId('set'),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ settlements: [settlement, ...state.settlements] }));
        enqueue(
          'settlements',
          'upsert',
          settlement.id,
          settlementToRow(settlement) as unknown as Record<string, unknown>,
        );
        captureEvent('settlement_recorded', { amount_paise: settlement.amountPaise });
        return settlement;
      },

      deleteSettlement: (settlementId) => {
        set((state) => ({
          settlements: state.settlements.filter((settlement) => settlement.id !== settlementId),
        }));
        enqueue('settlements', 'delete', settlementId);
        captureEvent('settlement_deleted');
      },

      addMember: (tripId, name, color) => {
        const member = { id: createId('mem'), name: name.trim(), color };
        set((state) => ({
          trips: state.trips.map((trip) =>
            trip.id === tripId ? { ...trip, members: [...trip.members, member] } : trip,
          ),
        }));
        enqueue(
          'trip_members',
          'upsert',
          member.id,
          memberToRow(member, tripId) as unknown as Record<string, unknown>,
        );
        captureEvent('trip_member_added');
      },

      removeMember: (tripId, memberId) => {
        set((state) => ({
          trips: state.trips.map((trip) =>
            trip.id === tripId
              ? { ...trip, members: trip.members.filter((member) => member.id !== memberId) }
              : trip,
          ),
        }));
        enqueue('trip_members', 'delete', memberId, { trip_id: tripId });
        captureEvent('trip_member_removed');
      },

      /** Cache a code fetched from the server without re-queueing the trip. */
      setJoinCode: (tripId, joinCode) => {
        set((state) => ({
          trips: state.trips.map((trip) => (trip.id === tripId ? { ...trip, joinCode } : trip)),
        }));
      },

      resetTrips: () => set({ trips: [], expenses: [], settlements: [] }),

      replaceAll: (data) => set(data),
    }),
    {
      name: 'splitie-trips',
      version: 2,
      storage: createJSONStorage(() => appStorage),
      migrate: (persisted, version) => {
        const state = persisted as {
          trips?: Trip[];
          expenses?: Expense[];
          settlements?: Settlement[];
        } | null;
        if (!state?.trips || version >= 2) return persisted as never;
        return {
          ...state,
          trips: state.trips.map((trip) => ({
            ...trip,
            currency: trip.currency ?? 'INR',
            members: trip.members.map((member) =>
              member.isYou && !member.userId ? { ...member, userId: trip.createdBy } : member,
            ),
          })),
        } as never;
      },
    },
  ),
);

export function getTripById(tripId: string): Trip | undefined {
  return useTripStore.getState().trips.find((trip) => trip.id === tripId);
}
