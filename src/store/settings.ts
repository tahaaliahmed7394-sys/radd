import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BotConfig, FontSize, Language, Numerals, ThemeMode } from '../data/types';
import { STORAGE_KEYS } from '../config';

export interface SettingsState {
  theme: ThemeMode;
  fontSize: FontSize;
  reduceMotion: boolean;
  language: Language;
  numerals: Numerals;
  notifications: {
    order: boolean;
    appointment: boolean;
    handoff: boolean;
  };
  simulationSpeed: number;
  defaultScenarioId: string;
  botConfigs: Record<string, BotConfig>;
  setTheme: (theme: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
  setReduceMotion: (value: boolean) => void;
  setLanguage: (language: Language) => void;
  setNumerals: (numerals: Numerals) => void;
  setNotification: (kind: 'order' | 'appointment' | 'handoff', value: boolean) => void;
  setSimulationSpeed: (speed: number) => void;
  setDefaultScenario: (id: string) => void;
  updateBotConfig: (businessId: number, patch: Partial<BotConfig>) => void;
  resetSettings: () => void;
}

const defaults = {
  theme: 'system' as ThemeMode,
  fontSize: 'md' as FontSize,
  reduceMotion: false,
  language: 'ar' as Language,
  numerals: 'western' as Numerals,
  notifications: { order: true, appointment: true, handoff: true },
  simulationSpeed: 1,
  defaultScenarioId: 'price',
  botConfigs: {} as Record<string, BotConfig>,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setLanguage: (language) => set({ language }),
      setNumerals: (numerals) => set({ numerals }),
      setNotification: (kind, value) =>
        set((state) => ({ notifications: { ...state.notifications, [kind]: value } })),
      setSimulationSpeed: (simulationSpeed) =>
        set({ simulationSpeed: Math.min(3, Math.max(0.5, simulationSpeed)) }),
      setDefaultScenario: (defaultScenarioId) => set({ defaultScenarioId }),
      updateBotConfig: (businessId, patch) =>
        set((state) => {
          const key = String(businessId);
          const current = state.botConfigs[key] ?? {};
          return { botConfigs: { ...state.botConfigs, [key]: { ...current, ...patch } } };
        }),
      resetSettings: () => set({ ...defaults, botConfigs: {} }),
    }),
    {
      name: STORAGE_KEYS.settings,
      version: 1,
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        reduceMotion: state.reduceMotion,
        language: state.language,
        numerals: state.numerals,
        notifications: state.notifications,
        simulationSpeed: state.simulationSpeed,
        defaultScenarioId: state.defaultScenarioId,
        botConfigs: state.botConfigs,
      }),
    },
  ),
);

export function botConfigFor(businessId: number | null | undefined): BotConfig | undefined {
  if (!businessId) return undefined;
  return useSettingsStore.getState().botConfigs[String(businessId)];
}
