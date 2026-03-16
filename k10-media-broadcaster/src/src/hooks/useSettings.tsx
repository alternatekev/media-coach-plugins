import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
} from 'react';

import { DEFAULT_SETTINGS, mergeSettings, isValidSettings } from '../types/settings';
import type { OverlaySettings } from '../types/settings';

/**
 * Context type for settings provider.
 */
interface SettingsContextType {
  settings: OverlaySettings;
  updateSetting: <K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'k10-settings';

/**
 * Load settings from localStorage.
 */
function loadSettingsFromStorage(): Partial<OverlaySettings> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (isValidSettings(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('[K10 Media Broadcaster] Failed to load settings from localStorage', error);
  }
  return {};
}

/**
 * Save settings to localStorage.
 */
function saveSettingsToStorage(settings: OverlaySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('[K10 Media Broadcaster] Failed to save settings to localStorage', error);
  }
}

/**
 * Attempt to load/save settings via Electron IPC.
 */
function getElectronAPI() {
  return (window as any).k10;
}

/**
 * SettingsProvider component.
 * Loads settings from localStorage and optionally from Electron IPC.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<OverlaySettings>(() => {
    // Load from localStorage first
    const stored = loadSettingsFromStorage();
    return mergeSettings(stored);
  });

  // On mount, attempt Electron IPC load (async)
  useEffect(() => {
    const electron = getElectronAPI();
    if (electron?.getSettings) {
      electron.getSettings()
        .then((electronSettings: any) => {
          if (electronSettings && isValidSettings(electronSettings)) {
            setSettings(mergeSettings(electronSettings));
          }
        })
        .catch((error: any) => {
          console.warn('[K10 Media Broadcaster] Failed to load settings from Electron', error);
        });
    }
  }, []);

  const updateSetting = useCallback(
    <K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) => {
      setSettings((prev) => {
        const updated = {
          ...prev,
          [key]: value,
        };

        // Persist to localStorage
        saveSettingsToStorage(updated);

        // Persist to Electron if available
        const electron = getElectronAPI();
        if (electron?.saveSettings /* Electron IPC */) {
          try {
            electron.saveSettings(updated);
          } catch (error) {
            console.warn('[K10 Media Broadcaster] Failed to save settings to Electron', error);
          }
        }

        return updated;
      });
    },
    []
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettingsToStorage(DEFAULT_SETTINGS);

    // Persist to Electron if available
    const electron = getElectronAPI();
    if (electron?.saveSettings /* Electron IPC */) {
      try {
        electron.saveSettings(DEFAULT_SETTINGS);
      } catch (error) {
        console.warn('[K10 Media Broadcaster] Failed to reset settings in Electron', error);
      }
    }
  }, []);

  const value: SettingsContextType = {
    settings,
    updateSetting,
    resetSettings,
  };

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

/**
 * Hook to access full settings context.
 */
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

/**
 * Convenience hook to select a single settings value by key.
 */
export function useSettingsValue<K extends keyof OverlaySettings>(
  key: K
): OverlaySettings[K] {
  const { settings } = useSettings();
  return settings[key];
}
