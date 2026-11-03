const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_NARROW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Local calendar date as YYYY-MM-DD. Never uses UTC conversion. */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parse YYYY-MM-DD as local noon so date labels never slip a day. */
export function fromISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

export function addDaysISO(iso: string, days: number): string {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function daysAgoISO(days: number): string {
  return addDaysISO(todayISO(), -days);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const from = fromISODate(fromISO).getTime();
  const to = fromISODate(toISO).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function isToday(iso: string): boolean {
  return iso === todayISO();
}

export function formatDate(iso: string, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const date = fromISODate(iso);
  if (style === 'short') return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
  if (style === 'long') {
    return `${WEEKDAYS_SHORT[date.getDay()]}, ${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
  }
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDayLabel(iso: string): string {
  const diff = daysBetween(iso, todayISO());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  return `${WEEKDAYS_SHORT[fromISODate(iso).getDay()]}, ${formatDate(iso, 'short')}`;
}

export function formatDateRange(startISO: string, endISO: string): string {
  const start = fromISODate(startISO);
  const end = fromISODate(endISO);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`;
  }
  return `${formatDate(startISO, 'short')} – ${formatDate(endISO, 'short')}`;
}

export function formatRelativeDue(iso: string): string {
  const diff = daysBetween(todayISO(), iso);
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff > 1) return `Due in ${diff} days`;
  if (diff === -1) return 'Overdue by 1 day';
  return `Overdue by ${Math.abs(diff)} days`;
}

export function monthKey(iso: string = todayISO()): string {
  return iso.slice(0, 7);
}

export function monthLabel(key: string, style: 'short' | 'long' = 'long'): string {
  const [year, month] = key.split('-').map(Number);
  return style === 'short'
    ? `${MONTHS_SHORT[month - 1]} ${`${year}`.slice(2)}`
    : `${MONTHS_LONG[month - 1]} ${year}`;
}

export function monthShort(key: string): string {
  const [, month] = key.split('-').map(Number);
  return MONTHS_SHORT[month - 1];
}

export function startOfMonthISO(iso: string = todayISO()): string {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonthISO(iso: string = todayISO()): string {
  const [year, month] = iso.split('-').map(Number);
  return toISODate(new Date(year, month, 0, 12));
}

export function daysInMonth(key: string): number {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1, 12);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

export function lastNMonths(count: number, from: string = todayISO()): string[] {
  const base = monthKey(from);
  return Array.from({ length: count }, (_, index) => shiftMonth(base, -(count - 1 - index)));
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[fromISODate(iso).getDay()];
}

export function weekdayNarrow(index: number): string {
  return WEEKDAYS_NARROW[index % 7];
}

export function weekdayIndex(iso: string): number {
  return fromISODate(iso).getDay();
}

export function startOfWeekISO(iso: string = todayISO()): string {
  const date = fromISODate(iso);
  const day = date.getDay();
  return addDaysISO(iso, -day);
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date);
}

/** Compact relative time for "Reminded 2h ago" style copy. */
export function formatRelativeTimeShort(
  iso: string | null | undefined,
  now = Date.now(),
): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const minutes = Math.max(0, Math.floor((now - then) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function daysInRange(startISO: string, endISO: string): string[] {
  const total = Math.max(0, daysBetween(startISO, endISO));
  return Array.from({ length: total + 1 }, (_, index) => addDaysISO(startISO, index));
}

export function tripDurationDays(startISO: string, endISO: string): number {
  return Math.max(1, daysBetween(startISO, endISO) + 1);
}

export function monthFromDate(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}
