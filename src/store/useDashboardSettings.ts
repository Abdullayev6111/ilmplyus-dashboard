import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDashboardSettings,
  saveDashboardSettings,
  type DashboardSettings,
} from "@/pages/dashboard/dashboard.service";

export type MainTab = "umumiy" | "sotuv" | "oquvchi" | "oqituvchi" | "moliya";

export const ALL_TABS: MainTab[] = ["umumiy", "sotuv", "oquvchi", "oqituvchi", "moliya"];

export const DASHBOARD_SETTINGS_KEY = ["dashboard-settings"] as const;

const EMPTY: DashboardSettings = { tabNames: {}, roleVisibility: {}, pagePermissions: {} };

function useDashboardSettings() {
  const queryClient = useQueryClient();

  const { data = EMPTY } = useQuery({
    queryKey: DASHBOARD_SETTINGS_KEY,
    queryFn: fetchDashboardSettings,
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: saveSettings, isPending: isSaving } = useMutation({
    mutationFn: saveDashboardSettings,
    onSuccess: (_result, variables) => {
      queryClient.setQueryData(DASHBOARD_SETTINGS_KEY, variables);
    },
  });

  const tabNames = data.tabNames as Partial<Record<MainTab, string>>;
  const roleVisibility = data.roleVisibility as Record<string, MainTab[]>;
  const pagePermissions = data.pagePermissions;

  const getVisibleTabs = (roleName: string): MainTab[] => {
    if (roleName === "admin") return ALL_TABS;
    return roleVisibility[roleName] ?? ALL_TABS;
  };

  return { tabNames, roleVisibility, pagePermissions, getVisibleTabs, saveSettings, isSaving };
}

export default useDashboardSettings;
