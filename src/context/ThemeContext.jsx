import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DARK_THEME, LIGHT_THEME, buildVars, remapLegacyTheme } from '../themes/themeBuilders';

const ThemeContext = createContext(null);

const THEME_KEY = 'erp-theme';
const MODE_KEY = 'erp-mode';

function prefersDark() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

function themeForMode(mode) {
  return mode === 'dark' ? DARK_THEME : LIGHT_THEME;
}

function readQueryMode() {
  try {
    const mode = new URLSearchParams(window.location.search).get('mode');
    if (mode === 'light' || mode === 'dark') return mode;
  } catch {
    /* ignore */
  }
  return null;
}

function readStoredMode() {
  const queried = readQueryMode();
  if (queried) return queried;

  try {
    const mode = localStorage.getItem(MODE_KEY);
    if (mode === 'light' || mode === 'dark') return mode;

    const stored = localStorage.getItem(THEME_KEY) || localStorage.getItem('ibdp_slate_theme');
    if (stored) return buildVars(remapLegacyTheme(stored)).mode;
  } catch {
    /* ignore */
  }
  return prefersDark() ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(readStoredMode);
  const resolvedTheme = themeForMode(mode);

  useEffect(() => {
    const { themeId, mode: builtMode } = buildVars(resolvedTheme);
    const root = document.documentElement;
    root.setAttribute('data-theme', themeId);
    root.setAttribute('data-erp-mode', builtMode);
    root.style.colorScheme = builtMode;
    try {
      localStorage.setItem(THEME_KEY, themeId);
      localStorage.setItem(MODE_KEY, builtMode);
      localStorage.removeItem('ibdp_slate_theme');
    } catch {
      /* ignore */
    }
  }, [resolvedTheme]);

  const setTheme = useCallback((next) => {
    const { mode: nextMode } = buildVars(next);
    setModeState(nextMode);
  }, []);

  const setMode = useCallback((nextMode) => {
    setModeState(nextMode === 'dark' ? 'dark' : 'light');
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const toggleTheme = toggleMode;
  const cycleTheme = toggleMode;

  const value = useMemo(
    () => ({
      theme: resolvedTheme,
      mode,
      isDark: mode === 'dark',
      setTheme,
      setMode,
      toggleTheme,
      toggleMode,
      cycleTheme,
    }),
    [resolvedTheme, mode, setTheme, setMode, toggleTheme, toggleMode, cycleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <div className="erp-theme erp-theme-bg" data-theme={resolvedTheme} data-erp-mode={mode}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export { LIGHT_THEME, DARK_THEME };
