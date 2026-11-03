import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createId } from '@/lib/id';
import { captureEvent } from '@/lib/posthog';
import { appStorage } from '@/lib/storage';
import { reminderToRow } from '@/features/sync/mappers';
import { enqueue } from '@/features/sync/outbox';
import type { Reminder } from '@/types/models';

type ReminderState = {
  reminders: Reminder[];
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'read' | 'completed'>) => Reminder;
  markDone: (reminderId: string) => void;
  markRead: (reminderId: string) => void;
  markAllRead: () => void;
  snooze: (reminderId: string, days: number) => void;
  removeReminder: (reminderId: string) => void;
  resetReminders: () => void;
  replaceAll: (reminders: Reminder[]) => void;
};

function queueReminder(reminder: Reminder) {
  enqueue(
    'reminders',
    'upsert',
    reminder.id,
    reminderToRow(reminder) as unknown as Record<string, unknown>,
  );
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      reminders: [],

      addReminder: (input) => {
        const reminder: Reminder = {
          ...input,
          id: createId('rem'),
          read: false,
          completed: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ reminders: [reminder, ...state.reminders] }));
        queueReminder(reminder);
        captureEvent('reminder_created', { reminder_type: reminder.type });
        return reminder;
      },

      markDone: (reminderId) => {
        set((state) => ({
          reminders: state.reminders.map((reminder) =>
            reminder.id === reminderId
              ? { ...reminder, completed: true, read: true }
              : reminder,
          ),
        }));
        const updated = get().reminders.find((reminder) => reminder.id === reminderId);
        if (updated) queueReminder(updated);
        captureEvent('reminder_completed');
      },

      markRead: (reminderId) => {
        set((state) => ({
          reminders: state.reminders.map((reminder) =>
            reminder.id === reminderId ? { ...reminder, read: true } : reminder,
          ),
        }));
        const updated = get().reminders.find((reminder) => reminder.id === reminderId);
        if (updated) queueReminder(updated);
      },

      markAllRead: () => {
        set((state) => ({
          reminders: state.reminders.map((reminder) => ({ ...reminder, read: true })),
        }));
        for (const reminder of get().reminders) queueReminder(reminder);
        captureEvent('reminders_all_read');
      },

      snooze: (reminderId, days) => {
        set((state) => ({
          reminders: state.reminders.map((reminder) => {
            if (reminder.id !== reminderId) return reminder;
            const date = new Date(`${reminder.dueDate}T12:00:00`);
            date.setDate(date.getDate() + days);
            const dueDate = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
            return { ...reminder, dueDate, completed: false };
          }),
        }));
        const updated = get().reminders.find((reminder) => reminder.id === reminderId);
        if (updated) queueReminder(updated);
        captureEvent('reminder_snoozed', { days });
      },

      removeReminder: (reminderId) => {
        set((state) => ({
          reminders: state.reminders.filter((reminder) => reminder.id !== reminderId),
        }));
        enqueue('reminders', 'delete', reminderId);
        captureEvent('reminder_deleted');
      },

      resetReminders: () => set({ reminders: [] }),

      replaceAll: (reminders) => set({ reminders }),
    }),
    {
      name: 'splitie-reminders',
      version: 1,
      storage: createJSONStorage(() => appStorage),
    },
  ),
);
