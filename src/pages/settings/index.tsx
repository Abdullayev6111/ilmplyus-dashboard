import { useState, useEffect } from "react";
import { TABLE_PAGES_CONFIG } from "./config";
import { useTranslation } from "react-i18next";
import "./settings.css";
import { useTableSettingsStore } from "../../store/useTableSettingsStore";

const Settings = () => {
  const { t } = useTranslation();
  const { settings, saveSettings } = useTableSettingsStore();
  const [selectedPage, setSelectedPage] = useState(TABLE_PAGES_CONFIG[0].id);
  const [currentColumns, setCurrentColumns] = useState<{
    [key: string]: boolean;
  }>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // When selected page changes, load its unsaved status or the stored settings
  useEffect(() => {
    const pageConfig = TABLE_PAGES_CONFIG.find((p) => p.id === selectedPage);
    if (!pageConfig) return;

    // Default all non-alwaysVisible columns to true if not specified in store
    const pageSettings = settings[selectedPage] || {};
    const newCols: { [key: string]: boolean } = {};

    pageConfig.columns.forEach((col) => {
      if (!col.alwaysVisible) {
        newCols[col.id] = pageSettings[col.id] ?? true;
      }
    });

    setCurrentColumns(newCols);
  }, [selectedPage, settings]);

  const handleToggleColumn = (colId: string) => {
    setCurrentColumns((prev) => ({
      ...prev,
      [colId]: !prev[colId],
    }));
  };

  const handleSave = () => {
    saveSettings(selectedPage, currentColumns);
    setShowSuccessModal(true);
  };

  const activePageConfig = TABLE_PAGES_CONFIG.find(
    (p) => p.id === selectedPage,
  );

  return (
    <section className="settings-page container">
      <h1 className="main-title">{t("settingsGroup.mainTitle")}</h1>

      <div className="settings-layout">
        {/* Left Side: Pages List */}
        <div className="settings-sidebar">
          <h3>{t("settingsGroup.pages")}</h3>
          <div className="settings-page-list">
            {TABLE_PAGES_CONFIG.map((page) => (
              <button
                key={page.id}
                className={`settings-page-btn ${selectedPage === page.id ? "active" : ""}`}
                onClick={() => setSelectedPage(page.id)}
              >
                {t(`aside.${page.id === "classes" ? "groups" : page.id}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Columns Selection */}
        <div className="settings-content">
          <div className="settings-content-header">
            <h3>{t(`aside.${activePageConfig?.id === "classes" ? "groups" : activePageConfig?.id}`)}{t("settingsGroup.pageColumnsTitle")}</h3>
            <p>{t("settingsGroup.pageColumnsDesc")}</p>
          </div>

          <div className="settings-columns-list">
            {activePageConfig?.columns.map((col) => {
              if (col.alwaysVisible) return null;
              return (
                <label key={col.id} className="settings-checkbox-label">
                  <input
                    type="checkbox"
                    checked={currentColumns[col.id] || false}
                    onChange={() => handleToggleColumn(col.id)}
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-text">{t(`columns.${col.id}`, { defaultValue: col.label })}</span>
                </label>
              );
            })}
          </div>

          <div className="settings-actions">
            <button className="settings-save-btn" onClick={handleSave}>
              {t("settingsGroup.confirm")}
            </button>
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal small" style={{ textAlign: "center", padding: "30px" }}>
            <div style={{ fontSize: "50px", color: "#4CAF50", marginBottom: "15px" }}>✓</div>
            <h3 style={{ marginBottom: "20px" }}>{t("settingsGroup.saveSuccess")}</h3>
            <button 
              className="settings-save-btn" 
              style={{ width: "100%" }}
              onClick={() => setShowSuccessModal(false)}
            >
              {t("settingsGroup.close")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Settings;
