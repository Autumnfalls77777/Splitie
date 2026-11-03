import { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Plane,
  ReceiptText,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

import { SectionHeader } from '@/components/layout/SectionHeader';
import { Sparkline } from '@/components/charts/Sparkline';
import { ExpenseRow } from '@/components/expenses/ExpenseRow';
import { TripCard } from '@/components/trips/TripCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarStack } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/features/auth/auth.store';
import { getMonthStats } from '@/features/personal/stats';
import { usePersonalStore } from '@/features/personal/personal.store';
import { useReminderStore } from '@/features/reminders/reminders.store';
import {
  useOverallBalanceQuery,
  useRecentActivityQuery,
  useTripsQuery,
} from '@/features/trips/queries';
import { useUIStore } from '@/features/settings/ui.store';
import { greeting, monthKey, todayISO } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';

type QuickActionProps = {
  label: string;
  caption: string;
  icon: LucideIcon;
  tint: string;
  background: string;
  onPress: () => void;
};

function QuickAction({ label, caption, icon: Icon, tint, background, onPress }: QuickActionProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        hapticTap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.line,
          borderRadius: theme.radius.lg,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: background }]}>
        <Icon size={17} color={tint} strokeWidth={2.1} />
      </View>
      <Text
        numberOfLines={1}
        style={{ fontFamily: theme.fonts.bold, fontSize: 11.5, marginTop: 7 }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: theme.fonts.medium,
          fontSize: 9.5,
          color: theme.colors.inkSubtle,
          marginTop: 1,
        }}
      >
        {caption}
      </Text>
    </Pressable>
  );
}

