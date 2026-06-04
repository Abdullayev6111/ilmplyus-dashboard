import type { ApiResponse, BaseEntity } from './common.types';
import type { Course } from './course.types';
import type { Level } from './level.types';
import type { Branch } from './common.types';

export interface Room {
  id: number;
  name: string;
  branch: string;
  capacity: number;
  floor: number;
}

export interface Teacher extends BaseEntity {
  first_name: string;
  last_name: string;
  middle_name: string;
  full_name?: string;
  branch_id: number;
  phone: string;
}


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
  // Schedule fields
  course?: Course;
  level?: Level;
  branch?: Branch;
  teacher?: ScheduleTeacher | null;
  room?: ScheduleRoom | null;
  days: string[];
  start_time: string;
  end_time: string;
  duration?: number;
  max_students?: number;
  students_count?: number;
  lids_count?: number;
  leads_count?: number;
}

export interface ScheduleTeacher {
  id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  branch_id?: number;
  phone?: string;
}

export interface ScheduleRoom {
  id: number;
  name: string;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  capacity?: number;
  floor?: number;
}

export interface GroupsApiResponse {
  data: Group[];
  meta?: {
    last_page: number;
    total: number;
    current_page: number;
  };
}

export type GroupsResponse = ApiResponse<Group[]>;

export interface GroupPayload {
  name: string;
  course_id: number;
  level_id: number;
  teacher_id: number;
  branch_id: number;
  room_id: number;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  max_students: number;
  days: string[];
  is_active: boolean;
  duration?: number;
}
