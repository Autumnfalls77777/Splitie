import { PERSONAL_CATEGORIES } from '@/data/categories';
import { daysInMonth, lastNMonths, monthKey, monthLabel, monthShort, shiftMonth, todayISO, weekdayIndex } from '@/lib/date';
import { percentOf, sum } from '@/lib/money';
import type { PersonalCategoryId, PersonalExpense } from '@/types/models';

export type CategoryTotal = {
  id: PersonalCategoryId;
  label: string;
  color: string;
  amountPaise: number;
  percent: number;
  count: number;
};

export type DailyPoint = {
  day: number;
  date: string;
  amountPaise: number;
};

export type MonthlyPoint = {
  key: string;
  label: string;
  amountPaise: number;
};

export type Insight = {
  id: string;
  title: string;
  body: string;
  tone: 'positive' | 'negative' | 'neutral';
};

export type MonthStats = {
  key: string;
  label: string;
  totalPaise: number;
  count: number;
  avgPerDayPaise: number;
  previousTotalPaise: number;
  changePercent: number;
  budgetPaise: number;
  budgetProgress: number;
  remainingPaise: number;
  categories: CategoryTotal[];
  daily: DailyPoint[];
  weekdays: { day: string; amountPaise: number }[];
  topCategory?: CategoryTotal;
  biggestExpense?: PersonalExpense;
  recurringTotalPaise: number;
  insights: Insight[];
};

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function expensesForMonth(expenses: PersonalExpense[], key: string): PersonalExpense[] {
  return expenses.filter((expense) => expense.date.startsWith(key));
}

export function expensesForYear(expenses: PersonalExpense[], year: number): PersonalExpense[] {
  return expenses.filter((expense) => expense.date.startsWith(`${year}-`));
}

export function categoryTotals(expenses: PersonalExpense[]): CategoryTotal[] {
  const total = sum(expenses.map((expense) => expense.amountPaise));
  const map = new Map<PersonalCategoryId, { amount: number; count: number }>();

  for (const expense of expenses) {
    const current = map.get(expense.category) ?? { amount: 0, count: 0 };
    current.amount += expense.amountPaise;
    current.count += 1;
    map.set(expense.category, current);
  }

  return PERSONAL_CATEGORIES.map((category) => {
    const entry = map.get(category.id) ?? { amount: 0, count: 0 };
    return {
      id: category.id,
      label: category.label,
      color: category.color,
      amountPaise: entry.amount,
      percent: percentOf(entry.amount, total),
      count: entry.count,
    };
  })
    .filter((category) => category.amountPaise > 0)
    .sort((a, b) => b.amountPaise - a.amountPaise);
}

export function dailySeries(expenses: PersonalExpense[], key: string): DailyPoint[] {
  const count = daysInMonth(key);
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    if (!expense.date.startsWith(key)) continue;
    totals.set(expense.date, (totals.get(expense.date) ?? 0) + expense.amountPaise);
  }
  return Array.from({ length: count }, (_, index) => {
    const day = index + 1;
    const date = `${key}-${`${day}`.padStart(2, '0')}`;
    return { day, date, amountPaise: totals.get(date) ?? 0 };
  });
}

export function weekdayTotals(expenses: PersonalExpense[]): { day: string; amountPaise: number }[] {
  const totals = new Map<number, number>();
  for (const expense of expenses) {
    const day = weekdayIndex(expense.date);
    totals.set(day, (totals.get(day) ?? 0) + expense.amountPaise);
  }
  return WEEKDAY_ORDER.map((day, index) => ({
    day: WEEKDAY_LABELS[index],
    amountPaise: totals.get(day) ?? 0,
  }));
}

export function monthlySeries(expenses: PersonalExpense[], count = 6): MonthlyPoint[] {
  const keys = lastNMonths(count);
  return keys.map((key) => ({
    key,
    label: monthShort(key),
    amountPaise: sum(
      expenses.filter((expense) => expense.date.startsWith(key)).map((expense) => expense.amountPaise),
    ),
  }));
}

export function yearMonthlySeries(expenses: PersonalExpense[], year: number): MonthlyPoint[] {
  return Array.from({ length: 12 }, (_, index) => {
    const key = `${year}-${`${index + 1}`.padStart(2, '0')}`;
    return {
      key,
      label: monthShort(key),
      amountPaise: sum(
        expenses.filter((expense) => expense.date.startsWith(key)).map((expense) => expense.amountPaise),
      ),
    };
  });
}