function HomeSkeleton() {
  const theme = useTheme();
  return (
    <View style={{ gap: 18 }}>
      <Skeleton height={214} radius={30} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Skeleton height={86} radius={20} style={{ flex: 1 }} />
        <Skeleton height={86} radius={20} style={{ flex: 1 }} />
        <Skeleton height={86} radius={20} style={{ flex: 1 }} />
      </View>
      <Skeleton height={26} width={140} radius={8} />
      <Skeleton height={252} radius={26} />
      <Skeleton height={26} width={160} radius={8} />
      <Skeleton height={150} radius={26} />
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const youId = user?.id ?? '';
  const openAddSheet = useUIStore((state) => state.openAddSheet);

  const tripsQuery = useTripsQuery(youId);
  const balanceQuery = useOverallBalanceQuery(youId);
  const activityQuery = useRecentActivityQuery(youId, 5);
  const personalExpenses = usePersonalStore((state) => state.expenses);
  const monthlyBudgetPaise = usePersonalStore((state) => state.monthlyBudgetPaise);
  const reminders = useReminderStore((state) => state.reminders);

  const monthStats = useMemo(
    () => getMonthStats(personalExpenses, monthKey(), monthlyBudgetPaise),
    [personalExpenses, monthlyBudgetPaise],
  );

  const unreadReminders = reminders.filter((reminder) => !reminder.read && !reminder.completed);
  const trips = tripsQuery.data ?? [];
  const activeTrips = trips.filter((item) => item.status === 'active' || item.status === 'upcoming');
  const balance = balanceQuery.data;
  const net = balance?.netPaise ?? 0;
  const loading = (balanceQuery.isLoading && !balance) || (tripsQuery.isLoading && trips.length === 0);

  const settleTarget = trips.find(
    (item) => !item.summary.settled && item.summary.transfers.length > 0,
  );

  const refresh = () => {
    tripsQuery.refetch();
    balanceQuery.refetch();
    activityQuery.refetch();
  };

  const greetingText = greeting();
  const firstName = user?.name.split(' ')[0] ?? 'there';
  const dateLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const heroLabel = net > 1 ? 'You are owed in total' : net < -1 ? 'You owe in total' : 'Everything is square';
  const heroAmount = Math.abs(net);

  return (
    <Screen
      contentBottom={132}
      refreshControl={
        <RefreshControl
          refreshing={tripsQuery.isRefetching || balanceQuery.isRefetching}
          onRefresh={refresh}
          tintColor={theme.colors.limeDeep}
        />
      }
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.inkSubtle }}>
            {dateLabel}
          </Text>
          <Text
            style={{
              fontFamily: theme.fonts.display,
              fontSize: 25,
              letterSpacing: -0.7,
              marginTop: 2,
            }}
          >
            {greetingText}, {firstName}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Open notifications"
          onPress={() => {
            hapticTap();
            router.push('/notifications');
          }}
          style={({ pressed }) => [
            styles.bell,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.line,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Bell size={19} color={theme.colors.ink} strokeWidth={2.1} />
          {unreadReminders.length > 0 ? (
            <View style={[styles.bellDot, { backgroundColor: theme.colors.clay, borderColor: theme.colors.surface }]} />
          ) : null}
        </Pressable>
        <Pressable
          accessibilityLabel="Open profile"
          onPress={() => {
            hapticTap();
            router.push('/profile');
          }}
        >
          <Avatar name={user?.name ?? 'Splitie'} color={theme.colors.lime} size={42} ring ringColor={theme.colors.surface} />
        </Pressable>
      </View>

      {loading ? (
        <HomeSkeleton />
      ) : (
        <>
          <LinearGradient
            colors={[theme.colors.limeBright, theme.colors.lime]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { borderColor: 'rgba(20,24,15,0.08)' }]}
          >
            <View style={styles.heroTop}>
              <View style={[styles.heroBadge, { backgroundColor: 'rgba(20,24,15,0.08)' }]}>
                <View style={[styles.liveDot, { backgroundColor: theme.colors.onLime }]} />
                <Text style={{ fontFamily: theme.fonts.bold, fontSize: 10.5, color: theme.colors.onLime }}>
                  {balance?.activeTrips ?? 0} active {balance?.activeTrips === 1 ? 'trip' : 'trips'}
                </Text>
              </View>
              <AvatarStack
                members={activeTrips.flatMap((item) => item.trip.members).filter((member, index, list) => list.findIndex((entry) => entry.id === member.id) === index)}
                size={27}
                max={4}
                ringColor={theme.colors.lime}
              />
            </View>

            <View style={{ marginTop: 18 }}>
              <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 12, color: theme.colors.onLime, opacity: 0.62 }}>
                {heroLabel}
              </Text>
              <AnimatedNumber
                valuePaise={heroAmount}
                style={{
                  fontFamily: theme.fonts.displayXBold,
                  fontSize: 46,
                  lineHeight: 52,
                  letterSpacing: -2.2,
                  color: theme.colors.onLime,
                  marginTop: 1,
                }}
              />
              <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.onLime, opacity: 0.56, marginTop: 2 }}>
                {net > 1
                  ? 'Across your open trip balances'
                  : net < -1
                    ? 'A couple of transfers will clear it'
                    : 'No pending balances right now'}
              </Text>
            </View>

            <View style={styles.heroBottom}>
              <View style={{ flexDirection: 'row', gap: 20 }}>
                <View>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 9.5, color: theme.colors.onLime, opacity: 0.56 }}>
                    Owed to you
                  </Text>
                  <Text style={{ fontFamily: theme.fonts.bold, fontSize: 13.5, color: theme.colors.onLime, marginTop: 1 }}>
                    {formatMoney(balance?.youAreOwed ?? 0)}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 9.5, color: theme.colors.onLime, opacity: 0.56 }}>
                    You owe
                  </Text>
                  <Text style={{ fontFamily: theme.fonts.bold, fontSize: 13.5, color: theme.colors.onLime, marginTop: 1 }}>
                    {formatMoney(balance?.youOwe ?? 0)}
                  </Text>
                </View>
              </View>
              <Button
                label={settleTarget ? 'Settle up' : 'View trips'}
                variant="dark"
                size="sm"
                icon={ArrowRight}
                iconPosition="right"
                onPress={() => {
                  if (settleTarget) router.push(`/trip/${settleTarget.trip.id}/settle`);
                  else router.push('/(tabs)/trips');
                }}
              />
            </View>
            <View style={styles.heroWatermark} pointerEvents="none">
              <Text style={{ fontFamily: theme.fonts.displayXBold, fontSize: 132, color: theme.colors.onLime, opacity: 0.045 }}>
                ₹
              </Text>
            </View>
          </LinearGradient>

          {unreadReminders.length > 0 ? (
            <Pressable
              onPress={() => {
                hapticTap();
                router.push('/notifications');
              }}
              style={({ pressed }) => [
                styles.reminderBanner,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.line,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.reminderIcon, { backgroundColor: theme.colors.warningSoft }]}>
                <Bell size={17} color={theme.colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: theme.fonts.bold, fontSize: 12.5 }}>
                  {unreadReminders.length} {unreadReminders.length === 1 ? 'reminder is' : 'reminders are'} waiting
                </Text>
                <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle, marginTop: 1 }}>
                  A gentle nudge now saves an awkward text later.
                </Text>
              </View>
              <ChevronRight size={17} color={theme.colors.inkSubtle} />
            </Pressable>
          ) : null}

          <View style={styles.quickRow}>
            <QuickAction
              label="Add expense"
              caption="Split it"
              icon={ReceiptText}
              tint={theme.colors.limeDeep}
              background={theme.colors.limeSoft}
              onPress={openAddSheet}
            />
            <QuickAction
              label="New trip"
              caption="Plan it"
              icon={Plane}
              tint={theme.colors.sky}
              background={theme.colors.infoSoft}
              onPress={() => router.push('/trip/new')}
            />
            <QuickAction
              label="Personal"
              caption="Track it"
              icon={Wallet}
              tint={theme.colors.lilac}
              background={theme.colors.surfaceAlt}
              onPress={() => router.push('/(tabs)/personal')}
            />
          </View>

          <View style={{ marginTop: 26 }}>
            <SectionHeader
              title="Active trips"
              subtitle={activeTrips.length > 0 ? `${activeTrips.length} on the go` : 'Nothing open right now'}
              actionLabel="See all"
              onAction={() => router.push('/(tabs)/trips')}
            />
            {activeTrips.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingHorizontal: theme.spacing.xl, paddingVertical: 2 }}
                style={{ marginHorizontal: -theme.spacing.xl, marginTop: 12 }}
              >
                {activeTrips.map((item) => (
                  <TripCard
                    key={item.trip.id}
                    item={item}
                    variant="compact"
                    onPress={() => router.push(`/trip/${item.trip.id}`)}
                  />
                ))}
              </ScrollView>
            ) : (
              <Card style={{ marginTop: 12 }} padding={18}>
                <EmptyState
                  compact
                  icon={Plane}
                  title="No trips in motion"
                  body="Start a trip and invite the usual suspects."
                  actionLabel="Plan a trip"
                  onAction={() => router.push('/trip/new')}
                />
              </Card>
            )}
          </View>

          <View style={{ marginTop: 26 }}>
            <SectionHeader
              title={`${monthStats.label.split(' ')[0]} spending`}
              subtitle="Your own money, not the group's"
              actionLabel="Open"
              onAction={() => router.push('/(tabs)/personal')}
            />
            <Pressable
              onPress={() => {
                hapticTap();
                router.push('/(tabs)/personal');
              }}
              style={({ pressed }) => [
                styles.spendCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.line,
                  borderRadius: theme.radius.xl,
                  opacity: pressed ? 0.88 : 1,
                },
                theme.shadows.card,
              ]}
            >
              <View style={styles.spendTop}>
                <View>
                  <Text variant="numericSmall">{formatMoney(monthStats.totalPaise)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Badge
                      label={
                        monthStats.changePercent === 0
                          ? 'No change'
                          : `${monthStats.changePercent > 0 ? '+' : ''}${monthStats.changePercent}% vs last month`
                      }
                      tone={monthStats.changePercent > 0 ? 'negative' : 'positive'}
                    />
                    <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle }}>
                      {monthStats.count} entries
                    </Text>
                  </View>
                </View>
                <View style={[styles.spendIcon, { backgroundColor: theme.colors.limeSoft }]}>
                  <Sparkles size={18} color={theme.colors.limeDeep} />
                </View>
              </View>

              <View style={{ marginTop: 14 }}>
                <Sparkline values={monthStats.daily.map((day) => day.amountPaise)} height={44} />
              </View>

              <View style={{ marginTop: 12 }}>
                <ProgressBar
                  progress={monthStats.budgetProgress}
                  height={6}
                  color={monthStats.budgetProgress > 1 ? theme.colors.negative : theme.colors.limeDeep}
                />
                <View style={styles.spendFooter}>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle }}>
                    {monthStats.remainingPaise >= 0
                      ? `${formatMoney(monthStats.remainingPaise)} left of budget`
                      : `${formatMoney(Math.abs(monthStats.remainingPaise))} over budget`}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11, color: theme.colors.limeDeep }}>
                      Details
                    </Text>
                    <ArrowUpRight size={12} color={theme.colors.limeDeep} />
                  </View>
                </View>
              </View>
            </Pressable>
          </View>

          <View style={{ marginTop: 26 }}>
            <SectionHeader title="Recent activity" subtitle="The latest splits" />
            {activityQuery.data && activityQuery.data.length > 0 ? (
              <Card style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 4 }}>
                {activityQuery.data.map((item, index) => (
                  <ExpenseRow
                    key={item.expense.id}
                    expense={item.expense}
                    trip={item.trip}
                    youId={youId}
                    last={index === activityQuery.data!.length - 1}
                    onPress={() => router.push(`/trip/${item.trip.id}`)}
                  />
                ))}
              </Card>
            ) : (
              <Card style={{ marginTop: 12 }} padding={8}>
                <EmptyState
                  compact
                  icon={ReceiptText}
                  title="No expenses yet"
                  body="Add the first one and Splitie will handle the maths."
                  actionLabel="Add an expense"
                  onAction={openAddSheet}
                />
              </Card>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: { position: 'absolute', top: 10, right: 11, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5 },
  hero: {
    borderRadius: 30,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#6F8F20',
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 25,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  heroWatermark: { position: 'absolute', right: 12, bottom: -34 },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginTop: 14,
  },
  reminderIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  quickAction: { flex: 1, borderWidth: 1, padding: 12, minHeight: 100 },
  quickIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  spendCard: { borderWidth: 1, padding: 17, marginTop: 12 },
  spendTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  spendIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  spendFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 },
});
