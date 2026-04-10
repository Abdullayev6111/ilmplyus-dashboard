import type { Branch } from "./common.types";
import type { Level } from "./level.types";

export interface Course {
  id: number;
  name: string;
  description?: string;
  is_active: number;
  branches: (Branch & { pivot?: { course_id: number; branch_id: number } })[];
  levels: (Level & { pivot?: { course_id: number; level_id: number } })[];
  created_at: string;
  updated_at: string;
}

export interface CoursePayload {
  name: string;
  description?: string;
  branch_ids: number[];
  level_ids: number[];
}
