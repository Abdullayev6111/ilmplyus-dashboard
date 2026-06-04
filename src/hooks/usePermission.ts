import useAuthStore from '../store/useAuthStore';

export const usePermission = (permissionName: string): boolean => {
  const user = useAuthStore((state) => state.user);

  if (!permissionName) return true;
  if (user?.role === 'admin') return true;

  const permissions = (user?.roles ?? []).flatMap(
    (role) => role.permissions?.map((p) => p.name) ?? [],
  );

  return permissions.includes(permissionName);
};
