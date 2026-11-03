import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addDaysISO,
  daysBetween,
  daysInMonth,
  daysInRange,
  endOfMonthISO,
  formatDate,
  formatDateRange,
  formatDayLabel,
  formatRelativeDue,
  formatTime,
  fromISODate,
  greeting,
  isToday,
  lastNMonths,
  monthFromDate,
  monthKey,
  monthLabel,
  monthShort,
  shiftMonth,
  startOfMonthISO,
  startOfWeekISO,
  toISODate,
  todayISO,
  tripDurationDays,
  weekdayIndex,
  weekdayNarrow,
  weekdayShort,
} from '@/lib/date';

function freezeToday() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 2, 10, 9, 0, 0));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('toISODate', () => {
  it('formats the local calendar date without UTC drift', () => {
    expect(toISODate(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05');
    expect(toISODate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(toISODate(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
  });

  it('pads single-digit months and days', () => {
    expect(toISODate(new Date(2026, 8, 9, 12))).toBe('2026-09-09');
  });
});

describe('todayISO', () => {
  it('returns the current local date', () => {
    freezeToday();
    expect(todayISO()).toBe('2026-03-10');
  });
});

describe('fromISODate', () => {
  it('parses an ISO date at local noon', () => {
    const date = fromISODate('2026-03-05');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(5);
    expect(date.getHours()).toBe(12);
    expect(date.getMinutes()).toBe(0);
  });

  it('parses leap days', () => {
    expect(toISODate(fromISODate('2028-02-29'))).toBe('2028-02-29');
  });
});

describe('addDaysISO', () => {
  it('adds and subtracts days across month and year boundaries', () => {
    expect(addDaysISO('2026-03-05', 1)).toBe('2026-03-06');
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysISO('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDaysISO('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('handles leap-year February', () => {
    expect(addDaysISO('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDaysISO('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDaysISO('2028-03-01', -1)).toBe('2028-02-29');
  });
});

describe('daysBetween', () => {
  it('returns signed whole-day differences', () => {
    expect(daysBetween('2026-03-05', '2026-03-05')).toBe(0);
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30);
    expect(daysBetween('2026-03-31', '2026-03-01')).toBe(-30);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('counts leap days', () => {
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });
});

describe('isToday', () => {
  it('compares against the local current date', () => {
    freezeToday();
    expect(isToday('2026-03-10')).toBe(true);
    expect(isToday('2026-03-09')).toBe(false);
    expect(isToday('2026-03-11')).toBe(false);
  });
});

describe('formatDate', () => {
  it('formats short, medium, and long styles', () => {
    expect(formatDate('2026-03-05', 'short')).toBe('5 Mar');
    expect(formatDate('2026-03-05')).toBe('5 Mar 2026');
    expect(formatDate('2026-03-05', 'medium')).toBe('5 Mar 2026');
    expect(formatDate('2026-03-05', 'long')).toBe('Thu, 5 March 2026');
    expect(formatDate('2026-12-31', 'long')).toBe('Thu, 31 December 2026');
  });
});

describe('formatDayLabel', () => {
  it('uses relative labels for nearby days', () => {
    freezeToday();
    expect(formatDayLabel('2026-03-10')).toBe('Today');
    expect(formatDayLabel('2026-03-09')).toBe('Yesterday');
    expect(formatDayLabel('2026-03-11')).toBe('Tomorrow');
  });

  it('falls back to weekday and short date', () => {
    freezeToday();
    expect(formatDayLabel('2026-03-08')).toBe('Sun, 8 Mar');
    expect(formatDayLabel('2026-03-05')).toBe('Thu, 5 Mar');
  });
});

describe('formatDateRange', () => {
  it('collapses a range within one month', () => {
    expect(formatDateRange('2026-03-01', '2026-03-05')).toBe('1–5 Mar');
  });

  it('shows both months when the range crosses a month boundary', () => {
    expect(formatDateRange('2026-02-28', '2026-03-02')).toBe('28 Feb – 2 Mar');
  });

  it('shows both dates when the range crosses a year boundary', () => {
    expect(formatDateRange('2026-12-30', '2027-01-02')).toBe('30 Dec – 2 Jan');
  });
});

describe('formatRelativeDue', () => {
  it('describes due dates relative to today', () => {
    freezeToday();
    expect(formatRelativeDue('2026-03-10')).toBe('Due today');
    expect(formatRelativeDue('2026-03-11')).toBe('Due tomorrow');
    expect(formatRelativeDue('2026-03-15')).toBe('Due in 5 days');
    expect(formatRelativeDue('2026-03-09')).toBe('Overdue by 1 day');
    expect(formatRelativeDue('2026-03-07')).toBe('Overdue by 3 days');
  });
});

describe('month helpers', () => {
  it('derives month keys from dates and today', () => {
    expect(monthKey('2026-03-05')).toBe('2026-03');
    freezeToday();
    expect(monthKey()).toBe('2026-03');
  });

  it('formats month labels', () => {
    expect(monthLabel('2026-03')).toBe('March 2026');
    expect(monthLabel('2026-03', 'short')).toBe('Mar 26');
    expect(monthLabel('2026-12', 'short')).toBe('Dec 26');
    expect(monthShort('2026-03')).toBe('Mar');
    expect(monthShort('2026-12')).toBe('Dec');
  });

  it('computes month start and end dates', () => {
    expect(startOfMonthISO('2026-03-15')).toBe('2026-03-01');
    expect(endOfMonthISO('2026-03-15')).toBe('2026-03-31');
    expect(endOfMonthISO('2026-02-10')).toBe('2026-02-28');
    expect(endOfMonthISO('2028-02-10')).toBe('2028-02-29');
    expect(endOfMonthISO('2026-04-10')).toBe('2026-04-30');
  });

  it('defaults month boundaries to today', () => {
    freezeToday();
    expect(startOfMonthISO()).toBe('2026-03-01');
    expect(endOfMonthISO()).toBe('2026-03-31');
  });

  it('counts days in a month including leap years', () => {
    expect(daysInMonth('2026-01')).toBe(31);
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-04')).toBe(30);
  });

  it('shifts months across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-03', 0)).toBe('2026-03');
    expect(shiftMonth('2026-03', 12)).toBe('2027-03');
    expect(shiftMonth('2026-03', -14)).toBe('2025-01');
  });

  it('builds a chronological window of the last N months', () => {
    expect(lastNMonths(3, '2026-03-15')).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(lastNMonths(1, '2026-03-15')).toEqual(['2026-03']);
    expect(lastNMonths(0, '2026-03-15')).toEqual([]);
    expect(lastNMonths(4, '2026-02-10')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });

  it('defaults the last-N-months window to today', () => {
    freezeToday();
    expect(lastNMonths(2)).toEqual(['2026-02', '2026-03']);
  });
});

describe('weekday helpers', () => {
  it('returns short weekday names and indices', () => {
    expect(weekdayShort('2026-03-05')).toBe('Thu');
    expect(weekdayShort('2026-03-08')).toBe('Sun');
    expect(weekdayIndex('2026-03-05')).toBe(4);
    expect(weekdayIndex('2026-03-08')).toBe(0);
  });

  it('returns narrow weekday letters with wrapping', () => {
    expect(weekdayNarrow(0)).toBe('S');
    expect(weekdayNarrow(1)).toBe('M');
    expect(weekdayNarrow(6)).toBe('S');
    expect(weekdayNarrow(7)).toBe('S');
  });

  it('finds the Sunday that starts the week', () => {
    expect(startOfWeekISO('2026-03-05')).toBe('2026-03-01');
    expect(startOfWeekISO('2026-03-01')).toBe('2026-03-01');
    expect(startOfWeekISO('2026-03-08')).toBe('2026-03-08');
    expect(startOfWeekISO('2026-01-01')).toBe('2025-12-28');
    freezeToday();
    expect(startOfWeekISO()).toBe('2026-03-08');
  });
});

describe('greeting', () => {
  it('changes by local hour', () => {
    const at = (hour: number) => new Date(2026, 2, 10, hour, 0, 0);
    expect(greeting(at(4))).toBe('Up late');
    expect(greeting(at(5))).toBe('Good morning');
    expect(greeting(at(11))).toBe('Good morning');
    expect(greeting(at(12))).toBe('Good afternoon');
    expect(greeting(at(16))).toBe('Good afternoon');
    expect(greeting(at(17))).toBe('Good evening');
    expect(greeting(at(23))).toBe('Good evening');
  });
});

describe('formatTime', () => {
  it('formats a local time with hours and minutes', () => {
    expect(formatTime(new Date(2026, 0, 1, 9, 5))).toMatch(/9:05/);
    expect(formatTime(new Date(2026, 0, 1, 21, 30))).toMatch(/9:30/);
  });
});

describe('date ranges', () => {
  it('includes both endpoints', () => {
    expect(daysInRange('2026-03-01', '2026-03-03')).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
    ]);
    expect(daysInRange('2026-03-05', '2026-03-05')).toEqual(['2026-03-05']);
  });

  it('counts trip days inclusively with a minimum of one', () => {
    expect(tripDurationDays('2026-03-01', '2026-03-03')).toBe(3);
    expect(tripDurationDays('2026-03-05', '2026-03-05')).toBe(1);
    expect(tripDurationDays('2028-02-28', '2028-03-01')).toBe(3);
  });
});

describe('monthFromDate', () => {
  it('derives the local month key from a Date', () => {
    expect(monthFromDate(new Date(2026, 2, 5))).toBe('2026-03');
    expect(monthFromDate(new Date(2026, 11, 31))).toBe('2026-12');
  });
});
