import type { Role, Position, ApiResponse, BaseEntity } from './common.types';
import type { DepartmentType } from './department.types';

export interface User {
  id: number;
  full_name: string;
  username: string;
  phone: string;
  type: string;
  is_active: boolean;
  branch: Branch | null;
  branches?: Branch[];
  roles: Role[];
  created_at: string;
  updated_at?: string;
  position?: Position | null;
  pinfl?: string;
  departments?: DepartmentType[];
}

export type UsersResponse = ApiResponse<User[]>;

export interface UserPayload {
  full_name: string;
  username: string;
  phone: string;
  password?: string;
  pinfl: string;
  position_id?: number | null;
  roles: number[];
  branch_ids: number[];
  department_ids: number[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  image?: File | null;
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
