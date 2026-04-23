export interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page?: number;
}

export interface ApiResponse<T> extends Pagination {
  data: T;
}

export interface Branch {
  id: number;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  address: string;
  city: string;
}

export interface Position {
  id: number;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
}

export interface Role {
  id: number;
  name: string;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  guard_name?: string;
  branches?: Branch[];
}

export type PermissionItem = { id: number; action: string };
export type PermissionMap = Record<string, PermissionItem[]>;
