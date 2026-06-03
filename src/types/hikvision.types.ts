import type { BaseEntity } from './common.types';
import type { Branch } from './common.types';

export interface HikvisionDevice extends BaseEntity {
  branch_id: number;
  name: string;
  ip_address: string;
  port: number;
  username: string;
  is_active: boolean;
  deleted_at: string | null;
  branch?: Branch;
}

export interface HikvisionDevicePayload {
  name: string;
  ip_address: string;
  port: number;
  username: string;
  password: string;
  branch_id: number;
}
