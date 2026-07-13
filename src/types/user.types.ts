import type { BaseEntity, PaginatedResponse } from "./common.types";

export interface Permission extends BaseEntity {
  name: string;
  guard_name?: string;
}

export interface Role extends BaseEntity {
  name: string;
  guard_name?: string;
  permissions?: Permission[];
}

export interface Branch extends BaseEntity {
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
}

export interface User extends BaseEntity {
  full_name: string;
  username: string;
  phone: string;
  role?: string | Role;
  roles?: Role[];
  role_id?: number;
  branch_id?: number;
  branch?: Branch;
  pinfl?: string;
}

export type UserListResponse = PaginatedResponse<User[]>;

export interface SaveUserPayload {
  full_name: string;
  username: string;
  phone: string;
  password?: string;
  role_id: number;
  branch_id: number;
}
