import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createId } from '@/lib/id';
import { captureEvent } from '@/lib/posthog';
import { appStorage } from '@/lib/storage';
import { enqueue } from '@/features/sync/outbox';
import { personalExpenseToRow } from '@/features/sync/mappers';
import type { PersonalExpense } from '@/types/models';

type PersonalState = {
  expenses: PersonalExpense[];
  monthlyBudgetPaise: number;
  addExpense: (expense: Omit<PersonalExpense, 'id' | 'createdAt'>) => PersonalExpense;
  updateExpense: (expenseId: string, patch: Partial<PersonalExpense>) => void;
  deleteExpense: (expenseId: string) => void;
  setBudget: (amountPaise: number) => void;
  resetPersonal: () => void;
  replaceAll: (expenses: PersonalExpense[], monthlyBudgetPaise?: number) => void;
};

export const usePersonalStore = create<PersonalState>()(
  persist(
    (set, get) => ({
      expenses: [],
      monthlyBudgetPaise: 3_000_000,

      addExpense: (input) => {
        const expense: PersonalExpense = {
          ...input,
          id: createId('pexp'),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ expenses: [expense, ...state.expenses] }));
        enqueue(
          'personal_expenses',
          'upsert',
          expense.id,
          personalExpenseToRow(expense) as unknown as Record<string, unknown>,
        );
        captureEvent('personal_expense_added', {
          amount_paise: expense.amountPaise,
          category: expense.category,
          recurrence: expense.recurrence,
          payment_method: expense.paymentMethod,
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
            'personal_expenses',
            'upsert',
            updated.id,
            personalExpenseToRow(updated) as unknown as Record<string, unknown>,
          );
        }
      },

      deleteExpense: (expenseId) => {
        set((state) => ({
          expenses: state.expenses.filter((expense) => expense.id !== expenseId),
        }));
        enqueue('personal_expenses', 'delete', expenseId);
        captureEvent('personal_expense_deleted');
      },

      setBudget: (monthlyBudgetPaise) => {
        set({ monthlyBudgetPaise });
        enqueue('user_settings', 'upsert', 'current', {
          monthly_budget_paise: monthlyBudgetPaise,
        });
        captureEvent('monthly_budget_updated', { amount_paise: monthlyBudgetPaise });
      },

      resetPersonal: () => set({ expenses: [], monthlyBudgetPaise: 3_000_000 }),

      replaceAll: (expenses, monthlyBudgetPaise) =>
        set((state) => ({
          expenses,
          monthlyBudgetPaise: monthlyBudgetPaise ?? state.monthlyBudgetPaise,
        })),
    }),
    {
      name: 'splitie-personal',
      version: 1,
      storage: createJSONStorage(() => appStorage),
    },
  ),
);
