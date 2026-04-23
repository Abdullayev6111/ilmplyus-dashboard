import type { ApiResponse } from "./common.types";
import type { DepartmentType } from "./department.types";

export interface PositionItem {
  id: number;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  department: DepartmentType | null;
  created_at: string;
}

export type PositionsResponse = ApiResponse<PositionItem[]>;

export interface PositionPayload {
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  department_id: number;
}
