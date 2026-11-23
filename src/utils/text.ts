import type { DayHours, WorkingHours } from '../data/types';

/** Strips Arabic diacritics and unifies letter variants for keyword matching. */
export function normalizeArabic(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[،؛]/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

export function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

export function detectLanguage(text: string): 'ar' | 'en' {
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return arabic >= latin ? 'ar' : 'en';
}

/** Removes control chars and angle brackets; trims and caps length. */
export function sanitizeText(input: string, max = 1000): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    .trim()
    .slice(0, max);
}

export function normalizePhone(input: string): string {
  const clean = input.replace(/[\s\-().]/g, '');
  if (clean.startsWith('00')) return `+${clean.slice(2)}`;
  return clean;
}

const PHONE_RE = /^\+?[0-9]{10,15}$/;

export function isValidPhone(input: string): boolean {
  return PHONE_RE.test(normalizePhone(input));
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input);
}

export function isValidTime(time: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const [h, m] = time.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export function isValidHours(hours: WorkingHours): boolean {
  return (['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const).every((key) => {
    const day: DayHours | undefined = hours[key];
    if (!day) return false;
    return day.closed || (isValidTime(day.open) && isValidTime(day.close));
  });
}

export function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Converts data to CSV rows (RFC 4180-friendly). */
export function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvCell(row[h] ?? '')).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}`;
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function parseArabicNumber(input: string): number | null {
  const normalized = normalizeArabic(input);
  const digitMatch = normalized.match(/\d{1,4}/);
  if (digitMatch) return Number(digitMatch[0]);
  const words: Record<string, number> = {
    واحد: 1,
    واحدة: 1,
    ثنتين: 2,
    اثنين: 2,
    اثنتين: 2,
    قطعتين: 2,
    حبتين: 2,
    ثلاث: 3,
    ثلاثة: 3,
    اربع: 4,
    اربعة: 4,
    خمس: 5,
    خمسة: 5,
    ست: 6,
    ستة: 6,
    سبع: 7,
    سبعة: 7,
    ثمان: 8,
    ثمانية: 8,
    تسع: 9,
    تسعة: 9,
    عشر: 10,
    عشرة: 10,
  };
  for (const [word, value] of Object.entries(words)) {
    if (normalized.split(' ').includes(word)) return value;
  }
  return null;
}

export function uid(prefix = 'n'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
