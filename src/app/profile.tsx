import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import {
  Bell,
  BellRing,
  Check,
  ChevronRight,
  Download,
  IndianRupee,
  Info,
  LogOut,
  Moon,
  Smartphone,
  Sun,
  Trash2,
  Vibrate,
  type LucideIcon,
} from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';

import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { APP_VERSION } from '@/constants/app';
import { CURRENCIES } from '@/data/categories';
import { useAuthStore } from '@/features/auth/auth.store';
import { usePersonalStore } from '@/features/personal/personal.store';
import { useReminderStore } from '@/features/reminders/reminders.store';
import { requestNotificationPermission } from '@/features/reminders/notifications';
import { useSettingsStore, type CurrencyCode, type ThemeMode } from '@/features/settings/settings.store';
import { useUIStore } from '@/features/settings/ui.store';
import { useTripStore } from '@/features/trips/trips.store';
import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';

const THEME_OPTIONS: { value: ThemeMode; label: string; caption: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'System', caption: 'Follow your device setting', icon: Smartphone },
  { value: 'light', label: 'Light', caption: 'Bright porcelain and lime', icon: Sun },
  { value: 'dark', label: 'Dark', caption: 'Low light, easy on the eyes', icon: Moon },
];

const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED',
};

const THEME_LABEL: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' };

