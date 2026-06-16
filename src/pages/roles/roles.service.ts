import { API } from '@/api/api';

export interface Permission {
  id: number;
  name: string;
}

export interface Role {
  id: number;
  name: string;
  permissions: Permission[];
}

export const fetchPermissions = async (): Promise<Permission[]> => {
  const { data } = await API.get<Permission[]>('/permissions');
  return data;
};

export const fetchRoles = async (): Promise<Role[]> => {
  const { data } = await API.get<Role[]>('/roles');
  return data;
};

export const syncRolePermissions = async (
  roleId: number,
  permissionIds: number[],
): Promise<void> => {
  await API.post(`/roles/${roleId}/permissions`, { permissions: permissionIds });
};
