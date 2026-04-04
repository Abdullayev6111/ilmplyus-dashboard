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
  name: string;
  address: string;
  city: string;
}

export interface Position {
  id: number;
  name: string;
}

export interface Role {
  id: number;
  name: string;
  branches?: Branch[];
}

export type PermissionItem = { id: number; action: string };
export type PermissionMap = Record<string, PermissionItem[]>;
