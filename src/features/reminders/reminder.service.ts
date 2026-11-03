import { useReminderStore } from './reminders.store';
import { scheduleReminderNotification } from './notifications';
import { useSettingsStore } from '@/features/settings/settings.store';
import { addDaysISO, todayISO } from '@/lib/date';
import type { Reminder } from '@/types/models';

export async function createSettleReminder(input: {
  title: string;
  body: string;
  amountPaise: number;
  tripId: string;
  fromMemberId: string;
  toMemberId: string;
  dueInDays?: number;
}): Promise<Reminder> {
  const dueInDays = input.dueInDays ?? useSettingsStore.getState().reminderLeadDays;
  const reminder = useReminderStore.getState().addReminder({
    type: 'settle',
    title: input.title,
    body: input.body,
    dueDate: addDaysISO(todayISO(), dueInDays),
    amountPaise: input.amountPaise,
    tripId: input.tripId,
    fromMemberId: input.fromMemberId,
    toMemberId: input.toMemberId,
  });

  if (useSettingsStore.getState().notificationsEnabled) {
    const notificationId = await scheduleReminderNotification({
      reminderId: reminder.id,
      title: input.title,
      body: input.body,
      dueDate: reminder.dueDate,
    });
    if (notificationId) {
      useReminderStore.setState((state) => ({
        reminders: state.reminders.map((item) =>
          item.id === reminder.id ? { ...item, notificationId } : item,
        ),
      }));
    }
  }

  return reminder;
}

export async function snoozeReminder(reminderId: string, days = 2) {
  const reminder = useReminderStore.getState().reminders.find((item) => item.id === reminderId);
  if (!reminder) return;
  useReminderStore.getState().snooze(reminderId, days);
  const updated = useReminderStore.getState().reminders.find((item) => item.id === reminderId);
  if (updated && useSettingsStore.getState().notificationsEnabled) {
    const notificationId = await scheduleReminderNotification({
      reminderId: updated.id,
      title: updated.title,
      body: updated.body,
      dueDate: updated.dueDate,
    });
    if (notificationId) {
      useReminderStore.setState((state) => ({
        reminders: state.reminders.map((item) =>
          item.id === reminderId ? { ...item, notificationId } : item,
        ),
      }));
    }
  }
}
