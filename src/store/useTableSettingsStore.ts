import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TableSettings {
  [page: string]: {
    [columnKey: string]: boolean;
  };
}

interface ColumnOrder {
  [page: string]: string[];
}

interface TableSettingsState {
  settings: TableSettings;
  columnOrders: ColumnOrder;
  toggleColumn: (page: string, columnKey: string) => void;
  setColumnVisibility: (page: string, columnKey: string, isVisible: boolean) => void;
  saveSettings: (page: string, columns: { [key: string]: boolean }) => void;
  saveColumnOrder: (page: string, order: string[]) => void;
  getColumnOrder: (page: string, defaultColumns: string[]) => string[];
}

export const useTableSettingsStore = create<TableSettingsState>()(
  persist(
    (set, get) => ({
      settings: {},
      columnOrders: {},
      toggleColumn: (page, columnKey) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [page]: {
              ...(state.settings[page] || {}),
              [columnKey]: !(state.settings[page]?.[columnKey] ?? true),
            },
          },
        })),
      setColumnVisibility: (page, columnKey, isVisible) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [page]: {
              ...(state.settings[page] || {}),
              [columnKey]: isVisible,
            },
          },
        })),
      saveSettings: (page, columns) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [page]: {
              ...(state.settings[page] || {}),
              ...columns,
            },
          },
        })),
      saveColumnOrder: (page, order) =>
        set((state) => ({
          columnOrders: {
            ...state.columnOrders,
            [page]: order,
          },
        })),
      getColumnOrder: (page, defaultColumns) => {
        const stored = get().columnOrders[page];
        if (stored && stored.length > 0) {
          // Merge: keep stored order, add any new columns not in stored
          const combined = [...stored];
          defaultColumns.forEach((col) => {
            if (!combined.includes(col)) {
              combined.push(col);
            }
          });
          // Remove columns that no longer exist in defaults
          return combined.filter((col) => defaultColumns.includes(col));
        }
        return defaultColumns;
      },
    }),
    {
      name: 'table-settings',
    }
  )
);