export function getMonthStats(
  expenses: PersonalExpense[],
  key: string,
  budgetPaise: number,
): MonthStats {
  const monthExpenses = expensesForMonth(expenses, key);
  const totalPaise = sum(monthExpenses.map((expense) => expense.amountPaise));
  const previousKey = shiftMonth(key, -1);
  const previousTotalPaise = sum(
    expensesForMonth(expenses, previousKey).map((expense) => expense.amountPaise),
  );
  const categories = categoryTotals(monthExpenses);
  const today = todayISO();
  const isCurrentMonth = key === monthKey(today);
  const elapsedDays = isCurrentMonth ? Number(today.slice(8, 10)) : daysInMonth(key);
  const avgPerDayPaise = elapsedDays > 0 ? Math.round(totalPaise / elapsedDays) : 0;
  const changePercent =
    previousTotalPaise > 0
      ? Math.round(((totalPaise - previousTotalPaise) / previousTotalPaise) * 100)
      : 0;
  const weekdays = weekdayTotals(monthExpenses);
  const biggestExpense = [...monthExpenses].sort((a, b) => b.amountPaise - a.amountPaise)[0];
  const recurringTotalPaise = sum(
    monthExpenses
      .filter((expense) => expense.recurrence !== 'none')
      .map((expense) => expense.amountPaise),
  );

  const insights: Insight[] = [];
  const top = categories[0];
  if (top) {
    insights.push({
      id: 'top-category',
      title: `${top.label} took the biggest bite`,
      body: `${top.percent}% of your spending this month, across ${top.count} ${top.count === 1 ? 'entry' : 'entries'}.`,
      tone: 'neutral',
    });
  }
  if (previousTotalPaise > 0) {
    insights.push({
      id: 'month-change',
      title:
        changePercent > 0
          ? `${changePercent}% more than last month`
          : changePercent < 0
            ? `${Math.abs(changePercent)}% less than last month`
            : 'Almost exactly last month’s spend',
      body: `You have spent ₹${Math.round(totalPaise / 100).toLocaleString('en-IN')} so far. Last month ended at ₹${Math.round(previousTotalPaise / 100).toLocaleString('en-IN')}.`,
      tone: changePercent > 0 ? 'negative' : 'positive',
    });
  }
  if (biggestExpense) {
    insights.push({
      id: 'biggest',
      title: `Biggest single spend: ₹${Math.round(biggestExpense.amountPaise / 100).toLocaleString('en-IN')}`,
      body: `${biggestExpense.title} on ${biggestExpense.date}.`,
      tone: 'neutral',
    });
  }
  const busiestWeekday = [...weekdays].sort((a, b) => b.amountPaise - a.amountPaise)[0];
  if (busiestWeekday && busiestWeekday.amountPaise > 0) {
    insights.push({
      id: 'weekday',
      title: `${busiestWeekday.day} is your spendiest day`,
      body: 'Plan the week around it if you are watching the budget.',
      tone: 'neutral',
    });
  }

  return {
    key,
    label: monthLabel(key),
    totalPaise,
    count: monthExpenses.length,
    avgPerDayPaise,
    previousTotalPaise,
    changePercent,
    budgetPaise,
    budgetProgress: budgetPaise > 0 ? totalPaise / budgetPaise : 0,
    remainingPaise: budgetPaise - totalPaise,
    categories,
    daily: dailySeries(monthExpenses, key),
    weekdays,
    topCategory: top,
    biggestExpense,
    recurringTotalPaise,
    insights,
  };
}

export function getYearStats(
  expenses: PersonalExpense[],
  year: number,
  monthlyBudgetPaise: number,
): {
  totalPaise: number;
  count: number;
  avgPerMonthPaise: number;
  categories: CategoryTotal[];
  months: MonthlyPoint[];
  topCategory?: CategoryTotal;
} {
  const yearExpenses = expensesForYear(expenses, year);
  const totalPaise = sum(yearExpenses.map((expense) => expense.amountPaise));
  const categories = categoryTotals(yearExpenses);
  const months = yearMonthlySeries(expenses, year);
  return {
    totalPaise,
    count: yearExpenses.length,
    avgPerMonthPaise: Math.round(totalPaise / 12),
    categories,
    months,
    topCategory: categories[0],
    // monthlyBudgetPaise is passed for future budget-vs-actual overlays.
  };
}
