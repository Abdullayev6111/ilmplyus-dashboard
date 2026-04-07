import type { ApiResponse } from "./common.types";
import type { DepartmentType } from "./department.types";

export interface PositionItem {
  id: number;
  name: string;
  department: DepartmentType | null;
  created_at: string;
}

export type PositionsResponse = ApiResponse<PositionItem[]>;

export interface PositionPayload {
  name: string;
  department_id: number;
}
