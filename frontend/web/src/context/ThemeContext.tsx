/**
 * src/context/ThemeContext.tsx — light/dark theme.
 *
 * Theme model: both `.dark` and `.light` classes are managed here so that
 *   - CSS token overrides (`.light { --… }` / `:root` dark defaults) work, and
 *   - Tailwind `dark:` variants (darkMode: 'class') only apply in dark mode.
 *   - `<html>` starts with NO class (dark is the default); we toggle to match.
 * Color transitions are driven globally by a permanent rule in index.css, so
 * no transient class juggling is needed during a switch.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'voxdetect-theme';

const THEME_CLASSES: Record<Theme, string> = {
  dark: 'dark',
  light: 'light',
};

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(THEME_CLASSES[theme]);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyThemeClass(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
