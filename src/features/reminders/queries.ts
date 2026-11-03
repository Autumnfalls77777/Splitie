import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { sleep } from '@/lib/query';
import { todayISO } from '@/lib/date';
import { useReminderStore } from './reminders.store';

export function useRemindersQuery() {
  return useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      await sleep(240);
      return [...useReminderStore.getState().reminders].sort((a, b) =>
        a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0,
      );
    },
    placeholderData: keepPreviousData,
  });
}

export function useUnreadReminderCountQuery() {
  return useQuery({
    queryKey: ['reminders-unread'],
    queryFn: async () => {
      await sleep(120);
      const today = todayISO();
      return useReminderStore
        .getState()
        .reminders.filter((reminder) => !reminder.read && !reminder.completed && reminder.dueDate >= today)
        .length;
    },
    placeholderData: keepPreviousData,
  });
}
