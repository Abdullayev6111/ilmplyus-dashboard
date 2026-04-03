import type { Branch, Role, Position, ApiResponse } from './common.types';

export interface User {
  id: number;
  full_name: string;
  username: string;
  phone: string;
  type: string;
  is_active: boolean;
  branch: Branch | null;
  roles: Role[];
  created_at: string;
  updated_at?: string;
  position?: Position | null;
}

export type UsersResponse = ApiResponse<User[]>;

export interface UserPayload {
  full_name: string;
  username: string;
  phone: string;
  password?: string;
  type: string;
  position_id?: string | number | null;
  role_ids: string[] | number[];
  branch_ids: string[] | number[];
  is_active: boolean;
  image?: File | null;
}
