import type { Branch, ApiResponse } from "./common.types";

export interface DepartmentType {
  id: number;
  name: string;
  code: string;
  branch_id: number;
  manager: string;
  is_active: boolean;
  branch: Branch;
}

export type DepartmentsResponse = ApiResponse<DepartmentType[]>;

export interface DepartmentPayload {
  name: string;
  code: string;
  branch_id: number;
  manager: string;
  is_active: boolean;
}
