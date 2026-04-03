import type { ApiResponse } from './common.types';

export interface Group {
  id: number;
  name: string;
  course_id?: number;
  teacher_id?: number;
  branch_id?: number;
  room_id?: number;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type GroupsResponse = ApiResponse<Group[]>;

export interface GroupPayload {
  name: string;
  course_id: number;
  teacher_id: number;
  branch_id: number;
  room_id: number;
  start_date: string;
  is_active: boolean;
}
