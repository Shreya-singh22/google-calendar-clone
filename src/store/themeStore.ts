'use client';
import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'cal-theme';

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function loadStoredTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system';
  return (localStorage.getItem(THEME_KEY) as Theme) ?? 'system';
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: loadStoredTheme(),

  setTheme: (theme) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_KEY, theme);
    }
    applyTheme(theme);
    set({ theme });
  },
}));

// Keep the dark class in sync when the user's OS preference changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme, setTheme } = useThemeStore.getState();
    if (theme === 'system') setTheme('system');
  });
}
