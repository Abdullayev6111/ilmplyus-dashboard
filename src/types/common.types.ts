export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  total: number;
  from: number;
  to: number;
}

export interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page?: number;
}

export interface ApiResponse<T> extends Pagination {
  data: T;
}

export interface PaginatedResponse<T> extends PaginationMeta {
  data: T;
}

export interface Branch {
  id: number;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  address?: string;
  city?: string;
  has_contract?: number;
  director_name?: string;
  postal_code?: string;
  legal_name?: string;
  inn?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  account_number?: string;
  mfo?: string;
  oked?: string;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Position {
  id: number;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
}

export interface Permissions {
  id: number;
  name: string;
}

export interface Role {
  id: number;
  name: string;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  guard_name?: string;
  branches?: Branch[];
  permissions?: Permissions[];
  created_at?: string;
  updated_at?: string;
}

export type PermissionItem = { id: number; action: string };
export type PermissionMap = Record<string, PermissionItem[]>;
