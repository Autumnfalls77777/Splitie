import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronDown, Users } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';

import { FormScreen } from '@/components/layout/FormScreen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { TRIP_CATEGORIES } from '@/data/categories';
import { useAuthStore } from '@/features/auth/auth.store';
import { findYouMember, isYouMember } from '@/features/trips/identity';
import { useTripQuery } from '@/features/trips/queries';
import { useTripStore } from '@/features/trips/trips.store';
import {
  equalSplits,
  exactSplits,
  percentSplits,
  weightedSplits,
} from '@/features/trips/split';
import { useUIStore } from '@/features/settings/ui.store';
import { asCurrencyCode } from '@/lib/currency';
import { todayISO } from '@/lib/date';
import { allocateEvenly, currencySymbol, formatMoney, parseAmount } from '@/lib/money';
import { hapticSelect, hapticSuccess, hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';
import type { SplitType, TripCategoryId } from '@/types/models';

type SplitTypeValue = SplitType;

const SPLIT_OPTIONS: { value: SplitTypeValue; label: string }[] = [
  { value: 'equal', label: 'Equally' },
  { value: 'exact', label: 'Exact' },
  { value: 'percent', label: '%' },
  { value: 'shares', label: 'Shares' },
];

function SplitInput({
  value,
  onChange,
  prefix,
  suffix,
}: {
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.splitInput,
        { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.line },
      ]}
    >
      {prefix ? <Text style={styles.splitAffix}>{prefix}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        selectionColor={theme.colors.limeDeep}
        style={{
          flex: 1,
          padding: 0,
          fontFamily: theme.fonts.semibold,
          fontSize: 12.5,
          color: theme.colors.ink,
          textAlign: 'right',
        }}
      />
      {suffix ? <Text style={styles.splitAffix}>{suffix}</Text> : null}
    </View>
  );
}

