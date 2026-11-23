import type { AppData } from '../data/types';

const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');

export interface RemoteState extends AppData {
  settings?: Record<string, string>;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 2500,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function loadRemoteState(): Promise<RemoteState | null> {
  try {
    const state = await request<RemoteState>('/api/state');
    if (!state || !Array.isArray(state.businesses)) return null;
    return state;
  } catch {
    return null;
  }
}

export async function saveRemoteState(
  data: AppData,
  settings: Record<string, string>,
): Promise<boolean> {
  try {
    await request<{ ok: boolean }>(
      '/api/state',
      {
        method: 'PUT',
        body: JSON.stringify({ ...data, settings }),
        keepalive: true,
      },
      4000,
    );
    return true;
  } catch {
    return false;
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const result = await request<{ ok: boolean }>('/api/health', {}, 1200);
    return Boolean(result.ok);
  } catch {
    return false;
  }
}
