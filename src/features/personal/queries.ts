import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getMonthStats, getYearStats, monthlySeries } from '@/features/personal/stats';
import { sleep } from '@/lib/query';
import { monthKey } from '@/lib/date';
import { usePersonalStore } from './personal.store';

export function usePersonalExpensesQuery() {
  return useQuery({
    queryKey: ['personal-expenses'],
    queryFn: async () => {
      await sleep(260);
      return [...usePersonalStore.getState().expenses].sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
      );
    },
    placeholderData: keepPreviousData,
  });
}

export function useMonthStatsQuery(key: string = monthKey()) {
  const budget = usePersonalStore((state) => state.monthlyBudgetPaise);
  return useQuery({
    queryKey: ['month-stats', key, budget],
    queryFn: async () => {
      await sleep(240);
      return getMonthStats(usePersonalStore.getState().expenses, key, budget);
    },
    placeholderData: keepPreviousData,
  });
}

export function useYearStatsQuery(year: number) {
  const budget = usePersonalStore((state) => state.monthlyBudgetPaise);
  return useQuery({
    queryKey: ['year-stats', year, budget],
    queryFn: async () => {
      await sleep(240);
      return getYearStats(usePersonalStore.getState().expenses, year, budget);
    },
    placeholderData: keepPreviousData,
  });
}

export function useMonthlyTrendQuery(count = 6) {
  return useQuery({
    queryKey: ['monthly-trend', count],
    queryFn: async () => {
      await sleep(240);
      return monthlySeries(usePersonalStore.getState().expenses, count);
    },
    placeholderData: keepPreviousData,
  });
}

export function useBudgetQuery() {
  return usePersonalStore((state) => state.monthlyBudgetPaise);
}
