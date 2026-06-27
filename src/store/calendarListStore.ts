'use client';
import { create } from 'zustand';

export interface UserCalendar {
  id: string;
  name: string;
  colorId: string;
  kind: string;        // "user" | "holiday"
  readOnly: boolean;
  country?: string;
  createdAt: string;
  updatedAt: string;
}

interface CalendarListState {
  calendars: UserCalendar[];
  loaded: boolean;
  loadCalendars: () => Promise<void>;
  reset: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

export const useCalendarListStore = create<CalendarListState>((set) => ({
  calendars: [],
  loaded: false,

  async loadCalendars() {
    if (!API) { set({ loaded: true }); return; }
    try {
      const res = await fetch(`${API}/calendars`, { credentials: 'include' });
      if (!res.ok) { set({ loaded: true }); return; }
      const data = await res.json() as UserCalendar[];
      set({ calendars: data, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  reset() {
    set({ calendars: [], loaded: false });
  },
}));
