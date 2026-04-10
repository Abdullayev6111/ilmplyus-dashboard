import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TableSettings {
  [page: string]: {
    [columnKey: string]: boolean;
  };
}

interface TableSettingsState {
  settings: TableSettings;
  toggleColumn: (page: string, columnKey: string) => void;
  setColumnVisibility: (page: string, columnKey: string, isVisible: boolean) => void;
  saveSettings: (page: string, columns: { [key: string]: boolean }) => void;
}

export const useTableSettingsStore = create<TableSettingsState>()(
  persist(
    (set) => ({
      settings: {},
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
    }),
    {
      name: 'table-settings',
    }
  )
);
