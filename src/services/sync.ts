import type { AppData } from '../data/types';
import { useAppStore } from '../store/app';
import { useSettingsStore } from '../store/settings';
import { loadRemoteState, saveRemoteState } from './api';

let started = false;
let applyingRemote = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let saving = false;

function currentData(): AppData {
  const state = useAppStore.getState();
  return {
    businesses: state.businesses,
    products: state.products,
    customers: state.customers,
    conversations: state.conversations,
    messages: state.messages,
    appointments: state.appointments,
    orders: state.orders,
  };
}

function settingsSnapshot(): Record<string, string> {
  const settings = useSettingsStore.getState();
  return {
    theme: settings.theme,
    fontSize: settings.fontSize,
    reduceMotion: String(settings.reduceMotion),
    language: settings.language,
    numerals: settings.numerals,
    simulationSpeed: String(settings.simulationSpeed),
    defaultScenarioId: settings.defaultScenarioId,
    notifications: JSON.stringify(settings.notifications),
    botConfigs: JSON.stringify(settings.botConfigs),
  };
}

async function flush(): Promise<void> {
  if (saving) return;
  saving = true;
  try {
    const ok = await saveRemoteState(currentData(), settingsSnapshot());
    useAppStore.getState().setServerOnline(ok);
  } finally {
    saving = false;
  }
}

function schedule(): void {
  if (applyingRemote) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, 600);
}

function subscribeToChanges(): void {
  useAppStore.subscribe((state, previous) => {
    const changed =
      state.businesses !== previous.businesses ||
      state.products !== previous.products ||
      state.customers !== previous.customers ||
      state.conversations !== previous.conversations ||
      state.messages !== previous.messages ||
      state.appointments !== previous.appointments ||
      state.orders !== previous.orders;
    if (changed) schedule();
  });
  useSettingsStore.subscribe(() => schedule());
}

export async function initSync(): Promise<void> {
  if (started) return;
  started = true;
  subscribeToChanges();

  const remote = await loadRemoteState();
  if (remote && remote.businesses.length > 0) {
    applyingRemote = true;
    try {
      const { settings: _settings, ...data } = remote;
      void _settings;
      useAppStore.getState().replaceAll(data as AppData);
      useAppStore.getState().setServerOnline(true);
    } finally {
      applyingRemote = false;
    }
  } else if (remote) {
    useAppStore.getState().setServerOnline(true);
    await flush();
  } else {
    useAppStore.getState().setServerOnline(false);
  }
  useAppStore.getState().setReady(true);
}

export function forceSync(): void {
  schedule();
}
