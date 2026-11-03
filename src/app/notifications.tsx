import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  BellOff,
  Check,
  Clock,
  HandCoins,
  Plane,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';

import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useRemindersQuery } from '@/features/reminders/queries';
import { useReminderStore } from '@/features/reminders/reminders.store';
import { snoozeReminder } from '@/features/reminders/reminder.service';
import {
  cancelReminderNotification,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/features/reminders/notifications';
import { useSettingsStore } from '@/features/settings/settings.store';
import { useUIStore } from '@/features/settings/ui.store';
import { daysBetween, formatRelativeDue, todayISO } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { hapticSuccess, hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';
import type { Reminder, ReminderType } from '@/types/models';

const TYPE_ICON: Record<ReminderType, LucideIcon> = {
  settle: HandCoins,
  trip: Plane,
  personal: Wallet,
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const query = useRemindersQuery();
  const markDone = useReminderStore((state) => state.markDone);
  const markAllRead = useReminderStore((state) => state.markAllRead);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setNotifications = useSettingsStore((state) => state.setNotifications);
  const showToast = useUIStore((state) => state.showToast);
  const [permission, setPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    getNotificationPermission().then((granted) => {
      if (mounted) setPermission(granted);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const reminders = query.data ?? [];
  const open = useMemo(
    () => reminders.filter((reminder) => !reminder.completed),
    [reminders],
  );
  const completed = useMemo(
    () => reminders.filter((reminder) => reminder.completed),
    [reminders],
  );
  const unread = reminders.filter((reminder) => !reminder.read && !reminder.completed).length;

  const enableNotifications = async () => {
    if (Platform.OS === 'web') return;
    const granted = await requestNotificationPermission();
    setPermission(granted);
    setNotifications(granted);
    if (granted) {
      showToast('Notifications are on');
    } else {
      showToast('Notifications are still off', { kind: 'error' });
    }
  };

  const completeReminder = async (reminder: Reminder) => {
    markDone(reminder.id);
    await cancelReminderNotification(reminder.notificationId);
    posthog?.capture('reminder_completed', { reminder_type: reminder.type });
    hapticSuccess();
    showToast('Reminder cleared');
  };

  const dueTone = (reminder: Reminder) => {
    const days = daysBetween(todayISO(), reminder.dueDate);
    if (days < 0) return { label: formatRelativeDue(reminder.dueDate), tone: 'negative' as const };
    if (days <= 1) return { label: formatRelativeDue(reminder.dueDate), tone: 'warning' as const };
    return { label: formatRelativeDue(reminder.dueDate), tone: 'neutral' as const };
  };

  return (
    <Screen topInset contentBottom={insets.bottom + 36}>
      <Header
        title="Notifications"
        subtitle={unread > 0 ? `${unread} ${unread === 1 ? 'reminder' : 'reminders'} waiting` : 'You are all caught up'}
        onBack={() => router.back()}
        right={
          unread > 0 ? (
            <Pressable
              onPress={() => {
                markAllRead();
                hapticTap();
                showToast('All reminders marked read');
              }}
              hitSlop={8}
            >
              <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11.5, color: theme.colors.limeDeep }}>
                Mark read
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {permission === false ? (
        <Card style={{ marginTop: 16 }} padding={14}>
          <View style={styles.permissionRow}>
            <View style={[styles.permissionIcon, { backgroundColor: theme.colors.warningSoft }]}>
              <BellOff size={18} color={theme.colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: theme.fonts.bold, fontSize: 12.5 }}>
                {Platform.OS === 'web' ? 'Reminders live here for now' : 'Device notifications are off'}
              </Text>
              <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11, lineHeight: 16, color: theme.colors.inkSubtle, marginTop: 2 }}>
                {Platform.OS === 'web'
                  ? 'Push notifications are available in the mobile app. In this preview, reminders stay in this list.'
                  : 'Allow notifications to get a gentle nudge when a settlement is due.'}
              </Text>
            </View>
            {Platform.OS !== 'web' ? (
              <Button label="Enable" variant="primary" size="sm" onPress={enableNotifications} />
            ) : null}
          </View>
        </Card>
      ) : null}

      {query.isLoading && reminders.length === 0 ? (
        <View style={{ gap: 12, marginTop: 18 }}>
          <Skeleton height={118} radius={20} />
          <Skeleton height={118} radius={20} />
          <Skeleton height={118} radius={20} />
        </View>
      ) : reminders.length === 0 ? (
        <Card style={{ marginTop: 20 }} padding={10}>
          <EmptyState
            icon={BellOff}
            title="No reminders yet"
            body="When you set a reminder on a settlement, it will show up here. Quietly."
            actionLabel="Back to trips"
            onAction={() => router.push('/(tabs)/trips')}
          />
        </Card>
      ) : (
        <>
          <View style={{ gap: 10, marginTop: 18 }}>
            {open.map((reminder) => {
              const Icon = TYPE_ICON[reminder.type];
              const due = dueTone(reminder);
              return (
                <View
                  key={reminder.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: reminder.read ? theme.colors.surface : theme.colors.limeSoft,
                      borderColor: reminder.read ? theme.colors.line : theme.colors.lime,
                    },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View
                      style={[
                        styles.icon,
                        {
                          backgroundColor: reminder.read ? theme.colors.surfaceAlt : 'rgba(255,255,255,0.55)',
                        },
                      ]}
                    >
                      <Icon size={20} color={reminder.read ? theme.colors.inkMuted : theme.colors.limeDeep} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {!reminder.read ? (
                          <View style={[styles.unreadDot, { backgroundColor: theme.colors.limeDeep }]} />
                        ) : null}
                        <Text style={{ flex: 1, fontFamily: theme.fonts.bold, fontSize: 13.5 }}>
                          {reminder.title}
                        </Text>
                      </View>
                      <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, lineHeight: 17, color: theme.colors.inkMuted, marginTop: 3 }}>
                        {reminder.body}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardMeta}>
                    <Badge label={due.label} tone={due.tone} dot />
                    {reminder.amountPaise ? (
                      <Text style={{ fontFamily: theme.fonts.display, fontSize: 19, letterSpacing: -0.5 }}>
                        {formatMoney(reminder.amountPaise)}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.actions}>
                    {reminder.tripId ? (
                      <Pressable
                        onPress={() => {
                          hapticTap();
                          router.push(`/trip/${reminder.tripId}`);
                        }}
                        style={[styles.action, { backgroundColor: theme.colors.surface }]}
                      >
                        <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11, color: theme.colors.inkMuted }}>
                          View trip
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => {
                        snoozeReminder(reminder.id, 2);
                        posthog?.capture('reminder_snoozed', {
                          reminder_type: reminder.type,
                          snooze_days: 2,
                        });
                        hapticTap();
                        showToast('Snoozed for 2 days');
                      }}
                      style={[styles.action, { backgroundColor: theme.colors.surface }]}
                    >
                      <Clock size={13} color={theme.colors.inkMuted} />
                      <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11, color: theme.colors.inkMuted }}>
                        Snooze 2d
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => completeReminder(reminder)}
                      style={[styles.action, { backgroundColor: theme.colors.ink }]}
                    >
                      <Check size={13} color={theme.colors.inkInverse} />
                      <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11, color: theme.colors.inkInverse }}>
                        Done
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>

          {open.length === 0 ? (
            <Card style={{ marginTop: 16 }} padding={8}>
              <EmptyState
                compact
                icon={Bell}
                title="Nothing needs attention"
                body="New reminders will land here when they are due."
              />
            </Card>
          ) : null}

          {completed.length > 0 ? (
            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionLabel}>Earlier</Text>
              <View style={{ gap: 8 }}>
                {completed.map((reminder) => {
                  const Icon = TYPE_ICON[reminder.type];
                  return (
                    <View
                      key={reminder.id}
                      style={[
                        styles.completedCard,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.line },
                      ]}
                    >
                      <View style={[styles.icon, { backgroundColor: theme.colors.surfaceAlt }]}>
                        <Icon size={18} color={theme.colors.inkSubtle} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 12.5, color: theme.colors.inkMuted }}>
                          {reminder.title}
                        </Text>
                        <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle, marginTop: 2 }}>
                          Cleared
                        </Text>
                      </View>
                      <Badge label="Done" tone="positive" />
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle, textAlign: 'center', marginTop: 24 }}>
            {notificationsEnabled
              ? 'Reminders are scheduled locally on this device.'
              : 'Device notifications are turned off in Profile.'}
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  permissionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  permissionIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 20, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  unreadDot: { width: 6, height: 6, borderRadius: 3 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  actions: { flexDirection: 'row', gap: 7, marginTop: 12 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 11,
    height: 30,
  },
  sectionLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#8B9180',
    marginBottom: 8,
    marginLeft: 4,
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 11,
  },
});
