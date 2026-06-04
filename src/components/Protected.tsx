import React from 'react';
import { usePermission } from '../hooks/usePermission';

interface ProtectedProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  scopePermissions?: string[];
}

export const Protected: React.FC<ProtectedProps> = ({
  permission,
  children,
  fallback = null,
  scopePermissions,
}) => {
  const hasGlobalPermission = usePermission(permission);

  if (scopePermissions) {
    const hasLocalPermission = scopePermissions.includes(permission);
    if (!hasLocalPermission) return <>{fallback}</>;
    return <>{children}</>;
  }

  if (!hasGlobalPermission) return <>{fallback}</>;

  return <>{children}</>;
};
