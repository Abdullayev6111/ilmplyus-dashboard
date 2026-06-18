import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  oquvchi: "O'quvchilar Analitikasi",
  oqituvchi: "O'qituvchilar & Xonalar",
  moliya: 'Kompleks Moliya',
};

const RolePermissions = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [permissionsState, setPermissionsState] = useState<Record<string, PermissionItem[]>>({});

  const [visibleTabs, setVisibleTabs] = useState<MainTab[]>([...ALL_TABS]);
  const [tabsInitialized, setTabsInitialized] = useState(false);

  // Fetch all available permissions from the backend
  const { data: allPermissions, isLoading: isLoadingAll } = useQuery<any[]>({
    queryKey: ['permissions-all'],
    queryFn: async () => {
      const { data } = await API.get('/permissions');
      return Array.isArray(data) ? data : data?.data || [];
    },
    staleTime: Infinity,
  });

  // Fetch the role's current permissions
  const { data: roleData, isLoading: isLoadingRole } = useQuery({
    queryKey: ['role', id],
    queryFn: async () => {
      const { data } = await API.get(`/roles/${id}`);
      return data?.data || data;
    },
    enabled: !!id,
  });

  // Fetch dashboard section visibility settings
  const { data: dashboardSettings, isLoading: isLoadingDash } = useQuery({
    queryKey: ['dashboard-settings'],
    queryFn: fetchDashboardSettings,
    staleTime: 5 * 60 * 1000,
  });

  // Initialize visible dashboard tabs from saved settings
  useEffect(() => {
    if (roleData && dashboardSettings && !tabsInitialized) {
      if (roleData.name !== 'admin') {
        const stored = dashboardSettings.roleVisibility[roleData.name];
        setVisibleTabs(stored ? ([...stored] as MainTab[]) : [...ALL_TABS]);
      }
      setTabsInitialized(true);
    }
  }, [roleData, dashboardSettings, tabsInitialized]);

  // Initialize state based on role's existing permissions
  useEffect(() => {
    if (roleData && roleData.permissions) {
      const initialState: Record<string, PermissionItem[]> = {};

      roleData.permissions.forEach((perm: any) => {
        const permId = perm.id;
        const permName = typeof perm === 'string' ? perm : perm.name;

        if (!permName || !permId) return;

        const [moduleName, action] = permName.split('.');
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

    // Filter rules array to only those having a "view" action
    const validModules = Object.keys(modulesMap).filter((moduleName) =>
      modulesMap[moduleName].some((p) => p.action === 'view'),
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
  });

  const saveDashMutation = useMutation({
    mutationFn: async (newVis: Record<string, string[]>) => {
      await saveDashboardSettings({
        tabNames: dashboardSettings?.tabNames ?? {},
        roleVisibility: newVis,
      });
    },
  });

  const handleActionChange = (moduleName: string, selectedActions: PermissionItem[]) => {
    setPermissionsState((prev) => ({
      ...prev,
      [moduleName]: selectedActions,
    }));
  };

  const handleSave = async () => {
    const payload: number[] = Object.values(permissionsState)
      .flat()
      .map((p) => p.id);

    await savePermissionsMutation.mutateAsync(payload);

    if (roleData?.name && roleData.name !== 'admin') {
      const newVis: Record<string, string[]> = {
        ...(dashboardSettings?.roleVisibility ?? {}),
        [roleData.name]: visibleTabs,
      };
      await saveDashMutation.mutateAsync(newVis);
    }

    navigate('/roles');
  };

  if (isLoadingAll || isLoadingRole || isLoadingDash) {
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
        {t('roles.permissionsTitle', 'Huquqlarni boshqarish: ')}
        {roleData?.name}
      </h1>

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
          disabled={savePermissionsMutation.isPending || saveDashMutation.isPending}
        >
          {savePermissionsMutation.isPending || saveDashMutation.isPending
            ? t('roles.saving', 'Saqlanmoqda...')
            : t('roles.save', 'Saqlash')}
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

        {/* Dashboard bo'limlari visibility card */}
        <div className="permission-card">
          <h3 className="permission-card-title">
            {t('roles.dashboardSections', "Dashboard bo'limlari")}
          </h3>
          <div className="permission-checkboxes">
            {ALL_TABS.map((tab) => (
              <label key={tab} className="permission-checkbox-label">
                {roleData?.name === 'admin' ? (
                  <input type="checkbox" checked disabled />
                ) : (
                  <input
                    type="checkbox"
                    checked={visibleTabs.includes(tab)}
                    onChange={() =>
                      setVisibleTabs((prev) =>
                        prev.includes(tab) ? prev.filter((t) => t !== tab) : [...prev, tab],
                      )
                    }
                  />
                )}

                {(dashboardSettings?.tabNames?.[tab] ?? '').trim() || TAB_LABELS[tab]}
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RolePermissions;
