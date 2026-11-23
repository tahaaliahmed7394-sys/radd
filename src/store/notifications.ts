import { create } from 'zustand';
import type { NotificationItem } from '../data/types';
import { useSettingsStore } from './settings';
import { useToastStore } from './toasts';

interface NotificationState {
  items: NotificationItem[];
  push: (item: Omit<NotificationItem, 'id' | 'at' | 'read'>) => void;
  markAllRead: () => void;
  clear: () => void;
}

let counter = 1;

export const useNotificationStore = create<NotificationState>()((set) => ({
  items: [],
  push: (item) =>
    set((state) => {
      const next: NotificationItem = {
        ...item,
        id: counter++,
        at: new Date().toISOString(),
        read: false,
      };
      return { items: [next, ...state.items].slice(0, 40) };
    }),
  markAllRead: () => set((state) => ({ items: state.items.map((i) => ({ ...i, read: true })) })),
  clear: () => set({ items: [] }),
}));

export function notify(
  kind: 'order' | 'appointment' | 'handoff',
  title: string,
  body: string,
): void {
  const enabled = useSettingsStore.getState().notifications[kind];
  if (!enabled) return;
  useNotificationStore.getState().push({ kind, titleKey: `toasts.${kind}`, body });
  useToastStore.getState().push({ kind, title, body });
}

export function pushToast(kind: 'success' | 'error', title: string, body?: string): void {
  useToastStore.getState().push({ kind, title, body });
}
