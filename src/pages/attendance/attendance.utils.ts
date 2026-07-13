export const STATUS_CODES = ['+', 'K', 'F', 'NB', 'S'] as const;
export type StatusCode = (typeof STATUS_CODES)[number];

const BACKEND_TO_CODE: Record<string, StatusCode> = {
  present: '+',
  late: 'K',
  no_uniform: 'F',
  absent: 'NB',
  excused: 'S',
  '+': '+',
  K: 'K',
  F: 'F',
  NB: 'NB',
  S: 'S',
};

const CODE_TO_BACKEND: Record<StatusCode, string> = {
  '+': 'present',
  K: 'late',
  F: 'no_uniform',
  NB: 'absent',
  S: 'excused',
};

const CODE_TO_CLASS: Record<StatusCode, string> = {
  '+': 'status-plus',
  K: 'status-k',
  F: 'status-f',
  NB: 'status-nb',
  S: 'status-s',
};

export const toStatusCode = (raw: string | null): StatusCode | null =>
  raw ? (BACKEND_TO_CODE[raw] ?? null) : null;

export const toBackendStatus = (code: StatusCode): string => CODE_TO_BACKEND[code];

export const statusClass = (code: StatusCode): string => CODE_TO_CLASS[code];

const CODE_TO_LABEL_KEY: Record<StatusCode, string> = {
  '+': 'attendance.legend.present',
  K: 'attendance.legend.late',
  F: 'attendance.legend.noUniform',
  NB: 'attendance.legend.absentNoExcuse',
  S: 'attendance.legend.absentWithExcuse',
};

/** Status kodining i18n kaliti — jadvalda belgi emas, matn ko'rsatish uchun */
export const statusLabelKey = (code: StatusCode): string => CODE_TO_LABEL_KEY[code];

/** "14:48:07" → "14:48" */
export const shortTime = (time?: string | null): string => (time ? time.slice(0, 5) : '');

/** Ikki vaqt orasidagi farq, "8s 12d" ko'rinishida */
export const durationBetween = (from?: string | null, to?: string | null): string => {
  if (!from || !to) return '-';
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const diff = toMinutes(to) - toMinutes(from);
  if (diff <= 0) return '-';
  return `${Math.floor(diff / 60)}s ${diff % 60}d`;
};
