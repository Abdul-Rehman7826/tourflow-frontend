'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { TERMINAL_TENANT_STORAGE_KEY } from '@/lib/profile-session';
import {
  AgencySettings,
  defaultSettings,
  formatAmount,
  normalizeSettings,
  accentForeground,
  accentText,
} from '@/lib/agency-settings';
import { fetchAgencySettingsApi, saveAgencySettingsApi } from '@/lib/settings-api';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 1. Read stored preference; fallback strictly to 'light'
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('tourflow_theme') as Theme | null;
      return storedTheme === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  const applyThemeToDOM = useCallback((targetTheme: Theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (targetTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  }, []);

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme, applyThemeToDOM]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('tourflow_theme', newTheme);
    applyThemeToDOM(newTheme);
  }, [applyThemeToDOM]);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const nextTheme: Theme = current === 'light' ? 'dark' : 'light';
      localStorage.setItem('tourflow_theme', nextTheme);
      applyThemeToDOM(nextTheme);
      return nextTheme;
    });
  }, [applyThemeToDOM]);

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme, toggleTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Agency Settings & Legacy Support
const AgencySettingsContext = createContext<{
  settings: AgencySettings;
  isReady: boolean;
  dirty: boolean;
  update: (patch: Partial<AgencySettings>) => void;
  save: () => { success: boolean; error?: string };
  discard: () => AgencySettings;
  formatMoney: (value: number) => string;
}>({
  settings: defaultSettings(),
  isReady: true,
  dirty: false,
  update: () => {},
  save: () => ({ success: true }),
  discard: () => defaultSettings(),
  formatMoney: (v) => formatAmount(v, defaultSettings()),
});

export function AgencyThemeProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const terminalTenantId = typeof window === 'undefined'
    ? ''
    : (() => {
        try {
          const stored = JSON.parse(localStorage.getItem(TERMINAL_TENANT_STORAGE_KEY) || 'null');
          return typeof stored?.id === 'string' ? stored.id : '';
        } catch {
          return '';
        }
      })();
  const agencyId = user?.tenantId || terminalTenantId;
  const defaults = useMemo(() => {
    const d = defaultSettings(tenant?.name, tenant?.contactEmail);
    d.mode = 'light';
    return d;
  }, [tenant?.name, tenant?.contactEmail]);

  const key = `tourflow_agency_settings_v1:${agencyId}`;

  const [settings, setSettings] = useState<AgencySettings>(() => {
    if (typeof window !== 'undefined' && agencyId) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) return normalizeSettings(JSON.parse(raw), defaults);
      } catch {
        // ignore
      }
    }
    return defaults;
  });

  const [saved, setSaved] = useState<AgencySettings>(() => {
    if (typeof window !== 'undefined' && agencyId) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) return normalizeSettings(JSON.parse(raw), defaults);
      } catch {
        // ignore
      }
    }
    return defaults;
  });

  const [prevAgencyId, setPrevAgencyId] = useState(agencyId);
  if (agencyId !== prevAgencyId) {
    setPrevAgencyId(agencyId);
    let restored = defaults;
    if (typeof window !== 'undefined' && agencyId) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) restored = normalizeSettings(JSON.parse(raw), defaults);
      } catch {
        // ignore
      }
    }
    setSettings(restored);
    setSaved(restored);
  }

  const savedRef = useRef(saved);
  savedRef.current = saved;

  // Hydrate settings from remote API in background
  useEffect(() => {
    let cancelled = false;

    if (user?.tenantId) {
      fetchAgencySettingsApi()
        .then((remote) => {
          if (!cancelled && remote) {
            const normalized = normalizeSettings(remote, defaults);
            setSettings((current) => {
              const isDirty = JSON.stringify(current) !== JSON.stringify(savedRef.current);
              return isDirty ? current : normalized;
            });
            setSaved(normalized);
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(key, JSON.stringify(normalized));
              } catch {
                // ignore
              }
            }
          }
        })
        .catch(() => {
          // Fallback gracefully to localStorage when offline or in test environments
        });
    } else {
      // Unauthenticated / Terminal context: fetch public agency branding
      const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.worldclassholidays.org/api/v1';
      fetch(`${rawApiUrl}/agency/branding`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data) {
            const normalized = normalizeSettings(
              {
                ...defaults,
                name: data.name || defaults.name,
                logoUrl: data.logoUrl || data.lightLogo || data.darkLogo || '',
                lightLogo: data.lightLogo || data.logoUrl || '',
                darkLogo: data.darkLogo || data.logoUrl || '',
                accent: data.accent || defaults.accent,
              },
              defaults,
            );
            setSettings(normalized);
            setSaved(normalized);
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [user?.tenantId, defaults, key]);

  const isReady = true;

  useEffect(() => {
    if (!agencyId) return;
    const root = document.documentElement;
    root.style.setProperty('--agency-accent', settings.accent);
    // Solid actions are deliberately darkened so their required white text stays readable.
    root.style.setProperty('--agency-action', accentText(settings.accent));
    root.style.setProperty('--agency-on-accent', accentForeground(accentText(settings.accent)));
    root.style.setProperty('--agency-ink-light', accentText(settings.accent));
    root.style.setProperty('--agency-ink-dark', accentText(settings.accent, true));
  }, [agencyId, settings.accent]);

  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'AGENCY_ADMIN';

  const update = (patch: Partial<AgencySettings>) => {
    if (!canEdit) return;
    setSettings((current) => normalizeSettings({ ...current, ...patch }, defaults));
  };

  const save = () => {
    if (!canEdit) return { success: false, error: 'Unauthorized: insufficient permissions' };
    if (agencyId) {
      try {
        localStorage.setItem(key, JSON.stringify(settings));
        setSaved(settings);

        // Persist to backend asynchronously
        saveAgencySettingsApi(settings)
          .then((persisted) => {
            if (persisted) {
              const normalized = normalizeSettings(persisted, defaults);
              setSaved(normalized);
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem(key, JSON.stringify(normalized));
                } catch {
                  // ignore
                }
              }
            }
          })
          .catch((err) => {
            console.error('Failed to sync agency settings to backend:', err);
          });

        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    }
    return { success: false, error: 'No agency tenant selected' };
  };

  const discard = () => {
    setSettings(saved);
    return saved;
  };

  const dirty = JSON.stringify(saved) !== JSON.stringify(settings);

  return (
    <AgencySettingsContext.Provider
      value={{
        settings,
        isReady,
        dirty,
        update,
        save,
        discard,
        formatMoney: (v) => formatAmount(v, settings),
      }}
    >
      {children}
    </AgencySettingsContext.Provider>
  );
}

export const useAgencySettings = () => useContext(AgencySettingsContext);
