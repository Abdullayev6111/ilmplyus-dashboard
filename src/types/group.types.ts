import type { BaseEntity, PaginationMeta } from './common.types';
import type { Branch } from './user.types';
import type { Course, CourseLevel } from './course.types';

export interface Room extends BaseEntity {
  name: string;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  capacity: number;
  floor?: number;
}

export interface Teacher extends BaseEntity {
  first_name: string;
  last_name: string;
  middle_name: string;
  branch_id: number;
  phone: string;
  pinfl?: string;
  full_name?: string;
}

export type Employee = Teacher;

export interface Group extends BaseEntity {
  name: string;
  branch: Branch;
  course: Course;
  level: CourseLevel;
  teacher: Teacher | null;
  room: Room | null;
  duration: number;
  max_students: number;
  start_date: string | null;
  end_date: string | null;
  start_time: string;
  end_time: string;
  days: string[];
  lids_count?: number;
  students_count?: number;
  leads_count?: number;
}

export interface GroupsApiResponse extends PaginationMeta {
  data: Group[];
  meta?: {
    last_page: number;
    total: number;
    current_page: number;
  };
}

export interface GroupCreatePayload {
  name: string;
  branch_id: number;
  course_id: number;
  level_id: number;
  teacher_id: number;
  room_id: number;
  duration: number;
  max_students: number;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  days: string[];
}

export interface GroupFilterState {
  courseId: string;
  levelId: string;
  teacherId: string;
  search: string;
}

export interface GroupsResult {
  groups: Group[];
  lastPage: number;
  total: number;
  length?: number;
}

export interface GroupStudentPivot {
  student_id: number;
  group_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface GroupStudentGroup {
  id: number;
  name: string;
  pivot?: GroupStudentPivot;
}

export interface GroupStudent {
  id: number;
  first_name: string;
  last_name: string;
  father_name?: string | null;
  full_name?: string;
  phone?: string;
  gender?: string;
  balance?: string;
  is_active?: boolean;
  branch_id?: number;
  groups?: GroupStudentGroup[];
  course_completion_pct?: number;
  attendance_pct?: number;
  debt?: number;
  manager_permission?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GroupStudentsApiResponse {
  data: GroupStudent[];
}

export type StudentStatusFilter = 'all' | 'permitted' | 'not_permitted';

export interface GroupTestAssignmentPayload {
  test_id: number;
  group_id: number;
  exam_date: string;
  start_time: string;
  end_time: string;
}

export interface StudentPermissionPayload {
  student_id: number;
  manager_permission: boolean;
}
