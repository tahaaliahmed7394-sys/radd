import { create } from 'zustand';

export type Role = 'customer' | 'owner';

interface UiState {
  role: Role;
  presentation: boolean;
  sidebarOpen: boolean;
  setRole: (role: Role) => void;
  toggleRole: () => void;
  setPresentation: (value: boolean) => void;
  setSidebarOpen: (value: boolean) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  role: 'customer',
  presentation: false,
  sidebarOpen: false,
  setRole: (role) => set({ role }),
  toggleRole: () => set((state) => ({ role: state.role === 'customer' ? 'owner' : 'customer' })),
  setPresentation: (presentation) => set({ presentation }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
