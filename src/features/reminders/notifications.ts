import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let handlerConfigured = false;
let channelConfigured = false;

function configureHandler() {
  if (handlerConfigured || Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
}

async function ensureChannel() {
  if (Platform.OS !== 'android' || channelConfigured) return;
  await Notifications.setNotificationChannelAsync('settlements', {
    name: 'Settle-up reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: '#C9F25B',
    sound: 'default',
  });
  channelConfigured = true;
}

export async function getNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const permissions = await Notifications.getPermissionsAsync();
    return permissions.granted;
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  configureHandler();
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) {
      await ensureChannel();
      return true;
    }
    const requested = await Notifications.requestPermissionsAsync();
    if (requested.granted) await ensureChannel();
    return requested.granted;
  } catch {
    return false;
  }
}

export async function scheduleReminderNotification(input: {
  reminderId: string;
  title: string;
  body: string;
  dueDate: string;
  hour?: number;
}): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return undefined;
    configureHandler();
    await ensureChannel();

    const date = new Date(`${input.dueDate}T${`${input.hour ?? 10}`.padStart(2, '0')}:00:00`);
    if (date.getTime() <= Date.now()) return undefined;

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        sound: 'default',
        color: '#C9F25B',
        data: { reminderId: input.reminderId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: 'settlements',
      },
    });
  } catch {
    return undefined;
  }
}

export async function cancelReminderNotification(notificationId?: string) {
  if (!notificationId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Notification may already have fired.
  }
}

export async function cancelAllReminderNotifications() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // no-op
  }
}


