import { create } from 'zustand';

export type TypingSide = 'customer' | 'bot' | null;

interface SimState {
  running: boolean;
  paused: boolean;
  scenarioId: string | null;
  step: number;
  totalSteps: number;
  typing: TypingSide;
  clockIso: string;
  activeConversationId: number | null;
  start: (input: { scenarioId: string; totalSteps: number; clockIso: string }) => void;
  finish: () => void;
  setPaused: (paused: boolean) => void;
  setTyping: (typing: TypingSide) => void;
  setStep: (step: number) => void;
  setClock: (iso: string) => void;
  setActiveConversation: (id: number | null) => void;
  reset: () => void;
}

function nowClock(): string {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

export const useSimStore = create<SimState>()((set) => ({
  running: false,
  paused: false,
  scenarioId: null,
  step: 0,
  totalSteps: 0,
  typing: null,
  clockIso: nowClock(),
  activeConversationId: null,
  start: ({ scenarioId, totalSteps, clockIso }) =>
    set({
      running: true,
      paused: false,
      scenarioId,
      step: 0,
      totalSteps,
      typing: null,
      clockIso,
      activeConversationId: null,
    }),
  finish: () => set({ running: false, paused: false, typing: null }),
  setPaused: (paused) => set({ paused }),
  setTyping: (typing) => set({ typing }),
  setStep: (step) => set({ step }),
  setClock: (clockIso) => set({ clockIso }),
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),
  reset: () =>
    set({
      running: false,
      paused: false,
      scenarioId: null,
      step: 0,
      totalSteps: 0,
      typing: null,
      clockIso: nowClock(),
      activeConversationId: null,
    }),
}));

export function simNow(): Date {
  return new Date(useSimStore.getState().clockIso);
}
