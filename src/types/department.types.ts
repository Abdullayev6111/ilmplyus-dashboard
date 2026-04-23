import type { Branch, ApiResponse } from "./common.types";

export interface DepartmentType {
  id: number;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  code: string;
  branch_id: number;
  manager: string;
  is_active: boolean;
  branch: Branch;
}

export type DepartmentsResponse = ApiResponse<DepartmentType[]>;

export interface DepartmentPayload {
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  code: string;
  branch_id: number;
  manager: string;
  is_active: boolean;
}
