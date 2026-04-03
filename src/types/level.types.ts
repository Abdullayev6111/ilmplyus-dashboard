import type { Course } from "./course.types";

export interface Level {
  id: number;
  name: string;
  created_at: string;
  course: Course;
}

export interface LevelPayload {
  name: string;
  course_id: number;
}
