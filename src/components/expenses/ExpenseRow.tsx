import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Text } from '@/components/ui/Text';
import { formatDate } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';
import type { Expense, Member, Trip } from '@/types/models';

type ExpenseRowProps = {
  expense: Expense;
  trip: Trip;
  youId: string;
  onPress?: () => void;
  last?: boolean;
};

export function ExpenseRow({ expense, trip, youId, onPress, last }: ExpenseRowProps) {
  const theme = useTheme();
  const payer = trip.members.find((member) => member.id === expense.paidBy);
  const yourShare = expense.splits.find((split) => split.memberId === youId)?.amountPaise ?? 0;
  const youPaid = expense.paidBy === youId;
  const payerLabel = youPaid ? 'You paid' : `${payer?.name.split(' ')[0] ?? 'Someone'} paid`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (!onPress) return;
        hapticTap();
        onPress();
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.base, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.line }]}>
        <CategoryIcon categoryId={expense.category} size={40} />
        <View style={styles.text}>
          <Text numberOfLines={1} style={{ fontFamily: theme.fonts.semibold, fontSize: 14 }}>
            {expense.title}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.inkSubtle, marginTop: 2 }}>
            {payerLabel} · {formatDate(expense.date, 'short')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="numericTiny" style={{ fontVariant: ['tabular-nums'] }}>
            {formatMoney(expense.amountPaise)}
          </Text>
          <Text
            style={{
              fontFamily: theme.fonts.medium,
              fontSize: 10.5,
              color: youPaid ? theme.colors.positive : theme.colors.inkSubtle,
              marginTop: 2,
            }}
          >
            {youPaid ? `you lent ${formatMoney(expense.amountPaise - yourShare)}` : `your share ${formatMoney(yourShare)}`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

type PersonalExpenseRowProps = {
  id: string;
  title: string;
  amountPaise: number;
  category: string;
  date: string;
  recurrence?: string;
  onPress?: () => void;
  last?: boolean;
};

export function PersonalExpenseRow({
  title,
  amountPaise,
  category,
  date,
  recurrence,
  onPress,
  last,
}: PersonalExpenseRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.base, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.line }]}>
        <CategoryIcon categoryId={category as never} type="personal" size={40} />
        <View style={styles.text}>
          <Text numberOfLines={1} style={{ fontFamily: theme.fonts.semibold, fontSize: 14 }}>
            {title}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.inkSubtle, marginTop: 2 }}>
            {formatDate(date, 'short')}
            {recurrence && recurrence !== 'none' ? ` · ${recurrence}` : ''}
          </Text>
        </View>
        <Text variant="numericTiny" style={{ fontVariant: ['tabular-nums'] }}>
          {formatMoney(amountPaise)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 64 },
  text: { flex: 1 },
});
