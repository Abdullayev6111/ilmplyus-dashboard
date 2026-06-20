import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import { useTranslation } from 'react-i18next';
import PermissionCard from '../../components/roles/PermissionCard';
import type { PermissionItem } from '../../types/common.types';
import { ALL_TABS, type MainTab } from '@/store/useDashboardSettings';
import { fetchDashboardSettings, saveDashboardSettings } from '@/pages/dashboard/dashboard.service';
import './roles.css';

const TAB_LABELS: Record<MainTab, string> = {
  umumiy: 'Umumiy Dashboard',
  sotuv: 'Sotuv va Lidlar',
  oquvchi: 'O‘quvchilar Analitikasi',
  oqituvchi: 'O‘qituvchilar & Xonalar',
  moliya: 'Kompleks Moliya',
};

const CreateRole = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [roleName, setRoleName] = useState('');
  const [permissionsState, setPermissionsState] = useState<Record<string, PermissionItem[]>>({});
  const [visibleTabs, setVisibleTabs] = useState<MainTab[]>([...ALL_TABS]);

  const { data: dashboardSettings, isLoading: isLoadingDash } = useQuery({
    queryKey: ['dashboard-settings'],
    queryFn: fetchDashboardSettings,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allPermissions, isLoading: isLoadingPerms } = useQuery<any[]>({
    queryKey: ['permissions-all'],
    queryFn: async () => {
      const { data } = await API.get('/permissions');
      return Array.isArray(data) ? data : data?.data || [];
    },
    staleTime: Infinity,
  });

  const { groupedModules, standalonePermissions } = useMemo(() => {
    if (!allPermissions) return { groupedModules: [], standalonePermissions: [] };

    const modulesMap: Record<string, PermissionItem[]> = {};

    allPermissions.forEach((perm: any) => {
      const permId = perm.id;
      const permName = typeof perm === 'string' ? perm : perm.name;
      if (!permName || !permId) return;

      const [moduleName, action] = permName.split('.');
      if (moduleName && action) {
        if (!modulesMap[moduleName]) {
          modulesMap[moduleName] = [];
        }
        modulesMap[moduleName].push({ id: permId, action });
      }
    });

    const groupedModules = Object.keys(modulesMap)
      .filter((moduleName) => modulesMap[moduleName].some((p) => p.action === 'view'))
      .map((moduleName) => ({ moduleName, availableActions: modulesMap[moduleName] }));

    const standalonePermissions = Object.keys(modulesMap)
      .filter((moduleName) => !modulesMap[moduleName].some((p) => p.action === 'view'))
      .flatMap((moduleName) =>
        modulesMap[moduleName].map((p) => ({
          id: p.id,
          action: p.action,
          moduleName,
          fullName: `${moduleName}.${p.action}`,
        })),
      );

    return { groupedModules, standalonePermissions };
  }, [allPermissions]);

  const createRoleMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await API.post('/roles', { name });
      return data?.data || data;
    },
  });

  const assignPermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: number; permissions: number[] }) => {
      const { data } = await API.post(`/roles/${roleId}/permissions`, { permissions });
      return data;
    },
  });

  const saveDashMutation = useMutation({
    mutationFn: async (newVis: Record<string, string[]>) => {
      await saveDashboardSettings({
        tabNames: dashboardSettings?.tabNames ?? {},
        roleVisibility: newVis,
      });
    },
  });

  const handleSave = async () => {
    if (!roleName.trim()) return;

    const permissionIds: number[] = Object.values(permissionsState)
      .flat()
      .map((p) => p.id);

    const newRole = await createRoleMutation.mutateAsync(roleName.trim());
    const roleId = newRole?.id;
    const roleName_ = newRole?.name ?? roleName.trim();
    if (roleId) {
      await assignPermissionsMutation.mutateAsync({ roleId, permissions: permissionIds });
      const newVis: Record<string, string[]> = {
        ...(dashboardSettings?.roleVisibility ?? {}),
        [roleName_]: visibleTabs,
      };
      await saveDashMutation.mutateAsync(newVis);
      await queryClient.refetchQueries({ queryKey: ['roles'], type: 'all' });
      navigate('/roles');
    }
  };

  const handleActionChange = (moduleName: string, selectedActions: PermissionItem[]) => {
    setPermissionsState((prev) => ({
      ...prev,
      [moduleName]: selectedActions,
    }));
  };

  const isPending =
    createRoleMutation.isPending ||
    assignPermissionsMutation.isPending ||
    saveDashMutation.isPending;

  if (isLoadingPerms || isLoadingDash) {
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
      <h1 className="role-page-title">{t('roles.createRoleTitle', 'Yangi rol yaratish')}</h1>

      <div className="role-header-actions">
        <button
          className="role-cancel-btn"
          onClick={() => navigate('/roles')}
          style={{ marginRight: '10px' }}
        >
          {t('roles.back', 'Ortga')}
        </button>
        <button
          className="role-save-btn"
          onClick={handleSave}
          disabled={isPending || !roleName.trim()}
        >
          {isPending ? t('roles.saving', 'Saqlanmoqda...') : t('roles.save', 'Saqlash')}
        </button>
      </div>

      <div className="create-role-top-row">
        <div className="create-role-name-section">
          <label className="create-role-name-label">{t('roles.roleName', 'Rol nomi')}</label>
          <input
            type="text"
            className="create-role-name-input"
            placeholder={t('roles.rolePlaceholder', 'Nomini kiriting')}
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
          />
        </div>

        {standalonePermissions.map((perm) => {
          const isChecked = (permissionsState[perm.moduleName] || []).some((a) => a.id === perm.id);
          return (
            <div key={perm.id} className="permission-card permission-card-standalone-header">
              <label className="permission-checkbox-label">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const current = permissionsState[perm.moduleName] || [];
                    if (e.target.checked) {
                      handleActionChange(perm.moduleName, [
                        ...current,
                        { id: perm.id, action: perm.action },
                      ]);
                    } else {
                      handleActionChange(
                        perm.moduleName,
                        current.filter((a) => a.id !== perm.id),
                      );
                    }
                  }}
                />
                <span className="permission-standalone-name">
                  {t(
                    `roles.standalonePermissions.${perm.moduleName}_${perm.action}`,
                    perm.fullName,
                  )}
                </span>
              </label>
            </div>
          );
        })}
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

        <div className="permission-card">
          <h3 className="permission-card-title">
            {t('roles.dashboardSections', 'Dashboard bo‘limlari')}
          </h3>
          <div className="permission-checkboxes">
            {ALL_TABS.map((tab) => (
              <label key={tab} className="permission-checkbox-label">
                <input
                  type="checkbox"
                  checked={visibleTabs.includes(tab)}
                  onChange={() =>
                    setVisibleTabs((prev) =>
                      prev.includes(tab) ? prev.filter((t) => t !== tab) : [...prev, tab],
                    )
                  }
                />
                {(dashboardSettings?.tabNames?.[tab] ?? '').trim() || TAB_LABELS[tab]}
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CreateRole;
