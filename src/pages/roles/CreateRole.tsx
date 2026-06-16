import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "../../api/api";
import { useTranslation } from "react-i18next";
import PermissionCard from "../../components/roles/PermissionCard";
import type { PermissionItem } from "../../types/common.types";
import "./roles.css";

const CreateRole = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [roleName, setRoleName] = useState("");
  const [permissionsState, setPermissionsState] = useState<Record<string, PermissionItem[]>>({});

  const { data: allPermissions, isLoading } = useQuery<any[]>({
    queryKey: ["permissions-all"],
    queryFn: async () => {
      const { data } = await API.get("/permissions");
      return Array.isArray(data) ? data : data?.data || [];
    },
    staleTime: Infinity,
  });

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

    const validModules = Object.keys(modulesMap).filter((moduleName) =>
      modulesMap[moduleName].some((p) => p.action === "view")
    );

    return validModules.map((moduleName) => ({
      moduleName,
      availableActions: modulesMap[moduleName],
    }));
  }, [allPermissions]);

  const createRoleMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await API.post("/roles", { name });
      return data?.data || data;
    },
  });

  const assignPermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: number; permissions: number[] }) => {
      const { data } = await API.post(`/roles/${roleId}/permissions`, { permissions });
      return data;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["roles"], type: "all" });
      navigate("/roles");
    },
  });

  const handleSave = async () => {
    if (!roleName.trim()) return;

    const permissionIds: number[] = Object.values(permissionsState).flat().map((p) => p.id);

    const newRole = await createRoleMutation.mutateAsync(roleName.trim());
    const roleId = newRole?.id;
    if (roleId) {
      assignPermissionsMutation.mutate({ roleId, permissions: permissionIds });
    }
  };

  const handleActionChange = (moduleName: string, selectedActions: PermissionItem[]) => {
    setPermissionsState((prev) => ({
      ...prev,
      [moduleName]: selectedActions,
    }));
  };

  const isPending = createRoleMutation.isPending || assignPermissionsMutation.isPending;

  if (isLoading) {
    return (
      <div className="role-container container">
        <div className="permissions-header">
          <div className="skeleton skeleton-input" />
          <div className="skeleton skeleton-button" />
        </div>
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
        {t("roles.createRoleTitle", "Yangi rol yaratish")}
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
          disabled={isPending || !roleName.trim()}
        >
          {isPending
            ? t("roles.saving", "Saqlanmoqda...")
            : t("roles.save", "Saqlash")}
        </button>
      </div>

      <div className="create-role-name-section">
        <label className="create-role-name-label">
          {t("roles.roleName", "Rol nomi")}
        </label>
        <input
          type="text"
          className="create-role-name-input"
          placeholder={t("roles.rolePlaceholder", "Nomini kiriting")}
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
        />
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

export default CreateRole;
