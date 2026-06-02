import type { Branch, Role, Position, ApiResponse } from './common.types';
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
