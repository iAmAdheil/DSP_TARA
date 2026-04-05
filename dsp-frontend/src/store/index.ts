import { create } from 'zustand';
import type { User } from '../types';

interface TARAStore {
  // existing
  activeRunId: string | null;
  sidebarCollapsed: boolean;
  viewMode: 'edit' | 'view';
  setActiveRunId: (id: string | null) => void;
  toggleSidebar: () => void;
  setViewMode: (mode: 'edit' | 'view') => void;

  // user & project
  user: User | null;
  activeProjectId: string | null;
  setUser: (user: User | null) => void;
  setActiveProjectId: (id: string | null) => void;

  // run tabs
  openRunIds: string[];
  addOpenRunId: (id: string) => void;
  removeOpenRunId: (id: string) => void;

  // project creation modal
  projectModalOpen: boolean;
  setProjectModalOpen: (open: boolean) => void;
}

export const useStore = create<TARAStore>((set) => ({
  activeRunId: null,
  sidebarCollapsed: false,
  viewMode: 'edit',
  setActiveRunId: (id) => set({ activeRunId: id }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setViewMode: (mode) => set({ viewMode: mode }),

  user: null,
  activeProjectId: null,
  setUser: (user) => set({ user }),
  setActiveProjectId: (id) => set({ activeProjectId: id }),

  openRunIds: [],
  addOpenRunId: (id) =>
    set((state) => ({
      openRunIds: state.openRunIds.includes(id) ? state.openRunIds : [...state.openRunIds, id],
    })),
  removeOpenRunId: (id) =>
    set((state) => {
      const next = state.openRunIds.filter((r) => r !== id);
      const nextActiveRunId =
        state.activeRunId === id ? (next[0] ?? null) : state.activeRunId;
      return { openRunIds: next, activeRunId: nextActiveRunId };
    }),

  projectModalOpen: false,
  setProjectModalOpen: (open) => set({ projectModalOpen: open }),
}));
