import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { API } from "../../api/api";
import { useTranslation } from "react-i18next";
import PermissionCard from "../../components/roles/PermissionCard";
import type { PermissionItem } from "../../types/common.types";
import "./roles.css";

const RolePermissions = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [permissionsState, setPermissionsState] = useState<
    Record<string, PermissionItem[]>
  >({});

  // Fetch all available permissions from the backend
  const { data: allPermissions, isLoading: isLoadingAll } = useQuery<any[]>({
    queryKey: ["permissions-all"],
    queryFn: async () => {
      const { data } = await API.get("/permissions");
      return Array.isArray(data) ? data : data?.data || [];
    },
    staleTime: Infinity,
  });

  // Fetch the role's current permissions
  const { data: roleData, isLoading: isLoadingRole } = useQuery({
    queryKey: ["role", id],
    queryFn: async () => {
      const { data } = await API.get(`/roles/${id}`);
      return data?.data || data;
    },
    enabled: !!id,
  });

  // Initialize state based on role's existing permissions
  useEffect(() => {
    if (roleData && roleData.permissions) {
      const initialState: Record<string, PermissionItem[]> = {};

      roleData.permissions.forEach((perm: any) => {
        const permId = perm.id;
        const permName = typeof perm === "string" ? perm : perm.name;

        if (!permName || !permId) return;

        const [moduleName, action] = permName.split(".");
        if (moduleName && action) {
          if (!initialState[moduleName]) {
            initialState[moduleName] = [];
          }
          initialState[moduleName].push({ id: permId, action });
        }
      });
      setPermissionsState(initialState);
    }
  }, [roleData]);

  // Handle building the modules structure only keeping modules that have ".view"
  const groupedModules = useMemo(() => {
    if (!allPermissions) return [];

    const modulesMap: Record<string, PermissionItem[]> = {};

    allPermissions.forEach((perm: any) => {
      const permId = perm.id;
      const permName = typeof perm === "string" ? perm : perm.name;

      if (!permName || !permId) return;

      const [moduleName, action] = permName.split(".");
      if (moduleName && action) {
        if (!modulesMap[moduleName]) {
          modulesMap[moduleName] = [];
        }
        modulesMap[moduleName].push({ id: permId, action });
      }
    });

    // Filter rules array to only those having a "view" action
    const validModules = Object.keys(modulesMap).filter((moduleName) =>
      modulesMap[moduleName].some((p) => p.action === "view"),
    );

    return validModules.map((moduleName) => ({
      moduleName,
      availableActions: modulesMap[moduleName],
    }));
  }, [allPermissions]);

  const savePermissionsMutation = useMutation({
    mutationFn: async (payload: number[]) => {
      const { data } = await API.post(`/roles/${id}/permissions`, {
        permissions: payload,
      });
      return data;
    },
    onSuccess: () => {
      navigate("/roles");
    },
  });

  const handleActionChange = (
    moduleName: string,
    selectedActions: PermissionItem[],
  ) => {
    setPermissionsState((prev) => ({
      ...prev,
      [moduleName]: selectedActions,
    }));
  };

  const handleSave = () => {
    // Extract only IDs
    const payload: number[] = Object.values(permissionsState)
      .flat()
      .map((p) => p.id);

    savePermissionsMutation.mutate(payload);
  };

  if (isLoadingAll || isLoadingRole) {
    return (
      <div className="role-container container">
        {/* HEADER SKELETON */}
        <div className="permissions-header">
          <div className="skeleton skeleton-input" />
          <div className="skeleton skeleton-button" />
        </div>

        {/* CARDS GRID */}
        <div className="permission-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="permission-card skeleton-card">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-select" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="role-container container">
      <h1 className="role-page-title">
        {t("roles.permissionsTitle", "Huquqlarni boshqarish: ")}
        {roleData?.name}
      </h1>

      <div className="role-header-actions">
        <button
          className="role-cancel-btn"
          onClick={() => navigate("/roles")}
          style={{ marginRight: "10px" }}
        >
          {t("roles.back", "Ortga")}
        </button>
        <button
          className="role-save-btn"
          onClick={handleSave}
          disabled={savePermissionsMutation.isPending}
        >
          {savePermissionsMutation.isPending
            ? t("roles.saving", "Saqlanmoqda...")
            : t("roles.save", "Saqlash")}
        </button>
      </div>

      <div className="permission-grid">
        {groupedModules.map(({ moduleName, availableActions }) => (
          <PermissionCard
            key={moduleName}
            moduleName={moduleName}
            availableActions={availableActions}
            selectedActions={permissionsState[moduleName] || []}
            onChange={(selected) => handleActionChange(moduleName, selected)}
          />
        ))}
      </div>
    </section>
  );
};

export default RolePermissions;
