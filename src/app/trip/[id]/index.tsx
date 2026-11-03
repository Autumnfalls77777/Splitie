import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Check,
  EllipsisVertical,
  Plus,
  ReceiptText,
  Share2,
  Trash2,
  Users,
} from 'lucide-react-native';

import { SectionHeader } from '@/components/layout/SectionHeader';
import { ExpenseRow } from '@/components/expenses/ExpenseRow';
import { Avatar, AvatarStack } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { COVERS, TRIP_CATEGORY_MAP } from '@/data/categories';
import { useAuthStore } from '@/features/auth/auth.store';
import { createSettleReminder } from '@/features/reminders/reminder.service';
import { useUIStore } from '@/features/settings/ui.store';
import { useTripQuery } from '@/features/trips/queries';
import { useTripStore } from '@/features/trips/trips.store';
import {
  getTripStatus,
  groupExpensesByDate,
  type TripStatus,
} from '@/features/trips/split';
import { formatDate, formatDateRange, formatDayLabel, todayISO } from '@/lib/date';
import { formatMoney, formatSignedMoney } from '@/lib/money';
import { hapticSuccess, hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';
import type { Expense, SuggestedTransfer } from '@/types/models';

type Tab = 'expenses' | 'balances';

const STATUS_LABEL: Record<TripStatus, string> = {
  active: 'On the trip',
  upcoming: 'Upcoming',
  past: 'Past trip',
  settled: 'All settled',
};

export default function TripDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = typeof id === 'string' ? id : '';
  const user = useAuthStore((state) => state.user);
  const youId = user?.id ?? '';
  const query = useTripQuery(tripId, youId);
  const deleteTrip = useTripStore((state) => state.deleteTrip);
  const deleteExpense = useTripStore((state) => state.deleteExpense);
  const addSettlement = useTripStore((state) => state.addSettlement);
  const showToast = useUIStore((state) => state.showToast);

  const [tab, setTab] = useState<Tab>('expenses');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const detail = query.data;
  const grouped = useMemo(
    () => (detail ? groupExpensesByDate(detail.expenses) : []),
    [detail],
  );

  if (!user) return <Redirect href="/welcome" />;

  if (query.isLoading && !detail) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <Skeleton height={260} radius={0} />
        <View style={{ padding: 20, gap: 14 }}>
          <Skeleton height={122} radius={24} />
          <Skeleton height={44} radius={22} />
          <Skeleton height={280} radius={24} />
        </View>
      </View>
    );
  }

  if (!detail) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={{ paddingVertical: 12 }}>
          <ArrowLeft size={22} color={theme.colors.ink} />
        </Pressable>
        <EmptyState
          icon={ReceiptText}
          title="Trip not found"
          body="It may have been deleted, or the link is out of date."
          actionLabel="Back to trips"
          onAction={() => router.replace('/(tabs)/trips')}
        />
      </Screen>
    );
  }

  const { trip, summary } = detail;
  const cover = COVERS[trip.cover];
  const status = getTripStatus(trip, summary.settled, todayISO());
  const yourLabel = summary.settled
    ? 'All square'
    : summary.yourBalancePaise > 0
      ? 'You are owed'
      : 'You owe';
  const yourAmount = Math.abs(summary.yourBalancePaise);

  const shareTrip = async () => {
    const message = `${trip.name} · ${trip.destination}\n${formatDateRange(trip.startDate, trip.endDate)}\nTotal spent: ${formatMoney(summary.totalPaise)}\n${summary.settled ? 'All settled.' : summary.yourBalancePaise > 0 ? `You are owed ${formatMoney(summary.yourBalancePaise)}.` : `You owe ${formatMoney(Math.abs(summary.yourBalancePaise))}.`}\n\nTracked with Splitie.`;
    try {
      await Share.share({ message, title: trip.name });
    } catch {
      await Clipboard.setStringAsync(message);
      showToast('Trip summary copied', { description: 'Paste it in the group chat.' });
    }
  };

  const confirmDeleteTrip = () => {
    const run = () => {
      deleteTrip(trip.id);
      setMoreOpen(false);
      router.replace('/(tabs)/trips');
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm(`Delete ${trip.name}? Every expense and settlement in it will go too.`)) run();
      return;
    }
    Alert.alert('Delete this trip?', 'Every expense and settlement in it will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete trip', style: 'destructive', onPress: run },
    ]);
  };

  const confirmDeleteExpense = () => {
    if (!selectedExpense) return;
    const run = () => {
      deleteExpense(selectedExpense.id);
      setSelectedExpense(null);
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm(`Delete ${selectedExpense.title}?`)) run();
      return;
    }
    Alert.alert('Delete this expense?', 'The balances will update immediately.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  const remind = async (transfer: SuggestedTransfer) => {
    const owesYou = transfer.to.id === youId;
    await createSettleReminder({
      title: owesYou
        ? `${transfer.from.name} owes you ${formatMoney(transfer.amountPaise)}`
        : `You owe ${transfer.to.name} ${formatMoney(transfer.amountPaise)}`,
      body: `${trip.name} · settle when you get a moment`,
      amountPaise: transfer.amountPaise,
      tripId: trip.id,
      fromMemberId: transfer.from.id,
      toMemberId: transfer.to.id,
    });
    hapticSuccess();
  };

  const markPaid = (transfer: SuggestedTransfer) => {
    addSettlement({
      tripId: trip.id,
      fromMemberId: transfer.from.id,
      toMemberId: transfer.to.id,
      amountPaise: transfer.amountPaise,
      date: todayISO(),
      note: 'Marked as paid in Splitie',
    });
    hapticSuccess();
  };

  const expenseCategory = selectedExpense ? TRIP_CATEGORY_MAP[selectedExpense.category] : null;
  const selectedPayer = selectedExpense
    ? trip.members.find((member) => member.id === selectedExpense.paidBy)
    : null;

  return (
    <>
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 118 + insets.bottom }}
        >
          <LinearGradient
            colors={cover.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cover, { paddingTop: insets.top + 8 }]}
          >
            <View style={styles.coverTop}>
              <Pressable
                accessibilityLabel="Go back"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/trips'))}
                style={styles.coverButton}
              >
                <ArrowLeft size={20} color={cover.ink} />
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable accessibilityLabel="Share trip summary" onPress={shareTrip} style={styles.coverButton}>
                  <Share2 size={18} color={cover.ink} />
                </Pressable>
                <Pressable accessibilityLabel="More trip options" onPress={() => setMoreOpen(true)} style={styles.coverButton}>
                  <EllipsisVertical size={19} color={cover.ink} />
                </Pressable>
              </View>
            </View>

            <View style={styles.coverBody}>
              <View style={styles.coverMetaRow}>
                <View style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.45)' }]}>
                  <View style={[styles.statusDot, { backgroundColor: cover.ink }]} />
                  <Text style={{ fontFamily: theme.fonts.bold, fontSize: 10.5, color: cover.ink }}>
                    {STATUS_LABEL[status]}
                  </Text>
                </View>
                <Text style={{ fontSize: 44 }}>{trip.emoji}</Text>
              </View>
              <Text
                style={{
                  fontFamily: theme.fonts.displayXBold,
                  fontSize: 34,
                  lineHeight: 38,
                  letterSpacing: -1.4,
                  color: cover.ink,
                  marginTop: 8,
                }}
              >
                {trip.name}
              </Text>
              <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 12, color: cover.ink, opacity: 0.68, marginTop: 2 }}>
                {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)}
              </Text>

              <View style={styles.coverFooter}>
                <AvatarStack
                  members={trip.members}
                  size={30}
                  max={5}
                  ringColor={cover.gradient[1]}
                />
                <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 11, color: cover.ink, opacity: 0.7 }}>
                  {trip.members.length} people · {summary.dayCount} {summary.dayCount === 1 ? 'day' : 'days'}
                </Text>
              </View>

              {trip.budgetPaise ? (
                <View style={{ marginTop: 14 }}>
                  <View style={styles.budgetRow}>
                    <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 10.5, color: cover.ink, opacity: 0.65 }}>
                      {Math.round(summary.budgetProgress * 100)}% of {formatMoney(trip.budgetPaise)} budget
                    </Text>
                    <Text style={{ fontFamily: theme.fonts.bold, fontSize: 10.5, color: cover.ink }}>
                      {formatMoney(summary.totalPaise)}
                    </Text>
                  </View>
                  <ProgressBar
                    progress={summary.budgetProgress}
                    height={5}
                    color={cover.ink}
                    trackColor="rgba(255,255,255,0.32)"
                    style={{ marginTop: 5 }}
                  />
                </View>
              ) : null}
            </View>
            <Text style={styles.watermark} pointerEvents="none">
              {trip.emoji}
            </Text>
          </LinearGradient>

          <View style={[styles.body, { marginTop: -26 }]}>
            <Card style={{ padding: 17 }} shadow>
              <View style={styles.balanceTop}>
                <View>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle }}>
                    Your balance
                  </Text>
                  <Text
                    style={{
                      fontFamily: theme.fonts.display,
                      fontSize: 28,
                      letterSpacing: -0.9,
                      marginTop: 1,
                      color: summary.settled
                        ? theme.colors.positive
                        : summary.yourBalancePaise >= 0
                          ? theme.colors.ink
                          : theme.colors.negative,
                    }}
                  >
                    {summary.settled ? 'All settled' : `${yourLabel} ${formatMoney(yourAmount)}`}
                  </Text>
                </View>
                <Button
                  label={summary.settled ? 'Add expense' : 'Settle up'}
                  variant={summary.settled ? 'secondary' : 'dark'}
                  size="sm"
                  onPress={() =>
                    summary.settled
                      ? router.push(`/trip/${trip.id}/add-expense`)
                      : router.push(`/trip/${trip.id}/settle`)
                  }
                />
              </View>

              <View style={[styles.balanceStats, { borderTopColor: theme.colors.line }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statLabel}>Total spent</Text>
                  <Text style={styles.statValue}>{formatMoney(summary.totalPaise)}</Text>
                </View>
                <View style={[styles.statCell, { borderLeftColor: theme.colors.line }]}>
                  <Text style={styles.statLabel}>Your share</Text>
                  <Text style={styles.statValue}>{formatMoney(summary.yourSharePaise)}</Text>
                </View>
                <View style={[styles.statCell, { borderLeftColor: theme.colors.line }]}>
                  <Text style={styles.statLabel}>Per day</Text>
                  <Text style={styles.statValue}>{formatMoney(summary.perDayPaise)}</Text>
                </View>
              </View>
            </Card>

            <SegmentedControl
              options={[
                { value: 'expenses', label: `Expenses (${detail.expenses.length})` },
                { value: 'balances', label: `Balances (${trip.members.length})` },
              ]}
              value={tab}
              onChange={setTab}
              style={{ marginTop: 18 }}
            />

            {tab === 'expenses' ? (
              <View style={{ marginTop: 18 }}>
                {grouped.length > 0 ? (
                  <View style={{ gap: 16 }}>
                    {grouped.map((group) => (
                      <View key={group.date}>
                        <Text style={styles.dayLabel}>{formatDayLabel(group.date)}</Text>
                        <Card padding={16} style={{ paddingVertical: 2 }}>
                          {group.data.map((expense, index) => (
                            <ExpenseRow
                              key={expense.id}
                              expense={expense}
                              trip={trip}
                              youId={youId}
                              last={index === group.data.length - 1}
                              onPress={() => {
                                hapticTap();
                                setSelectedExpense(expense);
                              }}
                            />
                          ))}
                        </Card>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Card padding={8}>
                    <EmptyState
                      icon={ReceiptText}
                      title="No expenses yet"
                      body="Add the first one and Splitie will work out who owes whom."
                      actionLabel="Add an expense"
                      onAction={() => router.push(`/trip/${trip.id}/add-expense`)}
                    />
                  </Card>
                )}
              </View>
            ) : (
              <View style={{ marginTop: 18, gap: 20 }}>
                <View>
                  <SectionHeader title="Transfers to clear" subtitle={`${summary.transfers.length} ${summary.transfers.length === 1 ? 'transfer' : 'transfers'} left`} />
                  <View style={{ gap: 10, marginTop: 10 }}>
                    {summary.transfers.length > 0 ? (
                      summary.transfers.map((transfer) => {
                        const owesYou = transfer.to.id === youId;
                        const youOwe = transfer.from.id === youId;
                        return (
                          <Card key={`${transfer.from.id}-${transfer.to.id}`} padding={14}>
                            <View style={styles.transferTop}>
                              <View style={styles.transferPeople}>
                                <Avatar name={transfer.from.name} color={transfer.from.color} size={34} />
                                <ArrowRight size={14} color={theme.colors.inkSubtle} />
                                <Avatar name={transfer.to.name} color={transfer.to.color} size={34} />
                              </View>
                              <Text style={{ fontFamily: theme.fonts.display, fontSize: 19, letterSpacing: -0.4 }}>
                                {formatMoney(transfer.amountPaise)}
                              </Text>
                            </View>
                            <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.inkSubtle, marginTop: 7 }}>
                              {owesYou
                                ? `${transfer.from.name.split(' ')[0]} pays you`
                                : youOwe
                                  ? `You pay ${transfer.to.name.split(' ')[0]}`
                                  : `${transfer.from.name.split(' ')[0]} pays ${transfer.to.name.split(' ')[0]}`}
                            </Text>
                            <View style={styles.transferActions}>
                              <Pressable
                                onPress={() => (youOwe ? router.push(`/trip/${trip.id}/settle`) : remind(transfer))}
                                style={[styles.smallAction, { backgroundColor: theme.colors.limeSoft }]}
                              >
                                <BellRing size={13} color={theme.colors.limeDeep} />
                                <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11, color: theme.colors.limeDeep }}>
                                  {youOwe ? 'Open settle up' : 'Remind'}
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => markPaid(transfer)}
                                style={[styles.smallAction, { backgroundColor: theme.colors.surfaceAlt }]}
                              >
                                <Check size={13} color={theme.colors.inkMuted} />
                                <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11, color: theme.colors.inkMuted }}>
                                  Mark paid
                                </Text>
                              </Pressable>
                            </View>
                          </Card>
                        );
                      })
                    ) : (
                      <Card padding={8}>
                        <EmptyState
                          compact
                          icon={Check}
                          title="Everyone is square"
                          body="No transfers left on this trip. Enjoy the memories."
                        />
                      </Card>
                    )}
                  </View>
                </View>

                <View>
                  <SectionHeader title="Member balances" subtitle="Paid versus their share" icon={Users} />
                  <Card padding={16} style={{ paddingVertical: 2, marginTop: 10 }}>
                    {summary.balances.map((balance, index) => (
                      <View
                        key={balance.member.id}
                        style={[
                          styles.memberRow,
                          index < summary.balances.length - 1 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: theme.colors.line,
                          },
                        ]}
                      >
                        <Avatar name={balance.member.name} color={balance.member.color} size={36} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 13 }}>
                            {balance.member.name}
                            {balance.member.id === youId ? ' (you)' : ''}
                          </Text>
                          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle, marginTop: 1 }}>
                            Paid {formatMoney(balance.paidPaise)} · share {formatMoney(balance.sharePaise)}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontFamily: theme.fonts.bold,
                            fontSize: 12.5,
                            color:
                              Math.abs(balance.balancePaise) <= 1
                                ? theme.colors.inkSubtle
                                : balance.balancePaise > 0
                                  ? theme.colors.positive
                                  : theme.colors.negative,
                          }}
                        >
                          {Math.abs(balance.balancePaise) <= 1
                            ? 'Settled'
                            : `${balance.balancePaise > 0 ? 'gets' : 'owes'} ${formatMoney(Math.abs(balance.balancePaise))}`}
                        </Text>
                      </View>
                    ))}
                  </Card>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <View
          style={[
            styles.floatingFooter,
            {
              bottom: Math.max(insets.bottom, 12) + 10,
              backgroundColor: theme.colors.bgElevated,
              borderColor: theme.colors.line,
            },
            theme.shadows.float,
          ]}
        >
          <Button
            label="Add expense"
            variant="dark"
            size="md"
            icon={Plus}
            style={{ flex: 1 }}
            onPress={() => router.push(`/trip/${trip.id}/add-expense`)}
          />
          <Button
            label={summary.settled ? 'All settled' : 'Settle up'}
            variant="secondary"
            size="md"
            disabled={summary.settled}
            style={{ flex: 1 }}
            onPress={() => router.push(`/trip/${trip.id}/settle`)}
          />
        </View>
      </View>

      <Sheet
        visible={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        title={selectedExpense?.title ?? 'Expense'}
        subtitle={
          selectedExpense
            ? `${expenseCategory?.label ?? 'Other'} · ${formatDate(selectedExpense.date, 'medium')}`
            : undefined
        }
        footer={
          <Button
            label="Delete expense"
            variant="danger"
            size="md"
            fullWidth
            icon={Trash2}
            onPress={confirmDeleteExpense}
          />
        }
      >
        {selectedExpense ? (
          <View>
            <Text
              style={{
                fontFamily: theme.fonts.display,
                fontSize: 32,
                letterSpacing: -1,
                marginBottom: 4,
              }}
            >
              {formatMoney(selectedExpense.amountPaise)}
            </Text>
            <Text style={{ fontFamily: theme.fonts.medium, fontSize: 12, color: theme.colors.inkSubtle }}>
              Paid by {selectedPayer?.name ?? 'someone'} · split {selectedExpense.splitType}
            </Text>

            <View style={[styles.splitDivider, { borderTopColor: theme.colors.line }]} />

            <View style={{ gap: 9 }}>
              {selectedExpense.splits.map((split) => {
                const member = trip.members.find((item) => item.id === split.memberId);
                if (!member) return null;
                return (
                  <View key={split.memberId} style={styles.splitRow}>
                    <Avatar name={member.name} color={member.color} size={28} />
                    <Text style={{ flex: 1, fontFamily: theme.fonts.semibold, fontSize: 12.5 }}>
                      {member.name}
                      {member.id === youId ? ' (you)' : ''}
                    </Text>
                    <Text style={{ fontFamily: theme.fonts.bold, fontSize: 12.5 }}>
                      {formatMoney(split.amountPaise)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {selectedExpense.note ? (
              <View style={[styles.noteBox, { backgroundColor: theme.colors.surfaceAlt }]}>
                <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, lineHeight: 17, color: theme.colors.inkMuted }}>
                  {selectedExpense.note}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Sheet>

      <Sheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Trip options"
        subtitle={trip.name}
      >
        <Pressable
          onPress={() => {
            setMoreOpen(false);
            shareTrip();
          }}
          style={[styles.optionRow, { borderColor: theme.colors.line }]}
        >
          <Share2 size={19} color={theme.colors.inkMuted} />
          <Text style={{ flex: 1, fontFamily: theme.fonts.semibold, fontSize: 14 }}>Share trip summary</Text>
          <ArrowRight size={16} color={theme.colors.inkSubtle} />
        </Pressable>
        <Pressable
          onPress={confirmDeleteTrip}
          style={[styles.optionRow, { borderColor: theme.colors.line }]}
        >
          <Trash2 size={19} color={theme.colors.negative} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 14, color: theme.colors.negative }}>
              Delete trip
            </Text>
            <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.inkSubtle, marginTop: 1 }}>
              Removes every expense and settlement in it.
            </Text>
          </View>
        </Pressable>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  cover: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },
  coverTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  coverButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBody: { marginTop: 26 },
  coverMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 25,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  coverFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  watermark: {
    position: 'absolute',
    right: 10,
    bottom: 24,
    fontSize: 112,
    opacity: 0.08,
  },
  body: { paddingHorizontal: 20 },
  balanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  balanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    paddingTop: 12,
  },
  statLabel: { fontFamily: 'Manrope_500Medium', fontSize: 9.5, opacity: 0.5 },
  statValue: { fontFamily: 'Manrope_700Bold', fontSize: 13, marginTop: 2 },
  statCell: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 14 },
  dayLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#8B9180',
    marginBottom: 6,
    marginLeft: 2,
  },
  transferTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  transferPeople: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  transferActions: { flexDirection: 'row', gap: 8, marginTop: 11 },
  smallAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 11,
    height: 30,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  floatingFooter: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 9,
    borderWidth: 1,
    borderRadius: 24,
    padding: 8,
  },
  splitDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: 16 },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  noteBox: { borderRadius: 14, padding: 12, marginTop: 16 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
});
