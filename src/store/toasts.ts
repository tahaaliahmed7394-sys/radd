import { create } from 'zustand';

export interface ToastItem {
  id: number;
  kind: 'order' | 'appointment' | 'handoff' | 'success' | 'error';
  title: string;
  body?: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}

let counter = 1;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (toast) => {
    const id = counter++;
    set((state) => ({ toasts: [...state.toasts.slice(-3), { ...toast, id }] }));
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
