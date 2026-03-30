import { create } from 'zustand';

interface TARAStore {
  activeRunId: string | null;
  sidebarCollapsed: boolean;
  setActiveRunId: (id: string | null) => void;
  toggleSidebar: () => void;
  // Module specific states can be added here
}

export const useStore = create<TARAStore>((set) => ({
  activeRunId: null,
  sidebarCollapsed: false,
  setActiveRunId: (id) => set({ activeRunId: id }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