function escapeCsv(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function buildCsv() {
  const { trips, expenses, settlements } = useTripStore.getState();
  const personal = usePersonalStore.getState().expenses;
  const reminders = useReminderStore.getState().reminders;
  const rows: string[][] = [
    ['type', 'date', 'title', 'category', 'amount_rupees', 'trip', 'people', 'note'],
  ];

  for (const trip of trips) {
    rows.push([
      'trip',
      trip.startDate,
      trip.name,
      trip.cover,
      '',
      trip.destination,
      trip.members.map((member) => member.name).join(' | '),
      `${trip.startDate} to ${trip.endDate}`,
    ]);
  }
  for (const expense of expenses) {
    const trip = trips.find((item) => item.id === expense.tripId);
    const payer = trip?.members.find((member) => member.id === expense.paidBy);
    rows.push([
      'trip_expense',
      expense.date,
      expense.title,
      expense.category,
      (expense.amountPaise / 100).toFixed(2),
      trip?.name ?? '',
      payer?.name ?? '',
      expense.note ?? '',
    ]);
  }
  for (const expense of personal) {
    rows.push([
      'personal_expense',
      expense.date,
      expense.title,
      expense.category,
      (expense.amountPaise / 100).toFixed(2),
      '',
      '',
      expense.note ?? '',
    ]);
  }
  for (const settlement of settlements) {
    const trip = trips.find((item) => item.id === settlement.tripId);
    const from = trip?.members.find((member) => member.id === settlement.fromMemberId);
    const to = trip?.members.find((member) => member.id === settlement.toMemberId);
    rows.push([
      'settlement',
      settlement.date,
      `Settlement: ${from?.name ?? ''} to ${to?.name ?? ''}`,
      '',
      (settlement.amountPaise / 100).toFixed(2),
      trip?.name ?? '',
      `${from?.name ?? ''} → ${to?.name ?? ''}`,
      settlement.note ?? '',
    ]);
  }
  for (const reminder of reminders) {
    rows.push([
      'reminder',
      reminder.dueDate,
      reminder.title,
      reminder.type,
      reminder.amountPaise ? (reminder.amountPaise / 100).toFixed(2) : '',
      '',
      '',
      reminder.completed ? 'completed' : reminder.read ? 'read' : 'unread',
    ]);
  }

  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const trips = useTripStore((state) => state.trips);
  const reminders = useReminderStore((state) => state.reminders);
  const showToast = useUIStore((state) => state.showToast);

  const themeMode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);
  const currency = useSettingsStore((state) => state.currency);
  const setCurrency = useSettingsStore((state) => state.setCurrency);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const setHaptics = useSettingsStore((state) => state.setHaptics);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setNotifications = useSettingsStore((state) => state.setNotifications);
  const reminderLeadDays = useSettingsStore((state) => state.reminderLeadDays);
  const setReminderLeadDays = useSettingsStore((state) => state.setReminderLeadDays);

  const [themeOpen, setThemeOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const stats = useMemo(() => {
    const openTrips = trips.filter((trip) => !trip.archived).length;
    const unread = reminders.filter((reminder) => !reminder.read && !reminder.completed).length;
    return { trips: trips.length, openTrips, unread };
  }, [reminders, trips]);

  if (!user) return <Redirect href="/welcome" />;

  const confirmClearData = () => {
    const run = () => {
      useTripStore.getState().resetTrips();
      usePersonalStore.getState().resetPersonal();
      useReminderStore.getState().resetReminders();
      showToast('All data cleared', {
        description: 'Trips, expenses, reminders and budgets were removed from this device.',
      });
    };
    if (Platform.OS === 'web') {
      if (
        globalThis.confirm(
          'Clear all data? This removes every trip, expense, settlement and reminder on this device. Your account stays signed in.',
        )
      ) {
        run();
      }
      return;
    }
    Alert.alert(
      'Clear all data?',
      'This removes every trip, expense, settlement and reminder on this device. Your account stays signed in.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear data', style: 'destructive', onPress: run },
      ],
    );
  };

  const confirmSignOut = () => {
    const run = () => {
      signOut();
      router.replace('/welcome');
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm('Sign out of Splitie? Your data will stay on this device.')) run();
      return;
    }
    Alert.alert('Sign out?', 'Your data will stay on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: run },
    ]);
  };

  const toggleNotifications = async (value: boolean) => {
    if (!value) {
      setNotifications(false);
      return;
    }
    const granted = await requestNotificationPermission();
    setNotifications(granted);
    if (!granted) {
      showToast('Notifications are off', {
        description:
          Platform.OS === 'web'
            ? 'Reminder notifications are available in the mobile app.'
            : 'Allow notifications for Splitie in system settings.',
        kind: 'error',
      });
    } else {
      showToast('Reminder notifications on');
    }
  };

  const exportData = async () => {
    try {
      const csv = buildCsv();
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `splitie-export-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
        posthog?.capture('data_exported', { export_method: 'download' });
        showToast('CSV downloaded');
        return;
      }
      const path = `${FileSystem.cacheDirectory}splitie-export-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Splitie data',
          UTI: 'public.comma-separated-values-text',
        });
        posthog?.capture('data_exported', { export_method: 'share' });
        showToast('Export ready');
      } else {
        await Clipboard.setStringAsync(csv);
        posthog?.capture('data_exported', { export_method: 'clipboard' });
        showToast('CSV copied', { description: 'Sharing is unavailable, so the data is on your clipboard.' });
      }
    } catch {
      showToast('Could not export data', { kind: 'error' });
    }
  };

  return (
    <>
      <Screen topInset contentBottom={insets.bottom + 36}>
        <Header title="Profile" onBack={() => router.back()} />

        <LinearGradient
          colors={[theme.colors.limeBright, theme.colors.lime]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userCard}
        >
          <View style={styles.userTop}>
            <Avatar name={user.name} color={theme.colors.ink} size={62} ring ringColor="rgba(20,24,15,0.14)" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Text style={{ fontFamily: theme.fonts.display, fontSize: 24, letterSpacing: -0.7, color: theme.colors.onLime }}>
                  {user.name}
                </Text>
              </View>
              <Text style={{ fontFamily: theme.fonts.medium, fontSize: 12, color: theme.colors.onLime, opacity: 0.6, marginTop: 1 }}>
                {user.email}
              </Text>
            </View>
          </View>

          <View style={styles.userDivider} />

          <View style={styles.userStats}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userStatValue}>{stats.trips}</Text>
              <Text style={styles.userStatLabel}>Trips</Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(20,24,15,0.12)', alignSelf: 'stretch' }} />
            <View style={{ flex: 1, paddingLeft: 16 }}>
              <Text style={styles.userStatValue}>{stats.openTrips}</Text>
              <Text style={styles.userStatLabel}>Open</Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(20,24,15,0.12)', alignSelf: 'stretch' }} />
            <View style={{ flex: 1, paddingLeft: 16 }}>
              <Text style={styles.userStatValue}>{stats.unread}</Text>
              <Text style={styles.userStatLabel}>Reminders</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={styles.sectionLabel}>Preferences</Text>
        <Card padding={16} style={{ paddingVertical: 2 }}>
          <ListRow
            title="Appearance"
            subtitle="Light, dark or follow system"
            icon={theme.isDark ? Moon : Sun}
            iconColor={theme.colors.inkMuted}
            right={
              <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 12, color: theme.colors.inkSubtle }}>
                {THEME_LABEL[themeMode]}
              </Text>
            }
            showChevron
            onPress={() => setThemeOpen(true)}
          />
          <ListRow
            title="Display currency"
            subtitle="Symbol used across the app"
            icon={IndianRupee}
            iconColor={theme.colors.inkMuted}
            right={
              <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 12, color: theme.colors.inkSubtle }}>
                {CURRENCY_SYMBOL[currency]} {currency}
              </Text>
            }
            showChevron
            onPress={() => setCurrencyOpen(true)}
          />
          <ListRow
            title="Reminder timing"
            subtitle={`${reminderLeadDays} ${reminderLeadDays === 1 ? 'day' : 'days'} before it is due`}
            icon={BellRing}
            iconColor={theme.colors.inkMuted}
            showChevron
            onPress={() => setRemindersOpen(true)}
          />
          <ListRow
            title="Settle-up notifications"
            subtitle="Local reminders on this device"
            icon={Bell}
            iconColor={theme.colors.inkMuted}
            toggle={
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: theme.colors.lineStrong, true: theme.colors.lime }}
                thumbColor={notificationsEnabled ? theme.colors.ink : theme.colors.surface}
                ios_backgroundColor={theme.colors.lineStrong}
              />
            }
          />
          <ListRow
            title="Haptic feedback"
            subtitle="A little tap when things happen"
            icon={Vibrate}
            iconColor={theme.colors.inkMuted}
            last
            toggle={
              <Switch
                value={hapticsEnabled}
                onValueChange={(value) => {
                  hapticTap();
                  setHaptics(value);
                }}
                trackColor={{ false: theme.colors.lineStrong, true: theme.colors.lime }}
                thumbColor={hapticsEnabled ? theme.colors.ink : theme.colors.surface}
                ios_backgroundColor={theme.colors.lineStrong}
              />
            }
          />
        </Card>

        <Text style={styles.sectionLabel}>Your data</Text>
        <Card padding={16} style={{ paddingVertical: 2 }}>
          <ListRow
            title="Export everything"
            subtitle="Trips, expenses, settlements and reminders"
            icon={Download}
            iconColor={theme.colors.inkMuted}
            showChevron
            onPress={exportData}
          />
          <ListRow
            title="Clear all data"
            subtitle="Remove trips, expenses and reminders from this device"
            icon={Trash2}
            iconColor={theme.colors.negative}
            showChevron
            onPress={confirmClearData}
          />
          <ListRow
            title="About Splitie"
            subtitle={`Version ${APP_VERSION}`}
            icon={Info}
            iconColor={theme.colors.inkMuted}
            last
            showChevron
            onPress={() => setAboutOpen(true)}
          />
        </Card>

        <Button
          label="Sign out"
          variant="danger"
          size="md"
          fullWidth
          icon={LogOut}
          style={{ marginTop: 18 }}
          onPress={confirmSignOut}
        />
      </Screen>

      <Sheet visible={themeOpen} onClose={() => setThemeOpen(false)} title="Appearance" subtitle="Choose how Splitie looks.">
        <View style={{ gap: 6 }}>
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = themeMode === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  hapticTap();
                  setThemeMode(option.value);
                  setThemeOpen(false);
                }}
                style={[
                  styles.optionRow,
                  {
                    backgroundColor: selected ? theme.colors.limeSoft : 'transparent',
                    borderColor: selected ? theme.colors.lime : theme.colors.line,
                  },
                ]}
              >
                <View style={[styles.optionIcon, { backgroundColor: theme.colors.surface }]}>
                  <Icon size={19} color={selected ? theme.colors.limeDeep : theme.colors.inkMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: theme.fonts.bold, fontSize: 14 }}>{option.label}</Text>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.inkSubtle, marginTop: 1 }}>
                    {option.caption}
                  </Text>
                </View>
                {selected ? <Check size={18} color={theme.colors.limeDeep} strokeWidth={2.6} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      <Sheet
        visible={currencyOpen}
        onClose={() => setCurrencyOpen(false)}
        title="Display currency"
        subtitle="Choose the symbol shown across Splitie."
      >
        <View style={{ gap: 6 }}>
          {CURRENCIES.map((code) => {
            const selected = currency === code;
            return (
              <Pressable
                key={code}
                onPress={() => {
                  hapticTap();
                  setCurrency(code);
                  setCurrencyOpen(false);
                }}
                style={[
                  styles.optionRow,
                  {
                    backgroundColor: selected ? theme.colors.limeSoft : 'transparent',
                    borderColor: selected ? theme.colors.lime : theme.colors.line,
                  },
                ]}
              >
                <View style={[styles.currencyBadge, { backgroundColor: theme.colors.surface }]}>
                  <Text style={{ fontFamily: theme.fonts.bold, fontSize: 15 }}>{CURRENCY_SYMBOL[code]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: theme.fonts.bold, fontSize: 14 }}>{code}</Text>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.inkSubtle, marginTop: 1 }}>
                    {code === 'INR' ? 'Indian rupee' : code === 'USD' ? 'US dollar' : code === 'EUR' ? 'Euro' : code === 'GBP' ? 'British pound' : 'UAE dirham'}
                  </Text>
                </View>
                {selected ? <Check size={18} color={theme.colors.limeDeep} strokeWidth={2.6} /> : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11, lineHeight: 17, color: theme.colors.inkSubtle, marginTop: 12 }}>
          This changes the display symbol only. Stored amounts are not converted.
        </Text>
      </Sheet>

      <Sheet
        visible={remindersOpen}
        onClose={() => setRemindersOpen(false)}
        title="Reminder timing"
        subtitle="How early should Splitie nudge you?"
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[1, 2, 3, 5, 7].map((days) => {
            const selected = reminderLeadDays === days;
            return (
              <Pressable
                key={days}
                onPress={() => {
                  hapticTap();
                  setReminderLeadDays(days);
                  setRemindersOpen(false);
                  showToast(`Reminders set to ${days} ${days === 1 ? 'day' : 'days'} ahead`);
                }}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: selected ? theme.colors.lime : theme.colors.surface,
                    borderColor: selected ? theme.colors.lime : theme.colors.line,
                  },
                ]}
              >
                <Text style={{ fontFamily: theme.fonts.bold, fontSize: 13, color: selected ? theme.colors.onLime : theme.colors.ink }}>
                  {days} {days === 1 ? 'day' : 'days'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      <Sheet visible={aboutOpen} onClose={() => setAboutOpen(false)} title="About Splitie" subtitle={`Version ${APP_VERSION}`}>
        <Text style={{ fontFamily: theme.fonts.medium, fontSize: 13, lineHeight: 20, color: theme.colors.inkMuted }}>
          Splitie keeps trip maths out of the group chat. Split expenses, settle up cleanly, track your own spending, and get gentle reminders instead of awkward messages.
        </Text>
        <View style={[styles.aboutBox, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Text style={{ fontFamily: theme.fonts.bold, fontSize: 12 }}>Made for good trips.</Text>
          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.inkSubtle, marginTop: 2 }}>
            Splitie · Expo SDK 58 · Made for good trips.
          </Text>
        </View>
        <Button label="Close" variant="secondary" fullWidth onPress={() => setAboutOpen(false)} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  userCard: { borderRadius: 28, padding: 20, marginTop: 14, overflow: 'hidden' },
  userTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  userDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(20,24,15,0.14)', marginVertical: 16 },
  userStats: { flexDirection: 'row', alignItems: 'center' },
  userStatValue: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 21, letterSpacing: -0.5, color: '#14180F' },
  userStatLabel: { fontFamily: 'Manrope_500Medium', fontSize: 9.5, color: '#14180F', opacity: 0.55, marginTop: 1 },
  sectionLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#8B9180',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 12 },
  optionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  currencyBadge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, height: 42, justifyContent: 'center' },
  aboutBox: { borderRadius: 16, padding: 14, marginVertical: 14 },
});
