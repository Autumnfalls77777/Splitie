import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  CalendarDays,
  ChartPie,
  Info,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';

import { AreaChart } from '@/components/charts/AreaChart';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonthSwitcher } from '@/components/ui/MonthSwitcher';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { expensesForYear, getMonthStats, getYearStats } from '@/features/personal/stats';
import { usePersonalStore } from '@/features/personal/personal.store';
import {
  lastNMonths,
  monthKey,
  monthShort,
  shiftMonth,
  todayISO,
} from '@/lib/date';
import { formatMoney, sum } from '@/lib/money';
import { useTheme } from '@/theme';
import type { Insight } from '@/features/personal/stats';

type Mode = 'month' | 'year';

function InsightCard({ insight }: { insight: Insight }) {
  const theme = useTheme();
  const tone = {
    positive: { color: theme.colors.positive, background: theme.colors.positiveSoft, icon: TrendingDown },
    negative: { color: theme.colors.negative, background: theme.colors.negativeSoft, icon: TrendingUp },
    neutral: { color: theme.colors.info, background: theme.colors.infoSoft, icon: Info },
  }[insight.tone];
  const Icon = tone.icon;

  return (
    <View style={[styles.insightCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line }]}>
      <View style={[styles.insightIcon, { backgroundColor: tone.background }]}>
        <Icon size={17} color={tone.color} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: theme.fonts.bold, fontSize: 13 }}>{insight.title}</Text>
        <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, lineHeight: 17, color: theme.colors.inkSubtle, marginTop: 2 }}>
          {insight.body}
        </Text>
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const theme = useTheme();
  const expenses = usePersonalStore((state) => state.expenses);
  const monthlyBudgetPaise = usePersonalStore((state) => state.monthlyBudgetPaise);
  const [mode, setMode] = useState<Mode>('month');
  const [month, setMonth] = useState(monthKey());
  const [year, setYear] = useState(Number(todayISO().slice(0, 4)));

  const monthStats = useMemo(
    () => getMonthStats(expenses, month, monthlyBudgetPaise),
    [expenses, month, monthlyBudgetPaise],
  );
  const yearStats = useMemo(
    () => getYearStats(expenses, year, monthlyBudgetPaise),
    [expenses, year, monthlyBudgetPaise],
  );

  const trendKeys = useMemo(() => lastNMonths(6, `${month}-01`), [month]);
  const trend = useMemo(
    () =>
      trendKeys.map((key) => ({
        key,
        label: monthShort(key),
        amountPaise: sum(
          expenses
            .filter((expense) => expense.date.startsWith(key))
            .map((expense) => expense.amountPaise),
        ),
      })),
    [expenses, trendKeys],
  );

  const yearInsights = useMemo<Insight[]>(() => {
    const previous = expensesForYear(expenses, year - 1);
    const previousTotal = sum(previous.map((expense) => expense.amountPaise));
    const change =
      previousTotal > 0 ? Math.round(((yearStats.totalPaise - previousTotal) / previousTotal) * 100) : 0;
    const busiest = [...yearStats.months].sort((a, b) => b.amountPaise - a.amountPaise)[0];
    const insights: Insight[] = [];

    if (yearStats.topCategory) {
      insights.push({
        id: 'year-top',
        title: `${yearStats.topCategory.label} led the year`,
        body: `${yearStats.topCategory.percent}% of your yearly spending, across ${yearStats.topCategory.count} entries.`,
        tone: 'neutral',
      });
    }
    if (busiest && busiest.amountPaise > 0) {
      insights.push({
        id: 'year-busiest',
        title: `${busiest.label} was your biggest month`,
        body: `${formatMoney(busiest.amountPaise)} spent in ${busiest.label}. The rest of the year averaged ${formatMoney(Math.round(yearStats.totalPaise / 12))}.`,
        tone: 'neutral',
      });
    }
    if (previousTotal > 0) {
      insights.push({
        id: 'year-change',
        title:
          change > 0
            ? `${change}% more than ${year - 1}`
            : change < 0
              ? `${Math.abs(change)}% less than ${year - 1}`
              : `Almost exactly ${year - 1}`,
        body: `You spent ${formatMoney(yearStats.totalPaise)} in ${year} versus ${formatMoney(previousTotal)} in ${year - 1}.`,
        tone: change > 0 ? 'negative' : 'positive',
      });
    }
    return insights;
  }, [expenses, year, yearStats]);

  const isMonth = mode === 'month';
  const total = isMonth ? monthStats.totalPaise : yearStats.totalPaise;
  const categories = isMonth ? monthStats.categories : yearStats.categories;
  const topCategory = isMonth ? monthStats.topCategory : yearStats.topCategory;
  const insights = isMonth ? monthStats.insights : yearInsights;
  const currentYear = Number(todayISO().slice(0, 4));
  const avgLabel = isMonth ? 'Avg per day' : 'Avg per month';
  const avgValue = isMonth ? monthStats.avgPerDayPaise : yearStats.avgPerMonthPaise;
  const count = isMonth ? monthStats.count : yearStats.count;

  const monthlyTrendData = isMonth
    ? trend
    : yearStats.months.map((point) => ({
        key: point.key,
        label: point.label,
        amountPaise: point.amountPaise,
      }));

  return (
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
            Insights
          </Text>
          <Text style={{ fontFamily: theme.fonts.medium, fontSize: 12, color: theme.colors.inkSubtle, marginTop: 2 }}>
            The patterns hiding in your spending.
          </Text>
        </View>
        <View style={[styles.sparkIcon, { backgroundColor: theme.colors.limeSoft }]}>
          <Sparkles size={20} color={theme.colors.limeDeep} />
        </View>
      </View>

      <SegmentedControl
        options={[
          { value: 'month', label: 'Month' },
          { value: 'year', label: 'Year' },
        ]}
        value={mode}
        onChange={setMode}
      />

      <View style={{ marginTop: 14 }}>
        {isMonth ? (
          <MonthSwitcher
            label={monthStats.label}
            onPrevious={() => setMonth(shiftMonth(month, -1))}
            onNext={() => setMonth(shiftMonth(month, 1))}
            disableNext={month === monthKey()}
            onLabelPress={() => setMonth(monthKey())}
          />
        ) : (
          <MonthSwitcher
            label={`${year}`}
            onPrevious={() => setYear((current) => current - 1)}
            onNext={() => setYear((current) => current + 1)}
            disableNext={year >= currentYear}
            onLabelPress={() => setYear(currentYear)}
          />
        )}
      </View>

      {total === 0 ? (
        <Card style={{ marginTop: 20 }} padding={10}>
          <EmptyState
            icon={ChartPie}
            title="Not enough to read yet"
            body={
              isMonth
                ? 'Add a few personal expenses and this page will fill up with trends, categories and gentle observations.'
                : `There are no personal expenses logged in ${year} yet.`
            }
          />
        </Card>
      ) : (
        <>
          <Card style={{ marginTop: 20 }} padding={18}>
            <View style={styles.summaryTop}>
              <View>
                <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle }}>
                  Total spent
                </Text>
                <Text
                  style={{
                    fontFamily: theme.fonts.display,
                    fontSize: 34,
                    lineHeight: 40,
                    letterSpacing: -1.2,
                    marginTop: 1,
                  }}
                >
                  {formatMoney(total)}
                </Text>
              </View>
              {isMonth ? (
                <Badge
                  label={
                    monthStats.changePercent === 0
                      ? 'No change'
                      : `${monthStats.changePercent > 0 ? '+' : ''}${monthStats.changePercent}%`
                  }
                  tone={monthStats.changePercent > 0 ? 'negative' : 'positive'}
                  dot
                />
              ) : (
                <Badge label={`${count} entries`} tone="lime" dot />
              )}
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>{avgLabel}</Text>
                <Text style={styles.summaryValue}>{formatMoney(avgValue)}</Text>
              </View>
              <View style={[styles.summaryCell, styles.summaryCellBorder]}>
                <Text style={styles.summaryLabel}>Top category</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>
                  {topCategory?.label ?? '—'}
                </Text>
              </View>
              <View style={[styles.summaryCell, styles.summaryCellBorder]}>
                <Text style={styles.summaryLabel}>Entries</Text>
                <Text style={styles.summaryValue}>{count}</Text>
              </View>
            </View>

            {isMonth ? (
              <Text style={{ fontFamily: theme.fonts.medium, fontSize: 11.5, color: theme.colors.inkSubtle, marginTop: 12 }}>
                {monthStats.remainingPaise >= 0
                  ? `${formatMoney(monthStats.remainingPaise)} still inside your ${formatMoney(monthlyBudgetPaise)} budget.`
                  : `${formatMoney(Math.abs(monthStats.remainingPaise))} over your ${formatMoney(monthlyBudgetPaise)} budget.`}
              </Text>
            ) : null}
          </Card>

          <View style={{ marginTop: 22 }}>
            <SectionHeader
              title={isMonth ? 'Six-month trend' : `${year} by month`}
              subtitle={isMonth ? `Ending ${monthStats.label}` : 'Total spend each month'}
              icon={CalendarDays}
            />
            <Card style={{ marginTop: 12 }} padding={16}>
              <AreaChart
                values={monthlyTrendData.map((point) => point.amountPaise)}
                labels={monthlyTrendData.map((point) => point.label)}
                height={156}
                color={theme.colors.limeDeep}
              />
              <View style={styles.chartFootnote}>
                <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle }}>
                  {isMonth ? 'Last six months' : 'January to December'}
                </Text>
                <Text style={{ fontFamily: theme.fonts.bold, fontSize: 10.5, color: theme.colors.inkSubtle }}>
                  Peak {formatMoney(Math.max(...monthlyTrendData.map((point) => point.amountPaise), 0))}
                </Text>
              </View>
            </Card>
          </View>

          <View style={{ marginTop: 22 }}>
            <SectionHeader title="Category mix" subtitle="Where the money landed" icon={ChartPie} />
            <Card style={{ marginTop: 12 }} padding={16}>
              <View style={styles.categoryTop}>
                <DonutChart
                  segments={categories.map((category) => ({
                    value: category.amountPaise,
                    color: category.color,
                    label: category.label,
                  }))}
                  size={146}
                  strokeWidth={17}
                >
                  <Text style={{ fontFamily: theme.fonts.display, fontSize: 20, letterSpacing: -0.5 }}>
                    {formatMoney(total, { compact: true })}
                  </Text>
                  <Text style={{ fontFamily: theme.fonts.medium, fontSize: 9, color: theme.colors.inkSubtle }}>
                    {isMonth ? 'this month' : `in ${year}`}
                  </Text>
                </DonutChart>
                <View style={{ flex: 1, gap: 9 }}>
                  {categories.slice(0, 5).map((category) => (
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
            </Card>
          </View>

          {isMonth ? (
            <View style={{ marginTop: 22 }}>
              <SectionHeader title="Your spending week" subtitle="Which days hit hardest" icon={CalendarDays} />
              <Card style={{ marginTop: 12 }} padding={16}>
                <BarChart
                  data={monthStats.weekdays.map((day) => ({
                    label: day.day,
                    value: day.amountPaise,
                    highlight: day.amountPaise === Math.max(...monthStats.weekdays.map((item) => item.amountPaise)),
                  }))}
                  height={100}
                  labelEvery={1}
                  color={theme.colors.lilac}
                  highlightColor={theme.colors.ink}
                />
                <Text style={{ fontFamily: theme.fonts.medium, fontSize: 10.5, color: theme.colors.inkSubtle, marginTop: 10 }}>
                  Weekend plans tend to show up here first.
                </Text>
              </Card>
            </View>
          ) : null}

          <View style={{ marginTop: 22 }}>
            <SectionHeader title="Worth noticing" subtitle="Small observations, no judgement" icon={Sparkles} />
            <View style={{ gap: 10, marginTop: 12 }}>
              {insights.slice(0, 4).map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
              {insights.length === 0 ? (
                <Card padding={16}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.insightIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
                      <Minus size={17} color={theme.colors.inkSubtle} />
                    </View>
                    <Text style={{ flex: 1, fontFamily: theme.fonts.medium, fontSize: 12, color: theme.colors.inkSubtle }}>
                      Add a few more entries and Splitie will start spotting patterns.
                    </Text>
                  </View>
                </Card>
              ) : null}
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  sparkIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  summaryGrid: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(120,130,100,0.18)' },
  summaryCell: { flex: 1 },
  summaryCellBorder: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(120,130,100,0.18)', paddingLeft: 14 },
  summaryLabel: { fontFamily: 'Manrope_500Medium', fontSize: 9.5, opacity: 0.55 },
  summaryValue: { fontFamily: 'Manrope_700Bold', fontSize: 13, marginTop: 2 },
  chartFootnote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  categoryTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderWidth: 1, borderRadius: 18, padding: 13 },
  insightIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
