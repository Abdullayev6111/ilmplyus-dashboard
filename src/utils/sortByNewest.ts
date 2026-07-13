/**
 * Jadvallarda eng oxirgi qo'shilgan ma'lumot birinchi bo'lib chiqishi uchun.
 * `created_at` bo'lsa o'sha bo'yicha, aks holda `id` bo'yicha kamayish tartibida saralaydi.
 * Kiruvchi massiv o'zgartirilmaydi.
 */
type Sortable = {
  id?: number | string | null;
  created_at?: string | null;
};

function timestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function numericId(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(n) ? null : n;
}

export function compareByNewest(a: Sortable, b: Sortable): number {
  const aTime = timestamp(a.created_at);
  const bTime = timestamp(b.created_at);
  if (aTime !== null && bTime !== null && aTime !== bTime) return bTime - aTime;

  const aId = numericId(a.id);
  const bId = numericId(b.id);
  if (aId !== null && bId !== null) return bId - aId;

  return 0;
}

export function sortByNewest<T extends Sortable>(rows: readonly T[] | null | undefined): T[] {
  if (!rows) return [];
  return [...rows].sort(compareByNewest);
}
