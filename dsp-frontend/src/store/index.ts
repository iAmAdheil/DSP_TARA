import { create } from 'zustand';

interface TARAStore {
  activeRunId: string | null;
  sidebarCollapsed: boolean;
  viewMode: 'edit' | 'view';
  setActiveRunId: (id: string | null) => void;
  toggleSidebar: () => void;
  setViewMode: (mode: 'edit' | 'view') => void;
  // Module specific states can be added here
}

export const useStore = create<TARAStore>((set) => ({
  activeRunId: null,
  sidebarCollapsed: false,
  viewMode: 'edit',
  setActiveRunId: (id) => set({ activeRunId: id }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setViewMode: (mode) => set({ viewMode: mode }),
}));
