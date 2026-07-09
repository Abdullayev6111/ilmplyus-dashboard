import { useQuery } from '@tanstack/react-query';
import { API } from '../api/api';

/**
 * Forma dropdownlari (select) uchun yengil ro'yxatlar.
 *
 * GET /api/options/{entity} faqat `lookups.view` ruxsatini talab qiladi,
 * shuning uchun har bir bo'limning `.view` permissioni bo'lmagan foydalanuvchida
 * ham selectlar to'ldiriladi. To'liq bo'lim ro'yxatlari (/students, /groups ...)
 * o'rniga formalarda shu hookdan foydalaning.
 */
export type OptionEntity =
  | 'branches'
  | 'courses'
  | 'levels'
  | 'rooms'
  | 'groups'
  | 'students'
  | 'employees'
  | 'teachers'
  | 'users'
  | 'departments'
  | 'positions'
  | 'sources'
  | 'rejection-reasons'
  | 'regions'
  | 'districts'
  | 'jamgarmas'
  | 'chart-of-accounts'
  | 'expense-categories'
  | 'expense-subcategories'
  | 'payment-gateway-commissions'
  | 'roles';

export interface OptionItem {
  id: number;
  label: string;
  [extra: string]: unknown;
}

/** /options/courses har bir kursni o'ziga tegishli levellar bilan qaytaradi. */
export interface CourseOption extends OptionItem {
  levels?: OptionItem[];
}

export interface OptionParams {
  search?: string;
  limit?: number;
  [filter: string]: string | number | undefined;
}

/** Bo'sh (undefined/null/'') filtrlarni tashlab yuboradi. */
const cleanParams = (params?: OptionParams): OptionParams | undefined => {
  if (!params) return undefined;
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  return entries.length ? (Object.fromEntries(entries) as OptionParams) : undefined;
};

export const fetchOptions = async (
  entity: OptionEntity,
  params?: OptionParams,
): Promise<OptionItem[]> => {
  const { data } = await API.get<OptionItem[] | { data: OptionItem[] }>(`/options/${entity}`, {
    params: cleanParams(params),
  });
  return Array.isArray(data) ? data : data?.data ?? [];
};

const OPTIONS_STALE = 10 * 60 * 1000;
const OPTIONS_GC = 30 * 60 * 1000;

export const useOptions = (
  entity: OptionEntity,
  params?: OptionParams,
  options?: { enabled?: boolean },
) =>
  useQuery<OptionItem[]>({
    queryKey: ['options', entity, cleanParams(params) ?? null],
    queryFn: () => fetchOptions(entity, params),
    staleTime: OPTIONS_STALE,
    gcTime: OPTIONS_GC,
    enabled: options?.enabled ?? true,
  });

/** Mantine Select uchun: [{ value: '1', label: '...' }] */
export const toSelectData = (items: OptionItem[] | undefined) =>
  (items ?? []).map((item) => ({ value: String(item.id), label: item.label }));

/** { id, name } shaklini kutadigan selectlar uchun */
export const toIdName = (items: OptionItem[] | undefined) =>
  (items ?? []).map((item) => ({ id: item.id, name: item.label }));

/** Tanlangan kursning levellari (/options/courses ichidagi nested ro'yxat) */
export const getCourseLevels = (
  courses: OptionItem[] | undefined,
  courseId: number | string | null | undefined,
): OptionItem[] => {
  if (!courseId) return [];
  const course = (courses ?? []).find((c) => String(c.id) === String(courseId)) as
    | CourseOption
    | undefined;
  return course?.levels ?? [];
};

/** id bo'yicha label topish (jadvalda ko'rsatish uchun) */
export const findLabel = (items: OptionItem[] | undefined, id: number | string | null | undefined) =>
  (items ?? []).find((item) => String(item.id) === String(id))?.label ?? '-';
