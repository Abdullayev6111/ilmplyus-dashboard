import type { Branch } from "./common.types";
import type { Course } from "./course.types";
import type { Level } from "./level.types";

export interface CoursePrice {
  id: number;
  branch_id: number;
  course_id: number;
  level_id: number;
  old_price: string;
  new_price: string;
  lessons_count: number;
  lesson_price: string;
  percentage: number;
  start_date: string;
  comment: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  course: Course;
  level: Level;
  branch: Branch;
}

export interface CoursePriceListResponse {
  data: CoursePrice[];
  current_page: number;
  last_page: number;
  from: number;
  to: number;
  total: number;
  per_page: number;
}

export interface CoursePricePayload {
  branch_id: number;
  course_id: number;
  level_id: number;
  old_price: number;
  new_price: number;
  lessons_count: number;
  lesson_price: number;
  percentage: number;
  start_date: string;
  comment: string;
}
