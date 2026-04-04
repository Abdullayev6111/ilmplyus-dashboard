export interface Course {
  id: number;
  name: string;
  branch?: {
    id: number;
    name: string;
  };
  level?: {
    id: number;
    name: string;
  };
  created_at: string;
}

export interface CoursePayload {
  name: string;
  branch_id: number;
  level_id: number;
}
