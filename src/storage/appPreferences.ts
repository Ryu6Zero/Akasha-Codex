import type { AppPreferences } from '../types';

const PREFERENCES_KEY = 'acgplan:preferences';

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  soundMode: 'soft',
  soundVolume: 0.45,
};

export function loadAppPreferences(): AppPreferences {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    return raw ? normalizeAppPreferences(JSON.parse(raw) as Partial<AppPreferences>) : DEFAULT_APP_PREFERENCES;
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export function saveAppPreferences(preferences: AppPreferences): AppPreferences {
  const normalized = normalizeAppPreferences(preferences);
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(normalized));
  return normalized;
}

export function normalizeAppPreferences(preferences: Partial<AppPreferences>): AppPreferences {
  const soundMode = preferences.soundMode === 'off' || preferences.soundMode === 'full' || preferences.soundMode === 'soft'
    ? preferences.soundMode
    : DEFAULT_APP_PREFERENCES.soundMode;
  const soundVolume = Number.isFinite(Number(preferences.soundVolume))
    ? Math.min(1, Math.max(0, Number(preferences.soundVolume)))
    : DEFAULT_APP_PREFERENCES.soundVolume;
  return { soundMode, soundVolume };
}
