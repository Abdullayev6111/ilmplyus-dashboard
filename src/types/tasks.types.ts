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
  description: string;
  lid: {
    id?: number;
    first_name: string;
    last_name: string;
    father_name: string;
    phone: string;
    comment: string;
  };
  operator: {
    id: number;
    full_name: string;
    phone: string;
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
  comment: string;
}

export interface CreateTaskPayload {
  lid_id: number;
  operator_id: number;
  deadline: string;
  priority: TaskPriority;
  description: string;
}

export interface UpdateTaskPayload {
  priority: TaskPriority;
  deadline: string;
  operator_id: number;
  description: string;
}

export interface UpdateTaskStatusPayload {
  taskId: number;
  status: TaskStatus;
}

export interface AddTaskCommentPayload {
  task_id: number;
  comment: string;
  user_id: number;
}
