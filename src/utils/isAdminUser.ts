import type useAuthStore from '@/store/useAuthStore';

type AuthUser = ReturnType<typeof useAuthStore.getState>['user'];

/** Rol backend'dan uch xil shaklda kelishi mumkin: `roles[]`, `role` obyekti yoki oddiy satr. */
type UserWithRole = {
  roles?: { name?: string }[];
  role?: { name?: string } | string;
};

export function isAdminUser(user: AuthUser): boolean {
  if (!user) return false;
  const u = user as UserWithRole;
  if (Array.isArray(u.roles)) {
    return u.roles.some((r) => r.name?.toLowerCase().includes('admin'));
  }
  if (typeof u.role === 'object' && u.role !== null) {
    return u.role.name?.toLowerCase().includes('admin') ?? false;
  }
  if (typeof u.role === 'string') {
    return u.role.toLowerCase().includes('admin');
  }
  return false;
}
