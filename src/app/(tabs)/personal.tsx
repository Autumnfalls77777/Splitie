import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight, Plus, Target, TrendingDown, TrendingUp } from 'lucide-react-native';

import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { ProgressRing } from '@/components/charts/ProgressRing';
import { PersonalExpenseRow } from '@/components/expenses/ExpenseRow';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { MonthSwitcher } from '@/components/ui/MonthSwitcher';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { expensesForMonth, getMonthStats } from '@/features/personal/stats';
import { usePersonalStore } from '@/features/personal/personal.store';
import { useUIStore } from '@/features/settings/ui.store';
import { formatDayLabel, monthKey, shiftMonth, todayISO } from '@/lib/date';
import { formatMoney, parseAmount } from '@/lib/money';
import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme';

const HERO_INK = '#F7F9EE';

export default function PersonalScreen() {
  const theme = useTheme();
  const router = useRouter();
  const expenses = usePersonalStore((state) => state.expenses);
  const monthlyBudgetPaise = usePersonalStore((state) => state.monthlyBudgetPaise);
  const setBudget = usePersonalStore((state) => state.setBudget);
  const showToast = useUIStore((state) => state.showToast);
  const [month, setMonth] = useState(monthKey());
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(monthlyBudgetPaise / 100));

  const stats = useMemo(
    () => getMonthStats(expenses, month, monthlyBudgetPaise),
    [expenses, month, monthlyBudgetPaise],
  );

  const monthExpenses = useMemo(
    () => expensesForMonth(expenses, month).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [expenses, month],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof monthExpenses>();
    for (const expense of monthExpenses) {
      const list = map.get(expense.date) ?? [];
      list.push(expense);
      map.set(expense.date, list);
    }
    return Array.from(map.entries());
  }, [monthExpenses]);

  const dailyData = stats.daily.map((day) => ({
    label: `${day.day}`,
    value: day.amountPaise,
    highlight: day.amountPaise === Math.max(...stats.daily.map((item) => item.amountPaise)),
  }));

  const isCurrentMonth = month === monthKey(todayISO());
  const overBudget = stats.remainingPaise < 0;
  const ringColor = overBudget ? theme.colors.negative : theme.colors.lime;

  const openBudget = () => {
    setBudgetInput(String(Math.round(monthlyBudgetPaise / 100)));
    setBudgetOpen(true);
  };

  const saveBudget = () => {
    const value = parseAmount(budgetInput);
    if (value < 10_000) {
      showToast('Set a budget above ₹100', { kind: 'error' });
      return;
    }
    setBudget(value);
    setBudgetOpen(false);
    showToast('Monthly budget updated', { description: formatMoney(value) });
  };

  return (
    <>
      <Screen contentBottom={132}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: theme.fonts.displayXBold,
                fontSize: 34,
                lineHeight: 38,
                letterSpacing: -1.4,
              }}
            >
              Personal
            </Text>
            <Text style={{ fontFamily: theme.fonts.medium, fontSize: 12, color: theme.colors.inkSubtle, marginTop: 2 }}>
              Your money, outside the group.
            </Text>
          </View>
          <IconButton
            icon={Target}
            accessibilityLabel="Set monthly budget"
            onPress={openBudget}
          />
          <IconButton
            icon={Plus}
            variant="lime"
            accessibilityLabel="Add a personal expense"
            onPress={() => router.push('/personal/add')}
          />
        </View>

        <MonthSwitcher
          label={stats.label}
          onPrevious={() => setMonth(shiftMonth(month, -1))}
          onNext={() => setMonth(shiftMonth(month, 1))}
          disableNext={isCurrentMonth}
          onLabelPress={() => setMonth(monthKey())}
        />

        <LinearGradient
          colors={['#14180F', '#2B351C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: HERO_INK, opacity: 0.55 }}>
                {stats.label} spending
              </Text>
              <Text
                style={{
                  fontFamily: theme.fonts.display,
                  fontSize: 34,
                  lineHeight: 40,
                  letterSpacing: -1.3,
                  color: HERO_INK,
                  marginTop: 2,
                }}
              >
                {formatMoney(stats.totalPaise)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                {stats.changePercent > 0 ? (
                  <TrendingUp size={13} color={theme.colors.negative} />
                ) : (
                  <TrendingDown size={13} color={theme.colors.lime} />
                )}
                <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 11, color: HERO_INK, opacity: 0.65 }}>
                  {stats.changePercent === 0
                    ? 'Same as last month'
                    : `${Math.abs(stats.changePercent)}% ${stats.changePercent > 0 ? 'more' : 'less'} than last month`}
                </Text>
              </View>
            </View>
            <ProgressRing
              progress={Math.min(1, stats.budgetProgress)}
              size={104}
              strokeWidth={9}
              color={ringColor}
              trackColor="rgba(255,255,255,0.12)"
            >
              <Text style={{ fontFamily: theme.fonts.display, fontSize: 21, color: HERO_INK, letterSpacing: -0.5 }}>
                {Math.round(stats.budgetProgress * 100)}%
              </Text>
              <Text style={{ fontFamily: theme.fonts.medium, fontSize: 9, color: HERO_INK, opacity: 0.5 }}>
                of budget
              </Text>
            </ProgressRing>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStats}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStatLabel}>
                {overBudget ? 'Over budget' : 'Still available'}
              </Text>
              <Text
                style={{
                  fontFamily: theme.fonts.bold,
                  fontSize: 14,
                  color: overBudget ? theme.colors.negative : theme.colors.lime,
                  marginTop: 2,
                }}
              >
                {formatMoney(Math.abs(stats.remainingPaise))}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'stretch' }} />
            <View style={{ flex: 1, paddingLeft: 16 }}>
              <Text style={styles.heroStatLabel}>Avg per day</Text>
              <Text style={{ fontFamily: theme.fonts.bold, fontSize: 14, color: HERO_INK, marginTop: 2 }}>
                {formatMoney(stats.avgPerDayPaise)}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'stretch' }} />
            <View style={{ flex: 1, paddingLeft: 16 }}>
              <Text style={styles.heroStatLabel}>Entries</Text>
              <Text style={{ fontFamily: theme.fonts.bold, fontSize: 14, color: HERO_INK, marginTop: 2 }}>
                {stats.count}
              </Text>
            </View>
          </View>

          <Pressable onPress={openBudget} style={styles.budgetLink}>
            <Target size={13} color={theme.colors.lime} />
            <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11, color: theme.colors.lime }}>
              {formatMoney(monthlyBudgetPaise)} monthly budget
            </Text>
            <ArrowRight size={12} color={theme.colors.lime} />
          </Pressable>
        </LinearGradient>

        <View style={{ marginTop: 22 }}>
          <SectionHeader
            title="Daily rhythm"
            subtitle={`${stats.count} ${stats.count === 1 ? 'entry' : 'entries'} this month`}
            actionLabel="Add"
            onAction={() => router.push('/personal/add')}
          />
          <Card style={{ marginTop: 12 }} padding={16}>
            <BarChart data={dailyData} height={108} labelEvery={5} />
            <View style={styles.chartFooter}>
              <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle }}>
                Each bar is a day in {stats.label.split(' ')[0]}
              </Text>
              <Text style={{ fontFamily: theme.fonts.bold, fontSize: 10.5, color: theme.colors.inkSubtle }}>
                Peak {formatMoney(Math.max(...stats.daily.map((day) => day.amountPaise)))}
              </Text>
            </View>
          </Card>
        </View>

        {stats.categories.length > 0 ? (
          <View style={{ marginTop: 22 }}>
            <SectionHeader title="Where it went" subtitle="By category" />
            <Card style={{ marginTop: 12 }} padding={16}>
              <View style={styles.categoryTop}>
                <DonutChart
                  segments={stats.categories.map((category) => ({
                    value: category.amountPaise,
                    color: category.color,
                    label: category.label,
                  }))}
                  size={132}
                  strokeWidth={15}
                >
                  <Text style={{ fontFamily: theme.fonts.display, fontSize: 20, letterSpacing: -0.5 }}>
                    {stats.categories.length}
                  </Text>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 9, color: theme.colors.inkSubtle }}>
                    categories
                  </Text>
                </DonutChart>
                <View style={{ flex: 1, gap: 9 }}>
                  {stats.categories.slice(0, 4).map((category) => (
                    <View key={category.id} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: category.color }]} />
                      <Text numberOfLines={1} style={{ flex: 1, fontFamily: theme.fonts.semibold, fontSize: 11.5 }}>
                        {category.label}
                      </Text>
                      <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11 }}>{category.percent}%</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={{ gap: 14, marginTop: 18 }}>
                {stats.categories.map((category) => (
                  <View key={category.id}>
                    <View style={styles.categoryRow}>
                      <CategoryIcon categoryId={category.id} type="personal" size={32} iconSize={15} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 12.5 }}>{category.label}</Text>
                        <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10, color: theme.colors.inkSubtle, marginTop: 1 }}>
                          {category.count} {category.count === 1 ? 'entry' : 'entries'}
                        </Text>
                      </View>
                      <Text style={{ fontFamily: theme.fonts.bold, fontSize: 12.5 }}>{formatMoney(category.amountPaise)}</Text>
                    </View>
                    <ProgressBar
                      progress={category.percent / 100}
                      height={4}
                      color={category.color}
                      style={{ marginTop: 7, marginLeft: 44 }}
                    />
                  </View>
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        <View style={{ marginTop: 22 }}>
          <SectionHeader
            title="Recent expenses"
            subtitle={isCurrentMonth ? 'This month, latest first' : stats.label}
            actionLabel="Add"
            onAction={() => router.push('/personal/add')}
          />
          {grouped.length > 0 ? (
            <View style={{ gap: 14, marginTop: 12 }}>
              {grouped.map(([date, items]) => (
                <View key={date}>
                  <Text style={{ fontFamily: theme.fonts.bold, fontSize: 11, color: theme.colors.inkSubtle, marginBottom: 6, marginLeft: 2 }}>
                    {formatDayLabel(date)}
                  </Text>
                  <Card padding={16} style={{ paddingVertical: 2 }}>
                    {items.map((expense, index) => (
                      <PersonalExpenseRow
                        key={expense.id}
                        id={expense.id}
                        title={expense.title}
                        amountPaise={expense.amountPaise}
                        category={expense.category}
                        date={expense.date}
                        recurrence={expense.recurrence}
                        last={index === items.length - 1}
                      />
                    ))}
                  </Card>
                </View>
              ))}
            </View>
          ) : (
            <Card style={{ marginTop: 12 }} padding={8}>
              <EmptyState
                compact
                icon={Plus}
                title="A quiet month"
                body="No personal expenses logged here yet. Add the first one."
                actionLabel="Add an expense"
                onAction={() => router.push('/personal/add')}
              />
            </Card>
          )}
        </View>
      </Screen>

      <Sheet
        visible={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title="Monthly budget"
        subtitle="A soft guardrail, not a strict rule."
        footer={
          <Button
            label="Save budget"
            variant="dark"
            size="lg"
            fullWidth
            onPress={saveBudget}
          />
        }
      >
        <Input
          label="Budget amount"
          value={budgetInput}
          onChangeText={setBudgetInput}
          keyboardType="decimal-pad"
          prefix="₹"
          placeholder="45000"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
          {[30_000, 40_000, 45_000, 60_000].map((amount) => (
            <Pressable
              key={amount}
              onPress={() => {
                hapticTap();
                setBudgetInput(String(amount));
              }}
              style={[
                styles.quickChip,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.line,
                },
              ]}
            >
              <Text style={{ fontFamily: theme.fonts.semibold, fontSize: 12 }}>₹{amount.toLocaleString('en-IN')}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.inkSubtle, marginTop: 12 }}>
          This budget applies to every month. You can change it whenever you like.
        </Text>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  hero: { borderRadius: 30, padding: 20, marginTop: 16, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  heroDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 16 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStatLabel: { fontFamily: 'Manrope_500Medium', fontSize: 9.5, color: HERO_INK, opacity: 0.48 },
  budgetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 16,
    backgroundColor: 'rgba(201,242,91,0.1)',
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 28,
  },
  chartFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  categoryTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, height: 34, justifyContent: 'center' },
});
