import type { ApiResponse } from "./common.types";

export interface Task {
  id: number;
  title: string;
  description_uz?: string;
  description_ru?: string;
  description_en?: string;
  status: "pending" | "in_progress" | "completed";
  assigned_to?: number;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
}

export type TasksResponse = ApiResponse<Task[]>;

export interface TaskPayload {
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  assigned_to?: number;
  due_date?: string;
}
