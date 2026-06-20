import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import './dashboard.css';
import UmumiyTab from './UmumiyTab';
import SotuvTab from './SotuvTab';
import OquvchilarTab from './OquvchilarTab';
import OqituvchilarTab from './OqituvchilarTab';
import MoliyaTab from './MoliyaTab';
import DashboardSettingsModal from './DashboardSettingsModal';
import useAuthStore from '@/store/useAuthStore';
import useDashboardSettings, { ALL_TABS, type MainTab } from '@/store/useDashboardSettings';
import type { User } from '@/types/users.types';

function getRoleName(user: User | null): string {
  if (!user) return '';
  return user.roles?.[0]?.name ?? '';
}

const TAB_DOTS: Record<MainTab, string> = {
  umumiy: '#3b82f6',
  sotuv: '#a855f7',
  oquvchi: '#06b6d4',
  oqituvchi: '#6366f1',
  moliya: '#22c55e',
};

const Dashboard = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { tabNames, getVisibleTabs } = useDashboardSettings();

  const [activeTab, setActiveTab] = useState<MainTab>('umumiy');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const roleName = getRoleName(user);
  const isAdmin = roleName === 'admin';

  const allTabDefs = ALL_TABS.map((key) => ({
    key,
    defaultLabel: t(`dashboard.tabs.${key}`),
    dot: TAB_DOTS[key],
  }));

  const visibleKeys = getVisibleTabs(roleName);

  const visibleTabs = allTabDefs
    .filter((tab) => visibleKeys.includes(tab.key))
    .map((tab) => ({
      ...tab,
      label: (tabNames[tab.key] ?? '').trim() || tab.defaultLabel,
    }));

  const currentTab: MainTab = visibleKeys.includes(activeTab)
    ? activeTab
    : (visibleKeys[0] ?? 'umumiy');

  const defaultLabels = Object.fromEntries(
    allTabDefs.map((t) => [t.key, t.defaultLabel]),
  ) as Record<MainTab, string>;

  if (!isAdmin && visibleTabs.length === 0) {
    return null;
  }

  return (
    <section className="dashboard container">
      <nav className="dash-tabs" aria-label="Dashboard bo‘limlari">
        <div className="dash-tabs__list">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              className={`dash-tab${currentTab === tab.key ? ' dash-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              style={
                currentTab === tab.key ? ({ '--tab-color': tab.dot } as CSSProperties) : undefined
              }
            >
              <span className="dash-tab__dot" style={{ background: tab.dot }} />
              {tab.label}
            </button>
          ))}
        </div>

        {isAdmin && (
          <button
            className="dash-settings-btn"
            onClick={() => setSettingsOpen(true)}
            title={t('dashboard.settings.btnTitle')}
          >
            <i className="fa-solid fa-gear" />
          </button>
        )}
      </nav>

      {currentTab === 'umumiy' && <UmumiyTab />}
      {currentTab === 'sotuv' && <SotuvTab />}
      {currentTab === 'oquvchi' && <OquvchilarTab />}
      {currentTab === 'oqituvchi' && <OqituvchilarTab />}
      {currentTab === 'moliya' && <MoliyaTab />}

      {settingsOpen && (
        <DashboardSettingsModal
          onClose={() => setSettingsOpen(false)}
          defaultLabels={defaultLabels}
        />
      )}
    </section>
  );
};

export default Dashboard;
