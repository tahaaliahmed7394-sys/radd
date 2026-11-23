import type { DayKey, DayHours, Language, Numerals, WorkingHours } from '../data/types';

export const DAY_KEYS: DayKey[] = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

const JS_DAY_TO_KEY: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Local calendar date key: YYYY-MM-DD (never UTC-shifted). */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function dayKeyOf(date: Date): DayKey {
  return JS_DAY_TO_KEY[date.getDay()];
}

export function dayHoursFor(hours: WorkingHours, date: Date): DayHours {
  return hours[dayKeyOf(date)] ?? { open: '09:00', close: '17:00', closed: true };
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function minutesToTime(minutes: number): string {
  const total = ((Math.round(minutes / 30) * 30) % 1440 + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTimeLabel(
  time: string,
  language: Language,
  numerals: Numerals,
): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0);
  const locale = `${language === 'ar' ? 'ar-IQ' : 'en-US'}-u-nu-${numerals === 'eastern' ? 'arab' : 'latn'}`;
  try {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(d);
  } catch {
    return time;
  }
}

export function formatDateLabel(
  date: Date,
  language: Language,
  numerals: Numerals,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' },
): string {
  const locale = `${language === 'ar' ? 'ar-IQ' : 'en-US'}-u-nu-${numerals === 'eastern' ? 'arab' : 'latn'}`;
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return date.toDateString();
  }
}

export function isBusinessOpenAt(hours: WorkingHours, when: Date): boolean {
  const today = dayHoursFor(hours, when);
  if (today.closed) return false;
  const minutes = when.getHours() * 60 + when.getMinutes();
  return minutes >= timeToMinutes(today.open) && minutes < timeToMinutes(today.close);
}

/** Hourly appointment slots for one day, excluding taken times and past times. */
export function slotsForDay(
  hours: WorkingHours,
  date: Date,
  takenTimes: string[],
  now: Date,
  stepMinutes = 60,
): { date: string; time: string }[] {
  const day = dayHoursFor(hours, date);
  if (day.closed) return [];
  const open = timeToMinutes(day.open);
  const close = timeToMinutes(day.close);
  const isToday = dateKey(date) === dateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const result: { date: string; time: string }[] = [];
  for (let t = open; t + stepMinutes <= close; t += stepMinutes) {
    const time = minutesToTime(t);
    if (isToday && t < nowMinutes + 60) continue;
    if (takenTimes.includes(time)) continue;
    result.push({ date: dateKey(date), time });
  }
  return result;
}

export function nextAvailableSlots(
  hours: WorkingHours,
  appointments: { date: string; time: string; status: string }[],
  now: Date,
  count = 4,
  rangeDays = 10,
): { date: string; time: string }[] {
  const takenByDate = new Map<string, string[]>();
  for (const a of appointments) {
    if (a.status === 'cancelled') continue;
    const list = takenByDate.get(a.date) ?? [];
    list.push(a.time);
    takenByDate.set(a.date, list);
  }
  const slots: { date: string; time: string }[] = [];
  for (let i = 0; i < rangeDays && slots.length < count; i++) {
    const day = addDays(now, i);
    const key = dateKey(day);
    const daySlots = slotsForDay(hours, day, takenByDate.get(key) ?? [], now);
    // Prefer a couple of options per day so multi-day offers stay usable.
    const perDay = Math.max(1, Math.min(2, count - slots.length));
    for (const slot of daySlots.slice(0, perDay)) {
      slots.push(slot);
      if (slots.length >= count) break;
    }
  }
  return slots;
}

export function startOfWeekSaturday(date: Date): Date {
  const d = startOfDay(date);
  const offset = (d.getDay() + 1) % 7; // Saturday = 0
  return addDays(d, -offset);
}

export function lastNDays(now: Date, n: number): string[] {
  return Array.from({ length: n }, (_, i) => dateKey(addDays(now, -(n - 1 - i))));
}

export function isoAt(base: Date, daysAgo: number, hour: number, minute: number): string {
  const d = addDays(startOfDay(base), -daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function minutesAgoIso(minutes: number, now = new Date()): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

export function timeAgoLabel(iso: string, language: Language, numerals: Numerals): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diff / 60_000));
  if (minutes < 1) return language === 'ar' ? 'الآن' : 'now';
  if (minutes < 60) {
    return language === 'ar'
      ? `قبل ${formatInt(minutes, numerals)} دقيقة`
      : `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return language === 'ar' ? `قبل ${formatInt(hours, numerals)} ساعة` : `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return language === 'ar' ? `قبل ${formatInt(days, numerals)} يوم` : `${days}d ago`;
}

export function formatInt(value: number, numerals: Numerals): string {
  return formatNumber(value, numerals);
}

export function formatNumber(value: number, numerals: Numerals, maxFractionDigits = 0): string {
  const locale = numerals === 'eastern' ? 'ar-IQ' : 'en-US';
  const numberingSystem = numerals === 'eastern' ? 'arab' : 'latn';
  try {
    return new Intl.NumberFormat(locale, {
      numberingSystem,
      maximumFractionDigits: maxFractionDigits,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    return String(value);
  }
}

export function formatMoney(value: number, numerals: Numerals, language: Language): string {
  const suffix = language === 'ar' ? 'د.ع' : 'IQD';
  return `${formatNumber(value, numerals)} ${suffix}`;
}
