import { createContext, useContext, useMemo, useState, useCallback, useEffect, type ReactNode } from 'react';

const STORAGE_KEY = 'nc_theme_mode';

type ThemeMode = 'light' | 'dark';

function loadMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* ignore */
  }
  return 'dark';
}

function saveMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

interface ThemeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  toggleMode: () => {},
});

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(loadMode);

  useEffect(() => {
    saveMode(mode);
  }, [mode]);

  const toggleMode = useCallback(() => {
    setModeState((m) => (m === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
