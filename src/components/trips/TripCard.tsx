import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, MapPin } from 'lucide-react-native';

import { AvatarStack } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { COVERS } from '@/data/categories';
import { formatDateRange } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';
import type { TripWithSummary } from '@/features/trips/queries';
import type { TripStatus } from '@/features/trips/split';

type TripCardProps = {
  item: TripWithSummary;
  onPress: () => void;
  variant?: 'full' | 'compact';
};

const STATUS_LABEL: Record<TripStatus, string> = {
  active: 'Active',
  upcoming: 'Upcoming',
  past: 'Past',
  settled: 'Settled',
};

export function TripCard({ item, onPress, variant = 'full' }: TripCardProps) {
  const theme = useTheme();
  const { trip, summary, status, expenseCount } = item;
  const cover = COVERS[trip.cover];
  const compact = variant === 'compact';

  const balanceLabel = summary.settled
    ? 'All settled'
    : summary.yourBalancePaise >= 0
      ? `You're owed ${formatMoney(summary.yourBalancePaise)}`
      : `You owe ${formatMoney(Math.abs(summary.yourBalancePaise))}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trip.name}, ${balanceLabel}`}
      onPress={() => {
        hapticTap();
        onPress();
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1, width: compact ? 300 : '100%' }]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.line,
            borderRadius: theme.radius.xl,
          },
          theme.shadows.card,
        ]}
      >
        <LinearGradient
          colors={cover.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.cover, { height: compact ? 118 : 136 }]}
        >
          <View style={styles.coverTop}>
            <View style={styles.status}>
              <Badge label={STATUS_LABEL[status]} tone={status === 'settled' ? 'positive' : status === 'active' ? 'lime' : 'neutral'} dot />
            </View>
            <Text style={{ fontSize: compact ? 30 : 38 }}>{trip.emoji}</Text>
          </View>
          <View style={styles.coverBottom}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: theme.fonts.display,
                fontSize: compact ? 22 : 26,
                letterSpacing: -0.7,
                color: cover.ink,
              }}
            >
              {trip.name}
            </Text>
            <View style={styles.metaRow}>
              <MapPin size={11} color={cover.ink} opacity={0.65} />
              <Text
                numberOfLines={1}
                style={{ fontFamily: theme.fonts.semibold, fontSize: 11.5, color: cover.ink, opacity: 0.72 }}
              >
                {trip.destination}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.row}>
            <View>
              <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle }}>
                Total spent
              </Text>
              <Text variant="numericTiny" style={{ marginTop: 1 }}>
                {formatMoney(summary.totalPaise)}
              </Text>
            </View>
            <AvatarStack members={trip.members} size={26} max={4} ringColor={theme.colors.surface} />
          </View>

          {trip.budgetPaise ? (
            <View style={{ marginTop: 12 }}>
              <ProgressBar
                progress={summary.budgetProgress}
                height={5}
                color={summary.budgetProgress > 1 ? theme.colors.negative : theme.colors.limeDeep}
              />
              <View style={[styles.row, { marginTop: 5 }]}>
                <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10, color: theme.colors.inkSubtle }}>
                  {Math.round(summary.budgetProgress * 100)}% of budget
                </Text>
                <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 10, color: theme.colors.inkSubtle }}>
                  {formatMoney(trip.budgetPaise)} budget
                </Text>
              </View>
            </View>
          ) : null}

          <View style={[styles.row, { marginTop: 12 }]}>
            <View style={styles.dateRow}>
              <CalendarDays size={12} color={theme.colors.inkSubtle} />
              <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11, color: theme.colors.inkSubtle }}>
                {formatDateRange(trip.startDate, trip.endDate)}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: theme.fonts.bold,
                fontSize: 12,
                color: summary.settled
                  ? theme.colors.positive
                  : summary.yourBalancePaise >= 0
                    ? theme.colors.limeDeep
                    : theme.colors.negative,
              }}
            >
              {balanceLabel}
            </Text>
          </View>
          {!compact ? (
            <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle, marginTop: 6 }}>
              {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'} · {trip.members.length} people
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden' },
  cover: { padding: 16, justifyContent: 'space-between' },
  coverTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  status: { opacity: 0.95 },
  coverBottom: {},
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  body: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
