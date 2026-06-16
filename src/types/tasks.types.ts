import type { ApiResponse } from './common.types';
import type { BaseEntity } from './common.types';

export type TaskPriority = 'shoshilinch' | 'orta' | 'sekin';
export type TaskStatus = 'yangi' | 'bajarish' | 'bajarildi' | 'bajarilmadi';

export interface Task extends BaseEntity {
  lid_id: number;
  operator_id: number;
  deadline: string;
  priority: TaskPriority;
  status: TaskStatus;
  description_uz: string;
  description_ru?: string;
  description_en?: string;
  lid: {
    id?: number;
    first_name: string;
    last_name: string;
    father_name: string;
    phone: string;
    comment?: string;
    comments?: { text: string; author_name: string; created_at: string }[];
  } | null;
  operator: {
    id: number;
    full_name: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
  };
  comments: TaskComment[] | null | undefined;
}

export type TasksResponse = ApiResponse<Task[]>;

export interface TaskPayload {
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: number;
  due_date?: string;
}

export interface TaskComment extends BaseEntity {
  task_id: number;
  user_id: number;
  comment_uz: string;
  comment_ru?: string;
  comment_en?: string;
}

export interface CreateTaskPayload {
  lid_id: number;
  operator_id: number;
  deadline: string;
  priority: TaskPriority;
  description_uz: string;
}

export interface UpdateTaskPayload {
  priority: TaskPriority;
  deadline: string;
  operator_id: number;
  description_uz: string;
}

export interface UpdateTaskStatusPayload {
  taskId: number;
  status: TaskStatus;
}

export interface AddTaskCommentPayload {
  task_id: number;
  comment_uz: string;
  user_id: number;
}
