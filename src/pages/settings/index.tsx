import { useState, useEffect, useCallback, useRef } from "react";
import { TABLE_PAGES_CONFIG } from "./config";
import type { ColumnConfig } from "./config";
import { useTranslation } from "react-i18next";
import "./settings.css";
import { useTableSettingsStore } from "../../store/useTableSettingsStore";

const Settings = () => {
  const { t } = useTranslation();
  const { settings, saveSettings, saveColumnOrder, getColumnOrder } =
    useTableSettingsStore();
  const [selectedPage, setSelectedPage] = useState(TABLE_PAGES_CONFIG[0].id);
  const [currentColumns, setCurrentColumns] = useState<{
    [key: string]: boolean;
  }>({});
  const [fixedColumns, setFixedColumns] = useState<ColumnConfig[]>([]);
  const [draggableColumns, setDraggableColumns] = useState<ColumnConfig[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Only reload when page selection changes — NOT on settings/store changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const pageConfig = TABLE_PAGES_CONFIG.find((p) => p.id === selectedPage);
    if (!pageConfig) return;

    // Load visibility
    const pageSettings = settings[selectedPage] || {};
    const newCols: { [key: string]: boolean } = {};
    pageConfig.columns.forEach((col) => {
      if (!col.alwaysVisible) {
        newCols[col.id] = pageSettings[col.id] ?? true;
      }
    });
    setCurrentColumns(newCols);

    // Separate fixed (id) and draggable columns
    const editableColumns = pageConfig.columns.filter(
      (col) => !col.alwaysVisible,
    );
    const fixed = editableColumns.filter((col) => col.id === "id");
    const draggable = editableColumns.filter((col) => col.id !== "id");

    setFixedColumns(fixed);

    // Load saved order for draggable columns only
    const defaultDraggableOrder = draggable.map((col) => col.id);
    const savedOrder = getColumnOrder(selectedPage, defaultDraggableOrder);

    const orderedDraggable = savedOrder
      .map((colId) => draggable.find((c) => c.id === colId))
      .filter(Boolean) as ColumnConfig[];

    setDraggableColumns(orderedDraggable);
  }, [selectedPage]); // Only on page change!

  const handleToggleColumn = (colId: string) => {
    setCurrentColumns((prev) => ({
      ...prev,
      [colId]: !prev[colId],
    }));
  };

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index;
    setDragIndex(index);
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    dragOverItem.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (
      dragItem.current === null ||
      dragOverItem.current === null ||
      dragItem.current === dragOverItem.current
    ) {
      setDragIndex(null);
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const fromIdx = dragItem.current;
    const toIdx = dragOverItem.current;

    setDraggableColumns((prev) => {
      const newList = [...prev];
      const [draggedItem] = newList.splice(fromIdx, 1);
      newList.splice(toIdx, 0, draggedItem);
      return newList;
    });

    dragItem.current = null;
    dragOverItem.current = null;
    setDragIndex(null);
  }, []);

  const handleSave = () => {
    saveSettings(selectedPage, currentColumns);
    // Save only draggable columns order (id is always first)
    saveColumnOrder(
      selectedPage,
      draggableColumns.map((col) => col.id),
    );
    setShowSuccessModal(true);
  };

  const activePageConfig = TABLE_PAGES_CONFIG.find(
    (p) => p.id === selectedPage,
  );

  const getPageLabel = (page: (typeof TABLE_PAGES_CONFIG)[number]) => {
    if (page.labelKey) {
      return t(page.labelKey);
    }
    if (page.id === "classes") {
      return t("aside.groups");
    }
    if (page.id === "expenseCategories") {
      return t("aside.expenseCategory");
    }
    if (page.id === "expenseSubCategories") {
      return t("aside.expenseSubCategory");
    }
    if (page.id === "expenses") {
      return t("aside.expenseCreate");
    }
    return t(`aside.${page.id}`);
  };

  // Group pages by category for sidebar
  const pageGroups = [
    {
      label: null,
      pages: TABLE_PAGES_CONFIG.filter((p) =>
        ["users", "branches", "roles"].includes(p.id),
      ),
    },
    {
      label: t("aside.areas"),
      pages: TABLE_PAGES_CONFIG.filter((p) =>
        ["regions", "districts"].includes(p.id),
      ),
    },
    {
      label: null,
      pages: TABLE_PAGES_CONFIG.filter((p) =>
        [
          "departments",
          "attendance",
          "operators",
          "courses",
          "levels",
          "positions",
          "classes",
        ].includes(p.id),
      ),
    },
    {
      label: null,
      pages: TABLE_PAGES_CONFIG.filter((p) =>
        ["students", "teachers", "rooms", "sources"].includes(p.id),
      ),
    },
    {
      label: null,
      pages: TABLE_PAGES_CONFIG.filter((p) =>
        ["payments"].includes(p.id),
      ),
    },
    {
      label: t("aside.expenses"),
      pages: TABLE_PAGES_CONFIG.filter((p) =>
        ["expenseCategories", "expenseSubCategories", "expenses"].includes(
          p.id,
        ),
      ),
    },
  ];

  return (
    <section className="settings-page container">
      <h1 className="main-title">{t("settingsGroup.mainTitle")}</h1>

      <div className="settings-layout">
        {/* Left Side: Pages List */}
        <div className="settings-sidebar">
          <h3>{t("settingsGroup.pages")}</h3>
          <div className="settings-page-list">
            {pageGroups.map((group, gIdx) => (
              <div key={gIdx} className="settings-page-group">
                {group.label && (
                  <div className="settings-group-label">{group.label}</div>
                )}
                {group.pages.map((page) => (
                  <button
                    key={page.id}
                    className={`settings-page-btn ${selectedPage === page.id ? "active" : ""}`}
                    onClick={() => setSelectedPage(page.id)}
                  >
                    {getPageLabel(page)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Columns Selection + Reorder */}
        <div className="settings-content">
          <div className="settings-content-header">
            <h3>
              {activePageConfig && getPageLabel(activePageConfig)}
              {t("settingsGroup.pageColumnsTitle")}
            </h3>
            <p>{t("settingsGroup.pageColumnsDesc")}</p>
          </div>

          <div className="settings-columns-reorder">
            <div className="settings-columns-info">
              <i className="fa-solid fa-grip-vertical"></i>
              <span>{t("settingsGroup.dragHint")}</span>
            </div>
            <div className="settings-columns-drag-list">
              {/* Fixed ID column — not draggable */}
              {fixedColumns.map((col) => (
                <div key={col.id} className="settings-drag-item fixed">
                  <div className="drag-item-left">
                    <i className="fa-solid fa-lock drag-handle-locked"></i>
                    <label className="settings-checkbox-label">
                      <input
                        type="checkbox"
                        checked={currentColumns[col.id] || false}
                        onChange={() => handleToggleColumn(col.id)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-text">
                        {t(`columns.${col.id}`, { defaultValue: col.label })}
                      </span>
                    </label>
                  </div>
                  <span className="drag-item-order fixed-order">—</span>
                </div>
              ))}

              {/* Draggable columns */}
              {draggableColumns.map((col, index) => (
                <div
                  key={col.id}
                  className={`settings-drag-item ${dragIndex === index ? "dragging" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="drag-item-left">
                    <i className="fa-solid fa-grip-vertical drag-handle"></i>
                    <label className="settings-checkbox-label">
                      <input
                        type="checkbox"
                        checked={currentColumns[col.id] || false}
                        onChange={() => handleToggleColumn(col.id)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-text">
                        {t(`columns.${col.id}`, { defaultValue: col.label })}
                      </span>
                    </label>
                  </div>
                  <span className="drag-item-order">{index + 1}</span>
                </div>
              ))}
            </div>
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
          <div
            className="modal small"
            style={{ textAlign: "center", padding: "30px" }}
          >
            <div
              style={{
                fontSize: "50px",
                color: "#4CAF50",
                marginBottom: "15px",
              }}
            >
              ✓
            </div>
            <h3 style={{ marginBottom: "20px" }}>
              {t("settingsGroup.saveSuccess")}
            </h3>
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
