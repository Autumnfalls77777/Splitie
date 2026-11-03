import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Banknote,
  CreditCard,
  Landmark,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';

import { FormScreen } from '@/components/layout/FormScreen';
import { Button } from '@/components/ui/Button';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { PERSONAL_CATEGORIES } from '@/data/categories';
import { usePersonalStore } from '@/features/personal/personal.store';
import { useUIStore } from '@/features/settings/ui.store';
import { todayISO } from '@/lib/date';
import { formatMoney, parseAmount } from '@/lib/money';
import { hapticSelect, hapticSuccess, hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';
import type { PaymentMethod, PersonalCategoryId, Recurrence } from '@/types/models';

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'netbanking', label: 'Bank', icon: Landmark },
];

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Once' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function AddPersonalExpenseScreen() {
  const theme = useTheme();
  const router = useRouter();
  const posthog = usePostHog();
  const addExpense = usePersonalStore((state) => state.addExpense);
  const showToast = useUIStore((state) => state.showToast);

  const [amountInput, setAmountInput] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PersonalCategoryId>('food');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [error, setError] = useState<string | null>(null);

  const amountPaise = parseAmount(amountInput);

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
    addExpense({
      title: title.trim(),
      amountPaise,
      category,
      date,
      note: note.trim() || undefined,
      recurrence,
      paymentMethod,
    });
    posthog?.capture('personal_expense_added', {
      amount_paise: amountPaise,
      category,
      payment_method: paymentMethod,
      recurrence,
    });
    hapticSuccess();
    showToast('Personal expense added', { description: formatMoney(amountPaise) });
    router.back();
  };

  return (
    <FormScreen
      title="Personal expense"
      subtitle="Just for you. Not part of any trip."
      footer={<Button label="Save expense" variant="dark" size="lg" fullWidth onPress={save} />}
    >
      <View
        style={[
          styles.amountCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.line },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 11.5, color: theme.colors.inkSubtle }}>
            Amount
          </Text>
          <Sparkles size={15} color={theme.colors.limeDeep} />
        </View>
        <View style={styles.amountRow}>
          <Text style={{ fontFamily: theme.fonts.display, fontSize: 36, letterSpacing: -1.4 }}>₹</Text>
          <TextInput
            value={amountInput}
            onChangeText={(value) => {
              if (/^\d*\.?\d{0,2}$/.test(value)) setAmountInput(value);
            }}
            placeholder="0"
            placeholderTextColor={theme.colors.inkSubtle}
            keyboardType="decimal-pad"
            selectionColor={theme.colors.limeDeep}
            style={[styles.amountInput, { fontFamily: theme.fonts.displayXBold, color: theme.colors.ink }]}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 7, marginTop: 6 }}>
          {[100, 250, 500, 1000].map((amount) => (
            <Pressable
              key={amount}
              onPress={() => {
                hapticTap();
                setAmountInput(String(amount));
              }}
              style={[styles.quickAmount, { backgroundColor: theme.colors.surfaceAlt }]}
            >
              <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 10.5 }}>₹{amount}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 15, marginTop: 18 }}>
        <Input
          label="What was it?"
          placeholder="Filter coffee and a samosa"
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
        />
      </View>

      <Text style={styles.sectionLabel}>Category</Text>
      <View style={styles.categoryGrid}>
        {PERSONAL_CATEGORIES.map((item) => {
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
              <CategoryIcon categoryId={item.id} type="personal" size={34} iconSize={16} />
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: selected ? theme.fonts.bold : theme.fonts.medium,
                  fontSize: 9.5,
                  marginTop: 5,
                  textAlign: 'center',
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Payment method</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {PAYMENT_OPTIONS.map((option) => {
          const selected = paymentMethod === option.value;
          const Icon = option.icon;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                hapticSelect();
                setPaymentMethod(option.value);
              }}
              style={[
                styles.paymentCell,
                {
                  backgroundColor: selected ? theme.colors.limeSoft : theme.colors.surface,
                  borderColor: selected ? theme.colors.lime : theme.colors.line,
                },
              ]}
            >
              <Icon size={17} color={selected ? theme.colors.limeDeep : theme.colors.inkMuted} />
              <Text
                style={{
                  fontFamily: selected ? theme.fonts.bold : theme.fonts.medium,
                  fontSize: 10,
                  marginTop: 4,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Repeats</Text>
      <SegmentedControl options={RECURRENCE_OPTIONS} value={recurrence} onChange={setRecurrence} height={42} />
      {recurrence !== 'none' ? (
        <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle, marginTop: 7, marginLeft: 3 }}>
          Saved as a recurring label. This entry is logged once.
        </Text>
      ) : null}

      <View style={{ gap: 15, marginTop: 18 }}>
        <DateField label="Date" value={date} onChange={setDate} />
        <Input
          label="Note (optional)"
          placeholder="Anything worth remembering"
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

      <View style={[styles.tip, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11, lineHeight: 17, color: theme.colors.inkSubtle }}>
          Personal expenses shape your monthly insights, budget ring and category mix. Trips stay separate.
        </Text>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  amountCard: { borderWidth: 1, borderRadius: 22, padding: 16 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginVertical: 2 },
  amountInput: { flex: 1, padding: 0, fontSize: 42, lineHeight: 48, letterSpacing: -1.8 },
  quickAmount: { borderRadius: 999, paddingHorizontal: 10, height: 28, justifyContent: 'center' },
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
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentCell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: { borderRadius: 14, padding: 12, marginTop: 16 },
  tip: { borderRadius: 16, padding: 13, marginTop: 18 },
});