export default function AddExpenseScreen() {
  const theme = useTheme();
  const router = useRouter();
  const posthog = usePostHog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = typeof id === 'string' ? id : '';
  const user = useAuthStore((state) => state.user);
  const youId = user?.id ?? '';
  const query = useTripQuery(tripId, youId);
  const addExpense = useTripStore((state) => state.addExpense);
  const showToast = useUIStore((state) => state.showToast);

  const [title, setTitle] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState<TripCategoryId>('food');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [splitType, setSplitType] = useState<SplitTypeValue>('equal');
  const [participants, setParticipants] = useState<string[]>([]);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  const trip = query.data?.trip;
  const youMember = trip ? findYouMember(trip.members, youId) : undefined;
  const youMemberId = youMember?.id ?? '';
  const currency = asCurrencyCode(trip?.currency);
  const money = (paise: number) => formatMoney(paise, { currency });
  const symbol = currencySymbol(currency);

  useEffect(() => {
    if (trip && !initialized.current) {
      initialized.current = true;
      setParticipants(trip.members.map((member) => member.id));
      setPaidBy(youMemberId || trip.members[0]?.id || '');
    }
  }, [trip, youMemberId]);

  const amountPaise = parseAmount(amountInput);
  const participantKey = participants.join('|');

  useEffect(() => {
    if (splitType === 'equal' || participants.length === 0) {
      setCustom({});
      return;
    }
    if (splitType === 'exact') {
      const parts = allocateEvenly(amountPaise, participants.length);
      setCustom(
        Object.fromEntries(
          participants.map((memberId, index) => [memberId, (parts[index] / 100).toFixed(2)]),
        ),
      );
      return;
    }
    if (splitType === 'percent') {
      setCustom(
        Object.fromEntries(
          participants.map((memberId) => [memberId, (100 / participants.length).toFixed(2)]),
        ),
      );
      return;
    }
    setCustom(Object.fromEntries(participants.map((memberId) => [memberId, '1'])));
  }, [splitType, amountPaise, participantKey, participants.length]);

  const selectedMembers = useMemo(
    () => (trip ? trip.members.filter((member) => participants.includes(member.id)) : []),
    [participants, trip],
  );

  const splits = useMemo(() => {
    if (!trip || selectedMembers.length === 0) return [];
    if (splitType === 'equal') {
      return equalSplits(amountPaise, selectedMembers.map((member) => member.id));
    }
    if (splitType === 'exact') {
      return exactSplits(
        selectedMembers.map((member) => ({
          memberId: member.id,
          amountPaise: parseAmount(custom[member.id] ?? '0'),
        })),
      );
    }
    if (splitType === 'percent') {
      return percentSplits(
        amountPaise,
        selectedMembers.map((member) => ({
          memberId: member.id,
          percent: Number.parseFloat(custom[member.id] ?? '0') || 0,
        })),
      );
    }
    return weightedSplits(
      amountPaise,
      selectedMembers.map((member) => ({
        memberId: member.id,
        weight: Number.parseFloat(custom[member.id] ?? '0') || 0,
      })),
    );
  }, [amountPaise, custom, selectedMembers, splitType, trip]);

  if (!user) return <Redirect href="/welcome" />;

  if (query.isLoading && !trip) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: 20, paddingTop: 70 }}>
        <Text variant="h2">Loading trip…</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <Screen>
        <EmptyState icon={Users} title="Trip not found" body="It may have been deleted." />
      </Screen>
    );
  }

  const yourShare = splits.find((split) => split.memberId === youMemberId)?.amountPaise ?? 0;
  const youPaid = paidBy === youMemberId;
  const exactTotal = selectedMembers.reduce(
    (total, member) => total + parseAmount(custom[member.id] ?? '0'),
    0,
  );
  const exactDiff = amountPaise - exactTotal;
  const percentTotal = selectedMembers.reduce(
    (total, member) => total + (Number.parseFloat(custom[member.id] ?? '0') || 0),
    0,
  );
  const shareTotal = selectedMembers.reduce(
    (total, member) => total + (Number.parseFloat(custom[member.id] ?? '0') || 0),
    0,
  );

  const toggleParticipant = (memberId: string) => {
    hapticSelect();
    setParticipants((current) =>
      current.includes(memberId)
        ? current.filter((idValue) => idValue !== memberId)
        : [...current, memberId],
    );
  };

  const save = () => {
    setError(null);
    if (amountPaise <= 0) {
      setError('Enter an amount above zero.');
      return;
    }
    if (title.trim().length < 2) {
      setError('Give the expense a short title.');
      return;
    }
    if (participants.length === 0) {
      setError('Pick at least one person to split with.');
      return;
    }
    if (splitType === 'exact' && Math.abs(exactDiff) > 1) {
      setError(
        exactDiff > 0
          ? `Assign ${money(exactDiff)} more before saving.`
          : `You have assigned ${money(Math.abs(exactDiff))} too much.`,
      );
      return;
    }
    if (splitType === 'percent' && Math.abs(percentTotal - 100) > 0.5) {
      setError(`Percentages should add up to 100. Right now they total ${percentTotal.toFixed(1)}%.`);
      return;
    }
    if (splitType === 'shares' && shareTotal <= 0) {
      setError('Give at least one person a share above zero.');
      return;
    }

    addExpense({
      tripId: trip.id,
      title: title.trim(),
      amountPaise,
      category,
      paidBy,
      date,
      splitType,
      splits,
      note: note.trim() || undefined,
    });
    posthog?.capture('trip_expense_added', {
      amount_paise: amountPaise,
      category,
      participant_count: participants.length,
      paid_by_current_user: youPaid,
      split_type: splitType,
    });
    hapticSuccess();
    showToast('Expense added', { description: `${money(amountPaise)} split between ${participants.length}.` });
    router.back();
  };

  return (
    <FormScreen
      title="Add expense"
      subtitle={trip.name}
      footer={
        <Button
          label="Save expense"
          variant="dark"
          size="lg"
          fullWidth
          onPress={save}
        />
      }
    >
      <View
        style={[
          styles.amountCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.line },
        ]}
      >
        <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 11.5, color: theme.colors.inkSubtle }}>
          Amount
        </Text>
        <View style={styles.amountRow}>
          <Text style={{ fontFamily: theme.fonts.display, fontSize: 36, letterSpacing: -1.4 }}>{symbol}</Text>
          <TextInput
            value={amountInput}
            onChangeText={(value) => {
              if (/^\d*\.?\d{0,2}$/.test(value)) setAmountInput(value);
            }}
            placeholder="0"
            placeholderTextColor={theme.colors.inkSubtle}
            keyboardType="decimal-pad"
            selectionColor={theme.colors.limeDeep}
            style={[
              styles.amountInput,
              { fontFamily: theme.fonts.displayXBold, color: theme.colors.ink },
            ]}
          />
        </View>
        <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.inkSubtle }}>
          {youPaid
            ? `You paid · your share ${money(yourShare)}`
            : `${trip.members.find((member) => member.id === paidBy)?.name ?? 'Someone'} paid · your share ${money(yourShare)}`}
        </Text>
      </View>

      <View style={{ gap: 15, marginTop: 18 }}>
        <Input
          label="What was it?"
          placeholder="Beach shack dinner"
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
        />
      </View>

      <Text style={styles.sectionLabel}>Category</Text>
      <View style={styles.categoryGrid}>
        {TRIP_CATEGORIES.map((item) => {
          const selected = category === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                hapticSelect();
                setCategory(item.id);
              }}
              style={[
                styles.categoryCell,
                {
                  backgroundColor: selected ? theme.colors.limeSoft : theme.colors.surface,
                  borderColor: selected ? theme.colors.lime : theme.colors.line,
                },
              ]}
            >
              <CategoryIcon categoryId={item.id} size={34} iconSize={16} />
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: selected ? theme.fonts.bold : theme.fonts.medium,
                  fontSize: 10,
                  marginTop: 5,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Paid by</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingVertical: 2 }}>
        {trip.members.map((member) => {
          const selected = paidBy === member.id;
          return (
            <Pressable
              key={member.id}
              onPress={() => {
                hapticSelect();
                setPaidBy(member.id);
              }}
              style={[
                styles.payerCard,
                {
                  backgroundColor: selected ? theme.colors.limeSoft : theme.colors.surface,
                  borderColor: selected ? theme.colors.lime : theme.colors.line,
                },
              ]}
            >
              <Avatar name={member.name} color={member.color} size={38} />
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: selected ? theme.fonts.bold : theme.fonts.medium,
                  fontSize: 10.5,
                  marginTop: 5,
                  maxWidth: 64,
                }}
              >
                {isYouMember(member, youId) ? 'You' : member.name.split(' ')[0]}
              </Text>
              {selected ? (
                <View style={[styles.selectedBadge, { backgroundColor: theme.colors.lime }]}>
                  <Check size={10} color={theme.colors.onLime} strokeWidth={3} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionLabel}>Split</Text>
      <SegmentedControl options={SPLIT_OPTIONS} value={splitType} onChange={setSplitType} height={42} />

      <View style={styles.splitHeader}>
        <Text style={{ fontFamily: theme.fonts.bold, fontSize: 12.5 }}>
          Between {participants.length} {participants.length === 1 ? 'person' : 'people'}
        </Text>
        <Pressable
          onPress={() => {
            hapticTap();
            setParticipants(
              participants.length === trip.members.length ? [] : trip.members.map((member) => member.id),
            );
          }}
        >
          <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11.5, color: theme.colors.limeDeep }}>
            {participants.length === trip.members.length ? 'Clear all' : 'Select all'}
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: 2, marginTop: 6 }}>
        {trip.members.map((member) => {
          const selected = participants.includes(member.id);
          const memberSplit = splits.find((split) => split.memberId === member.id)?.amountPaise ?? 0;
          return (
            <Pressable
              key={member.id}
              onPress={() => toggleParticipant(member.id)}
              style={[styles.memberRow, { borderBottomColor: theme.colors.line }]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: selected ? theme.colors.lime : 'transparent',
                    borderColor: selected ? theme.colors.lime : theme.colors.lineStrong,
                  },
                ]}
              >
                {selected ? <Check size={12} color={theme.colors.onLime} strokeWidth={3} /> : null}
              </View>
              <Avatar name={member.name} color={member.color} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 13 }}>
                  {member.name}
                  {isYouMember(member, youId) ? ' (you)' : ''}
                </Text>
                {member.id === paidBy ? (
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 9.5, color: theme.colors.limeDeep }}>
                    paid the bill
                  </Text>
                ) : null}
              </View>

              {!selected ? (
                <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.inkSubtle }}>
                  Not in split
                </Text>
              ) : splitType === 'equal' ? (
                <Text style={{ fontFamily: theme.fonts.bold, fontSize: 12.5 }}>{money(memberSplit)}</Text>
              ) : splitType === 'exact' ? (
                <SplitInput
                  value={custom[member.id] ?? ''}
                  onChange={(value) => {
                    if (/^\d*\.?\d{0,2}$/.test(value)) {
                      setCustom((current) => ({ ...current, [member.id]: value }));
                    }
                  }}
                  prefix={symbol}
                />
              ) : splitType === 'percent' ? (
                <SplitInput
                  value={custom[member.id] ?? ''}
                  onChange={(value) => {
                    if (/^\d*\.?\d{0,2}$/.test(value)) {
                      setCustom((current) => ({ ...current, [member.id]: value }));
                    }
                  }}
                  suffix="%"
                />
              ) : (
                <SplitInput
                  value={custom[member.id] ?? ''}
                  onChange={(value) => {
                    if (/^\d*\.?\d{0,2}$/.test(value)) {
                      setCustom((current) => ({ ...current, [member.id]: value }));
                    }
                  }}
                  suffix="sh"
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {splitType === 'exact' ? (
        <Text
          style={{
            fontFamily: theme.fonts.semibold,
            fontSize: 11,
            color: Math.abs(exactDiff) <= 1 ? theme.colors.positive : theme.colors.negative,
            marginTop: 8,
            marginLeft: 3,
          }}
        >
          {Math.abs(exactDiff) <= 1
            ? 'Exact amounts add up.'
            : exactDiff > 0
              ? `${money(exactDiff)} left to assign.`
              : `${money(Math.abs(exactDiff))} over the total.`}
        </Text>
      ) : null}
      {splitType === 'percent' ? (
        <Text
          style={{
            fontFamily: theme.fonts.semibold,
            fontSize: 11,
            color: Math.abs(percentTotal - 100) <= 0.5 ? theme.colors.positive : theme.colors.negative,
            marginTop: 8,
            marginLeft: 3,
          }}
        >
          {percentTotal.toFixed(1)}% assigned{Math.abs(percentTotal - 100) <= 0.5 ? '' : ' · aim for 100%'}
        </Text>
      ) : null}
      {splitType === 'shares' ? (
        <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.inkSubtle, marginTop: 8, marginLeft: 3 }}>
          {shareTotal} {shareTotal === 1 ? 'share' : 'shares'} in total. Splitie handles the fractions.
        </Text>
      ) : null}

      <View style={{ gap: 15, marginTop: 18 }}>
        <DateField label="Date" value={date} onChange={setDate} />
        <Input
          label="Note (optional)"
          placeholder="Fish thali, extra prawns, zero regrets"
          value={note}
          onChangeText={setNote}
          multiline
          autoCapitalize="sentences"
        />
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.negativeSoft }]}>
          <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 12, color: theme.colors.negative }}>
            {error}
          </Text>
        </View>
      ) : null}

      <View style={[styles.preview, { backgroundColor: theme.colors.surfaceAlt }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11.5 }}>
            {youPaid ? `You lent ${money(Math.max(0, amountPaise - yourShare))}` : `Your share is ${money(yourShare)}`}
          </Text>
          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle, marginTop: 2 }}>
            {youPaid
              ? 'The rest comes back to you as people settle.'
              : `${trip.members.find((member) => member.id === paidBy)?.name ?? 'Someone'} fronted this one.`}
          </Text>
        </View>
        <ChevronDown size={16} color={theme.colors.inkSubtle} />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  amountCard: { borderWidth: 1, borderRadius: 22, padding: 16 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginVertical: 2 },
  amountInput: { flex: 1, padding: 0, fontSize: 42, lineHeight: 48, letterSpacing: -1.8 },
  sectionLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12.5,
    marginTop: 20,
    marginBottom: 9,
    marginLeft: 4,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCell: {
    width: '23%',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payerCard: {
    width: 76,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 9,
    alignItems: 'center',
    position: 'relative',
  },
  selectedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitInput: {
    width: 84,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
  },
  splitAffix: { fontFamily: 'Manrope_600SemiBold', fontSize: 10.5, opacity: 0.55 },
  errorBox: { borderRadius: 14, padding: 12, marginTop: 16 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, padding: 13, marginTop: 18 },
});
