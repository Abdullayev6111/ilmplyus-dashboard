/**
 * Sana bilan ishlash uchun umumiy yordamchi funksiyalar.
 *
 * Ichki (API/state) format: `YYYY-MM-DD` — hech qayerda o'zgartirilmaydi.
 * Ko'rsatish (UI) format:    `DD.MM.YYYY`.
 */

export const ISO_DATE_FORMAT = 'YYYY-MM-DD';
export const DISPLAY_DATE_FORMAT = 'DD.MM.YYYY';
export const DISPLAY_DATE_PLACEHOLDER = 'DD.MM.YYYY';

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `1.5.2026`, `01.5.2026`, `1.05.2026`, `01.05.2026` — hammasi qabul qilinadi. */
const TYPED_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

type DateParts = { year: number; month: number; day: number };

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Kalendarga mos kelishini tekshiradi (31.02 kabi sanalarni rad etadi). */
function isRealDate({ year, month, day }: DateParts): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}

/**
 * `YYYY-MM-DD` ni qismlarga ajratadi. `Date` ishlatilmaydi: `new Date('2026-05-01')`
 * UTC yarim tunni beradi va UTC'dan orqadagi zonalarda kun bir kunga suriladi.
 */
export function parseIsoDate(value: string | null | undefined): DateParts | null {
  if (!value) return null;
  const match = ISO_DATE_RE.exec(value.slice(0, 10));
  if (!match) return null;
  const parts = { year: +match[1], month: +match[2], day: +match[3] };
  return isRealDate(parts) ? parts : null;
}

/**
 * Qo'lda yozilayotgan matnni `DD.MM.YYYY` maskasiga soladi: nuqtalar avtomatik
 * qo'yiladi (`01052026` → `01.05.2026`), lekin foydalanuvchi o'zi nuqta bossa
 * segment nol bilan to'ldiriladi (`1.` → `01.`).
 *
 * Oxiriga nuqta o'zi qo'shilmaydi — aks holda `01.` dan Backspace bosilganda
 * nuqta darhol qaytib, o'chirish imkonsiz bo'lib qolardi.
 */
export function maskTypedDate(raw: string): string {
  const cleaned = raw
    .replace(/[^\d.]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\./, '');

  const typed = cleaned.split('.');
  const limits = [2, 2, 4];
  const segments: string[] = [];
  let overflow = '';

  for (let i = 0; i < limits.length; i++) {
    // Bu segmentdan keyin foydalanuvchi nuqta qo'ygan bo'lsa — segment yakunlangan.
    const closedByUser = i + 1 < typed.length;
    let segment = overflow + (typed[i] ?? '');
    overflow = '';

    if (segment.length > limits[i]) {
      overflow = segment.slice(limits[i]);
      segment = segment.slice(0, limits[i]);
    }
    if (closedByUser && i < 2 && segment.length === 1) segment = `0${segment}`;

    segments.push(segment);
    if (!overflow && !closedByUser) break;
  }

  return segments.join('.');
}

/** Foydalanuvchi yozgan matnni (`1.5.2026`) `YYYY-MM-DD` ga o'giradi. */
export function parseTypedDate(text: string): string | null {
  const match = TYPED_DATE_RE.exec(text.trim());
  if (!match) return null;
  const parts = { year: +match[3], month: +match[2], day: +match[1] };
  if (!isRealDate(parts)) return null;
  return toIsoDate(parts);
}

export function toIsoDate({ year, month, day }: DateParts): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Zona belgisi (`Z` yoki `+05:00`) bo'lmagan datetime: `2026-07-11 05:25:00`. */
const NAIVE_DATETIME_RE = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)(?:\.\d+)?$/;

/**
 * Backend'dan kelgan sana/vaqtni `Date` ga o'giradi.
 *
 * Backend vaqtni UTC da qaytaradi, lekin ba'zi javoblarda zona belgisi yo'q
 * (`2026-07-11 05:25:00`). Bunday satrni brauzer *mahalliy* vaqt deb o'qiydi,
 * natijada UTC+5 da 10:25 da qo'shilgan to'lov 05:25 bo'lib ko'rinadi.
 * Shuning uchun zonasiz datetime'ni aniq UTC deb belgilaymiz.
 *
 * Faqat sanadan iborat qiymat (`2026-07-11`) esa mahalliy kun deb olinadi —
 * aks holda `new Date()` uni UTC yarim tuni deb o'qib, kunni bir kun surardi.
 */
export function parseServerDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === 'string') {
    const text = value.trim();

    const dateOnly = parseIsoDate(text);
    if (dateOnly && text.length === 10) {
      return new Date(dateOnly.year, dateOnly.month - 1, dateOnly.day);
    }

    const naive = NAIVE_DATETIME_RE.exec(text);
    if (naive) {
      const utc = new Date(`${naive[1]}T${naive[2]}Z`);
      return Number.isNaN(utc.getTime()) ? null : utc;
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `Date` obyektini mahalliy vaqt bo'yicha `YYYY-MM-DD` ga o'giradi. */
export function dateToIso(date: Date): string {
  return toIsoDate({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}

/** `YYYY-MM-DD` → `DD.MM.YYYY`. Noto'g'ri qiymatda `''`. */
export function isoToDisplay(value: string | null | undefined): string {
  const parts = parseIsoDate(value);
  if (!parts) return '';
  return `${pad2(parts.day)}.${pad2(parts.month)}.${parts.year}`;
}

/**
 * Har qanday sana qiymatini (`YYYY-MM-DD`, ISO datetime, `Date`) `DD.MM.YYYY` ga o'giradi.
 * Jadval, detail sahifa va boshqa faqat-o'qish joylari uchun.
 */
export function formatDate(
  value: string | number | Date | null | undefined,
  fallback = '—',
): string {
  // `parseServerDate` sana-only qiymatni mahalliy kun, zonasiz datetime'ni esa
  // UTC deb o'qiydi — shuning uchun kun har doim mahalliy vaqtda to'g'ri chiqadi.
  const date = parseServerDate(value);
  if (!date) return fallback;
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

/** `HH:mm DD.MM.YYYY` — mahalliy vaqtda (UTC+5). */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  fallback = '—',
): string {
  const date = parseServerDate(value);
  if (!date) return fallback;
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  return `${time} ${formatDate(date, fallback)}`;
}

/** `HH:mm:ss` — mahalliy vaqtda. */
export function formatTime(
  value: string | number | Date | null | undefined,
  fallback = '—',
): string {
  const date = parseServerDate(value);
  if (!date) return fallback;
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

/** `min`/`max` chegaralarini tekshiradi (ikkalasi ham `YYYY-MM-DD`). */
export function isWithinRange(iso: string, min?: string, max?: string): boolean {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}
