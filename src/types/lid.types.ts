import type { BaseEntity, PaginatedResponse } from './common.types';
import type { Region } from './region.types';
import type { District } from './district.types';
import type { Branch } from './users.types';
import type { Course, CourseLevel } from './course.types';
import type { Group } from './groups.types';
import { getLocalized } from '@/utils/getLocalized';
import type { CoursePrice } from './course-price.types';

export interface LidSource extends BaseEntity {
  name: string;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  link?: string;
}

export interface LidOperator extends BaseEntity {
  first_name: string;
  last_name: string;
  middle_name: string | null;
  branch_id: number;
}

export const LID_STATUS = {
  NEW_ONLINE: 1, // Onlayn
  NEW_OFFLINE: 2, // Ofline
  CONTACTED: 3, // O‘rnatildi
  NOT_CONTACTED: 4, // O‘rnatilmadi
  NOT_INTERESTED: 5, // Qiziqmadi
  DEMO_SCHEDULED: 6, // Kelmoqchi
  DEMO_ATTENDED: 7, // Keldi
  DEMO_MISSED: 8, // Kelmadi
  CONTRACT_SIGNED: 9, // Shartnoma
  PAID: 10, // To‘lov
} as const;

export type LidStatus = (typeof LID_STATUS)[keyof typeof LID_STATUS];

export interface Lid extends BaseEntity {
  first_name: string;
  last_name: string;
  father_name: string | null;
  birth_date: string | null;
  gender: 'male' | 'female';
  phone: string;
  region_id: number | null;
  district_id: number | null;
  branch_id: number | null;
  course_id: number | null;
  level_id: number | null;
  group_id: number | null;
  source_id: number | null;
  comments: LidComment[];
  status: LidStatus;
  region: Region | null;
  district: District | null;
  branch: Branch | null;
  course: Course | null;
  level: CourseLevel | null;
  group: Group | null; // TODO: Define Group specifically for Lid if needed, or use Group from group.types
  source: LidSource | null;
  operator: LidOperator | null;
  course_price?: CoursePrice | null;
  permissions?: string[];
}

export type LidsPaginatedResponse = PaginatedResponse<Lid[]>;

export interface LidComment {
  text: string;
  author_name: string | null;
  created_at: string;
}

export interface CreateLidPayload {
  first_name: string;
  last_name: string;
  father_name: string;
  birth_date: string;
  gender: 'male' | 'female';
  phone: string;
  operator_id: string;
  region_id: string;
  district_id: string;
  branch_id: string;
  course_id: string;
  level_id: string;
  group_id: string;
  source_id: string;
  comment: string;
  status: number;
}

// Helpers moved from lid.types.ts
export function getName(obj: any, lang: string): string {
  if (!obj) return '—';
  const localized = getLocalized(obj, 'name', lang);
  if (localized !== '-') return localized;
  return obj.name || '—';
}

export function formatGender(gender: Lid['gender'] | string): string {
  if (gender === 'male') return 'Erkak';
  if (gender === 'female') return 'Ayol';
  return gender || '—';
}

export function getSourceKey(source: LidSource | null | undefined): string {
  if (!source) return 'default';
  const name = source.name || source.name_uz || source.name_ru || source.name_en || '';
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'default';
}

export function getSourceLabel(source: LidSource | null | undefined, lang: string): string {
  if (!source) return '—';
  return getLocalized(source, 'name', lang);
}
