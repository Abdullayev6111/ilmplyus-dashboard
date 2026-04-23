import type { Branch } from "./common.types";
import type { Level } from "./level.types";

export interface Course {
  id: number;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  description_uz?: string;
  description_ru?: string;
  description_en?: string;
  is_active: number;
  branches: (Branch & { pivot?: { course_id: number; branch_id: number } })[];
  levels: (Level & { pivot?: { course_id: number; level_id: number } })[];
  created_at: string;
  updated_at: string;
}

export interface CoursePayload {
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  description_uz?: string;
  description_ru?: string;
  description_en?: string;
  branch_ids: number[];
  level_ids: number[];
}
