import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { API } from './api';
import { getLocalized } from '@/utils/getLocalized';

/**
 * Forma dropdownlari uchun yengil ro'yxatlar: GET /api/options/{entity}
 * Bo'limning o'z `*.view` ruxsati emas, faqat `lookups.view` talab qilinadi.
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

/**
 * Ichma-ich kelgan element (masalan `courses[].levels[]`). Backend uni `label` bilan ham,
 * ko'p tilli `name_uz` / `name_ru` ustunlari bilan ham qaytarishi mumkin — `optionLabel()`
 * ikkalasini ham qo'llab-quvvatlaydi.
 */
export interface NestedOption {
  id: number;
  label?: string;
  name?: string | null;
  name_uz?: string | null;
  name_ru?: string | null;
  name_en?: string | null;
}

/**
 * Ro'yxat elementining ko'rsatiladigan nomi.
 * `label` bo'lsa o'sha, aks holda joriy tildagi `name_*` ustuni.
 *
 * DIQQAT: to'g'ridan-to'g'ri `getLocalized(option, 'name', lang)` chaqirmang —
 * u `any` qabul qiladi, `label` ni tanimaydi va jimgina `"-"` qaytaradi.
 */
export function optionLabel(item: NestedOption | null | undefined, lang: string): string {
  if (!item) return '-';
  if (item.label) return item.label;
  return getLocalized(item, 'name', lang);
}

/** `id` va `label` har doim bo'ladi, qolgani entity'ning "extra" ustunlari. */
export interface Option {
  id: number;
  label: string;

  /** courses — daraja selecti uchun ichki ro'yxat. */
  levels?: NestedOption[];

  // ── Bog'lovchi id'lar ──
  branch_id?: number;
  course_id?: number;
  level_id?: number;
  teacher_id?: number;
  room_id?: number;
  region_id?: number;
  district_id?: number;
  department_id?: number;
  position_id?: number;
  expense_category_id?: number;
  chart_of_accounts_id?: number;

  // ── Yassi ustunlar ──
  branch_code?: string;
  student_code?: string;
  username?: string;
  account_type?: string;
  balance?: number | string;
  capacity?: number;
  start_date?: string | null;
  end_date?: string | null;
  floor?: number;
  commission_percent?: number | string;

  /** users / employees — operator↔xodim bog'lanishi va JSHSHIR autofill uchun. */
  pinfl?: string;
  /** branches — filial tanlanganda shahar maydonini to'ldirish uchun. */
  city?: string;
  /** students — to'lov formasida ko'rsatiladi. */
  last_payment_date?: string | null;

  // ── chart-of-accounts / jamgarmas ──
  status?: string;
  account_number?: string;
  cash_balance?: number | string;
  non_cash_balance?: number | string;
}

export type OptionParams = Record<string, string | number | boolean | null | undefined>;

/** Bo'sh (undefined/null/'') parametrlarni tashlab yuboradi. */
function cleanParams(params?: OptionParams): OptionParams {
  if (!params) return {};
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
}

export function optionsQueryKey(entity: OptionEntity, params?: OptionParams) {
  return ['options', entity, cleanParams(params)] as const;
}

export async function fetchOptions(entity: OptionEntity, params?: OptionParams): Promise<Option[]> {
  const { data } = await API.get(`/options/${entity}`, { params: cleanParams(params) });
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.data) ? data.data : [];
}

type UseOptionsExtra = Omit<UseQueryOptions<Option[], Error>, 'queryKey' | 'queryFn'>;

export function useOptions(entity: OptionEntity, params?: OptionParams, options?: UseOptionsExtra) {
  return useQuery<Option[], Error>({
    queryKey: optionsQueryKey(entity, params),
    queryFn: () => fetchOptions(entity, params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/** Mantine `<Select data={...} />` uchun. */
export function toSelectData(options: Option[] | undefined) {
  return (options ?? []).map((o) => ({ value: String(o.id), label: o.label }));
}
