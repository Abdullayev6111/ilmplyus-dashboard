import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { fetchRoles } from '@/pages/roles/roles.service';
import useDashboardSettings, { ALL_TABS, type MainTab } from '@/store/useDashboardSettings';

interface Props {
  onClose: () => void;
  defaultLabels: Record<MainTab, string>;
}

export default function DashboardSettingsModal({ onClose, defaultLabels }: Props) {
  const { t } = useTranslation();
  const { tabNames, roleVisibility, pagePermissions, saveSettings, isSaving } = useDashboardSettings();

  const [section, setSection] = useState<'names' | 'visibility'>('names');

  // Local state — applied only on Save
  const [localNames, setLocalNames] = useState<Partial<Record<MainTab, string>>>({
    ...tabNames,
  });
  const [localVis, setLocalVis] = useState<Record<string, MainTab[]>>({
    ...roleVisibility,
  });

  const { data: rolesRaw, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles-settings'],
    queryFn: fetchRoles,
  });

  // API may return plain array or wrapped { data: [] }
  const roles = Array.isArray(rolesRaw)
    ? rolesRaw
    : Array.isArray((rolesRaw as unknown as { data: typeof rolesRaw })?.data)
      ? ((rolesRaw as unknown as { data: typeof rolesRaw }).data as typeof rolesRaw)
      : [];

  const nonAdminRoles = (roles ?? []).filter((r) => r.name !== 'admin');

  function handleSave() {
    const newTabNames: Record<string, string> = {};
    ALL_TABS.forEach((tab) => {
      const name = (localNames[tab] ?? '').trim();
      if (name) newTabNames[tab] = name;
    });
    saveSettings({ tabNames: newTabNames, roleVisibility: localVis, pagePermissions }, { onSuccess: onClose });
  }

  function isVisible(roleName: string, tab: MainTab): boolean {
    const saved = localVis[roleName];
    if (!saved) return true;
    return saved.includes(tab);
  }

  function toggleTab(roleName: string, tab: MainTab) {
    const current = localVis[roleName] ?? ALL_TABS;
    const next = current.includes(tab) ? current.filter((k) => k !== tab) : [...current, tab];
    setLocalVis((prev) => ({ ...prev, [roleName]: next }));
  }

  function tabLabel(tab: MainTab) {
    return (localNames[tab] ?? '').trim() || defaultLabels[tab];
  }

  return (
    <div className="dsm-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dsm-modal">
        {/* Header */}
        <div className="dsm-header">
          <h2 className="dsm-title">
            <i className="fa-solid fa-gear" style={{ marginRight: 8, color: '#6366f1' }} />
            {t('dashboard.settings.title')}
          </h2>
          <button className="dsm-close" onClick={onClose} aria-label="yopish">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="dsm-sections">
          <button
            className={`dsm-section-tab${section === 'names' ? ' dsm-section-tab--active' : ''}`}
            onClick={() => setSection('names')}
          >
            <i className="fa-solid fa-pen" />
            {t('dashboard.settings.tabNames')}
          </button>
          <button
            className={`dsm-section-tab${section === 'visibility' ? ' dsm-section-tab--active' : ''}`}
            onClick={() => setSection('visibility')}
          >
            <i className="fa-solid fa-eye" />
            {t('dashboard.settings.visibility')}
          </button>
        </div>

        {/* Body */}
        <div className="dsm-body">
          {/* ── Tab name editing ─────────────────────────────── */}
          {section === 'names' && (
            <>
              <p className="dsm-hint">{t('dashboard.settings.hintNames')}</p>
              <table className="dsm-table">
                <thead>
                  <tr>
                    <th>{t('dashboard.settings.defaultName')}</th>
                    <th>{t('dashboard.settings.customName')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ALL_TABS.map((tab) => (
                    <tr key={tab}>
                      <td className="dsm-default-label">
                        <span
                          className="dsm-tab-dot"
                          style={{
                            background: {
                              umumiy: '#3b82f6',
                              sotuv: '#a855f7',
                              oquvchi: '#06b6d4',
                              oqituvchi: '#6366f1',
                              moliya: '#22c55e',
                            }[tab],
                          }}
                        />
                        {defaultLabels[tab]}
                      </td>
                      <td>
                        <input
                          className="dsm-input"
                          value={localNames[tab] ?? ''}
                          onChange={(e) =>
                            setLocalNames((prev) => ({ ...prev, [tab]: e.target.value }))
                          }
                          placeholder={defaultLabels[tab]}
                        />
                      </td>
                      <td>
                        {(localNames[tab] ?? '').trim() && (
                          <button
                            className="dsm-reset-btn"
                            title="Standartga qaytarish"
                            onClick={() =>
                              setLocalNames((prev) => {
                                const n = { ...prev };
                                delete n[tab];
                                return n;
                              })
                            }
                          >
                            <i className="fa-solid fa-rotate-left" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* ── Role visibility matrix ────────────────────────── */}
          {section === 'visibility' && (
            <>
              <p className="dsm-hint">{t('dashboard.settings.hintVisibility')}</p>
              {rolesLoading ? (
                <div className="dash-loading">{t('dashboard.common.loading')}</div>
              ) : (
                <div className="dsm-vis-wrap">
                  <table className="dsm-table dsm-vis-table">
                    <thead>
                      <tr>
                        <th>{t('dashboard.settings.role')}</th>
                        {ALL_TABS.map((tab) => (
                          <th key={tab} className="dsm-vis-th">
                            <span
                              className="dsm-tab-dot"
                              style={{
                                background: {
                                  umumiy: '#3b82f6',
                                  sotuv: '#a855f7',
                                  oquvchi: '#06b6d4',
                                  oqituvchi: '#6366f1',
                                  moliya: '#22c55e',
                                }[tab],
                              }}
                            />
                            {tabLabel(tab)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Admin row — locked */}
                      <tr className="dsm-vis-row dsm-vis-row--admin">
                        <td className="dsm-role-cell">
                          <span className="dsm-role-badge dsm-role-badge--admin">admin</span>
                          <span className="dsm-locked-note">
                            <i className="fa-solid fa-lock" />
                          </span>
                        </td>
                        {ALL_TABS.map((tab) => (
                          <td key={tab} className="dsm-check-cell">
                            <span className="dsm-check--locked">
                              <i className="fa-solid fa-check" />
                            </span>
                          </td>
                        ))}
                      </tr>

                      {nonAdminRoles.length === 0 ? (
                        <tr>
                          <td colSpan={ALL_TABS.length + 1} className="dsm-empty">
                            {t('dashboard.settings.noRoles')}
                          </td>
                        </tr>
                      ) : (
                        nonAdminRoles.map((role) => (
                          <tr key={role.id} className="dsm-vis-row">
                            <td className="dsm-role-cell">
                              <span className="dsm-role-badge">{role.name}</span>
                            </td>
                            {ALL_TABS.map((tab) => (
                              <td key={tab} className="dsm-check-cell">
                                <input
                                  type="checkbox"
                                  className="dsm-checkbox"
                                  checked={isVisible(role.name, tab)}
                                  onChange={() => toggleTab(role.name, tab)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="dsm-footer">
          <button className="dsm-btn dsm-btn--save" onClick={handleSave} disabled={isSaving}>
            <i className={isSaving ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-floppy-disk'} />
            {t('dashboard.settings.save')}
          </button>
          <button className="dsm-btn dsm-btn--cancel" onClick={onClose}>
            {t('dashboard.settings.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
