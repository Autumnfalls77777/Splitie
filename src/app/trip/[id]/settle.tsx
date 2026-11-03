import { StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, BellRing, Check, Sparkles } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';

import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/features/auth/auth.store';
import { createSettleReminder } from '@/features/reminders/reminder.service';
import { isYouMember } from '@/features/trips/identity';
import { useTripQuery } from '@/features/trips/queries';
import { useTripStore } from '@/features/trips/trips.store';
import { useUIStore } from '@/features/settings/ui.store';
import { asCurrencyCode } from '@/lib/currency';
import { todayISO } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { hapticSuccess } from '@/lib/haptics';
import { useTheme } from '@/theme';

export default function SettleUpScreen() {
  const theme = useTheme();
  const router = useRouter();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = typeof id === 'string' ? id : '';
  const user = useAuthStore((state) => state.user);
  const youId = user?.id ?? '';
  const query = useTripQuery(tripId, youId);
  const addSettlement = useTripStore((state) => state.addSettlement);
  const showToast = useUIStore((state) => state.showToast);

  if (!user) return <Redirect href="/welcome" />;

  const detail = query.data;

  if (query.isLoading && !detail) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: 20, paddingTop: 70, gap: 14 }}>
        <Skeleton height={36} width={180} />
        <Skeleton height={150} radius={26} />
        <Skeleton height={160} radius={24} />
      </View>
    );
  }

  if (!detail) {
    return (
      <Screen>
        <Header title="Settle up" onBack={() => router.back()} />
        <EmptyState icon={Check} title="Trip not found" body="It may have been deleted." />
      </Screen>
    );
  }

  const { trip, summary } = detail;
  const currency = asCurrencyCode(trip.currency);
  const money = (paise: number) => formatMoney(paise, { currency });

  const markPaid = (transfer: (typeof summary.transfers)[number]) => {
    addSettlement({
      tripId: trip.id,
      fromMemberId: transfer.from.id,
      toMemberId: transfer.to.id,
      amountPaise: transfer.amountPaise,
      date: todayISO(),
      note: 'Settled via Splitie',
    });
    posthog?.capture('settlement_recorded', {
      amount_paise: transfer.amountPaise,
      settlement_count: 1,
    });
    hapticSuccess();
    showToast('Payment recorded', {
      description: `${transfer.from.name.split(' ')[0]} → ${transfer.to.name.split(' ')[0]} · ${money(transfer.amountPaise)}`,
    });
  };

  const markAll = () => {
    for (const transfer of summary.transfers) {
      addSettlement({
        tripId: trip.id,
        fromMemberId: transfer.from.id,
        toMemberId: transfer.to.id,
        amountPaise: transfer.amountPaise,
        date: todayISO(),
        note: 'Settled via Splitie',
      });
    }
    posthog?.capture('settlement_recorded', {
      settlement_count: summary.transfers.length,
      total_amount_paise: totalToClear,
    });
    hapticSuccess();
    showToast('Everything is settled', { description: 'All suggested transfers were recorded.' });
  };

  const remind = async (transfer: (typeof summary.transfers)[number]) => {
    const owesYou = isYouMember(transfer.to, youId);
    await createSettleReminder({
      title: owesYou
        ? `${transfer.from.name} owes you ${money(transfer.amountPaise)}`
        : `You owe ${transfer.to.name} ${money(transfer.amountPaise)}`,
      body: `${trip.name} · a gentle nudge, not a nag`,
      amountPaise: transfer.amountPaise,
      tripId: trip.id,
      fromMemberId: transfer.from.id,
      toMemberId: transfer.to.id,
    });
    posthog?.capture('settlement_reminder_created', {
      amount_paise: transfer.amountPaise,
      direction: owesYou ? 'owed_to_current_user' : 'owed_by_current_user',
    });
    hapticSuccess();
    showToast('Reminder saved', { description: 'It will appear in Notifications when it is due.' });
  };

  if (summary.transfers.length === 0) {
    return (
      <Screen topInset contentBottom={insets.bottom + 36}>
        <Header title="Settle up" subtitle={trip.name} onBack={() => router.back()} />
        <Card style={{ marginTop: 24 }} padding={12}>
          <EmptyState
            icon={Check}
            title="Everyone is square"
            body="There is nothing left to transfer on this trip. Go make another memory."
            actionLabel="Back to trip"
            onAction={() => router.replace(`/trip/${trip.id}`)}
          />
        </Card>
        <View style={[styles.tipCard, { backgroundColor: theme.colors.limeSoft }]}>
          <Sparkles size={17} color={theme.colors.limeDeep} />
          <Text style={{ flex: 1, fontFamily: theme.fonts.medium, fontSize: 11.5, lineHeight: 17, color: theme.colors.inkMuted }}>
            Splitie already found the shortest path to zero. No extra transfers, no leftover paise.
          </Text>
        </View>
      </Screen>
    );
  }

  const totalToClear = summary.transfers.reduce((sum, transfer) => sum + transfer.amountPaise, 0);

  return (
    <Screen topInset contentBottom={insets.bottom + 36}>
      <Header title="Settle up" subtitle={trip.name} onBack={() => router.back()} />

      <Card variant="ink" style={{ marginTop: 16 }} padding={20}>
        <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.inkInverse, opacity: 0.55 }}>
          Clear the trip with
        </Text>
        <Text
          style={{
            fontFamily: theme.fonts.display,
            fontSize: 32,
            letterSpacing: -1.1,
            color: theme.colors.inkInverse,
            marginTop: 2,
          }}
        >
          {summary.transfers.length} {summary.transfers.length === 1 ? 'transfer' : 'transfers'}
        </Text>
        <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.inkInverse, opacity: 0.55, marginTop: 3 }}>
          {money(totalToClear)} moving between {new Set(summary.transfers.flatMap((transfer) => [transfer.from.id, transfer.to.id])).size} people.
        </Text>
        <View style={[styles.heroRule, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Sparkles size={15} color={theme.colors.lime} />
          <Text style={{ flex: 1, fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkInverse, opacity: 0.6 }}>
            Fewest possible transfers, calculated from every expense.
          </Text>
        </View>
      </Card>

      <View style={{ gap: 12, marginTop: 20 }}>
        {summary.transfers.map((transfer) => {
          const owesYou = isYouMember(transfer.to, youId);
          const youOwe = isYouMember(transfer.from, youId);
          return (
            <Card key={`${transfer.from.id}-${transfer.to.id}`} padding={16}>
              <View style={styles.transferTop}>
                <View style={styles.people}>
                  <Avatar name={transfer.from.name} color={transfer.from.color} size={42} />
                  <View style={[styles.arrowBubble, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <ArrowRight size={14} color={theme.colors.inkMuted} />
                  </View>
                  <Avatar name={transfer.to.name} color={transfer.to.color} size={42} />
                </View>
                <Text style={{ fontFamily: theme.fonts.display, fontSize: 24, letterSpacing: -0.7 }}>
                  {money(transfer.amountPaise)}
                </Text>
              </View>

              <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 13, marginTop: 10 }}>
                {owesYou
                  ? `${transfer.from.name} pays you`
                  : youOwe
                    ? `You pay ${transfer.to.name}`
                    : `${transfer.from.name} pays ${transfer.to.name}`}
              </Text>
              <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.inkSubtle, marginTop: 2 }}>
                {owesYou ? 'One reminder and it is done.' : youOwe ? 'Mark it paid once you have transferred.' : 'A quiet nudge usually does it.'}
              </Text>

              <View style={styles.actions}>
                <Button
                  label={youOwe ? 'Remind me' : 'Remind'}
                  variant="secondary"
                  size="sm"
                  icon={BellRing}
                  style={{ flex: 1 }}
                  onPress={() => remind(transfer)}
                />
                <Button
                  label="Mark paid"
                  variant="dark"
                  size="sm"
                  icon={Check}
                  style={{ flex: 1 }}
                  onPress={() => markPaid(transfer)}
                />
              </View>
            </Card>
          );
        })}
      </View>

      {summary.transfers.length > 1 ? (
        <Button
          label="Mark all as paid"
          variant="primary"
          size="lg"
          fullWidth
          icon={Check}
          style={{ marginTop: 18 }}
          onPress={markAll}
        />
      ) : null}

      <View style={[styles.tipCard, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Text style={{ flex: 1, fontFamily: theme.fonts.medium, fontSize: 11.5, lineHeight: 17, color: theme.colors.inkSubtle }}>
          Marking a transfer as paid updates the trip balances immediately. It does not move real money, so settle however you normally do.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroRule: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  transferTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  people: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrowBubble: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 18, padding: 14, marginTop: 18 },
});
