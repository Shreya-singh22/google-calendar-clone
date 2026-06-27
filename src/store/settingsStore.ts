'use client';
import { create } from 'zustand';
import type { CalendarView } from './index';

const SETTINGS_KEY = 'calendarSettings';

export interface CalendarSettings {
  weekStartsOn: 0 | 1;           // 0 = Sunday, 1 = Monday
  defaultView: CalendarView;
  defaultEventDuration: 30 | 60; // minutes
  showWeekends: boolean;
}

const DEFAULT_SETTINGS: CalendarSettings = {
  weekStartsOn: 0,
  defaultView: 'month',
  defaultEventDuration: 60,
  showWeekends: true,
};

interface SettingsState extends CalendarSettings {
  updateSettings: (patch: Partial<CalendarSettings>) => void;
}

function loadSettings(): CalendarSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function persist(s: CalendarSettings) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...loadSettings(),

  updateSettings: (patch) => {
    set((state) => {
      const next: CalendarSettings = {
        weekStartsOn: patch.weekStartsOn ?? state.weekStartsOn,
        defaultView: patch.defaultView ?? state.defaultView,
        defaultEventDuration: patch.defaultEventDuration ?? state.defaultEventDuration,
        showWeekends: patch.showWeekends ?? state.showWeekends,
      };
      persist(next);
      return next;
    });
  },
}));
