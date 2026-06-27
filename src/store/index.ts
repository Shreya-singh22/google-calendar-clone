import { create } from 'zustand';

export type CalendarView = 'day' | 'week' | 'month';

interface CalendarState {
  currentDate: string; // ISO string representing the currently viewed date (local time context)
  view: CalendarView;
  sidebarOpen: boolean;
  selectedCalendars: Record<string, boolean>;

  // Popover / Modal state
  selectedEventId: string | null;
  popoverAnchor: { x: number, y: number } | null;
  isDetailPopoverOpen: boolean;
  isQuickCreateOpen: boolean;

  // Actions
  setCurrentDate: (dateStr: string) => void;
  setView: (view: CalendarView) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleCalendar: (calendarId: string) => void;
  initCalendars: (ids: string[]) => void;

  openDetailPopover: (eventId: string, anchor: { x: number, y: number }) => void;
  closePopovers: () => void;
}

// Fallback for localStorage-only mode (no backend)
const DEFAULT_CALENDARS = {
  personal: true,
  work: true,
  birthdays: true,
};

export const useCalendarStore = create<CalendarState>((set) => ({
  currentDate: new Date().toISOString(), // Start with today
  view: 'month', // Default to month view
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  selectedCalendars: DEFAULT_CALENDARS,

  selectedEventId: null,
  popoverAnchor: null,
  isDetailPopoverOpen: false,
  isQuickCreateOpen: false,

  setCurrentDate: (dateStr) => set({ currentDate: dateStr }),
  setView: (view) => set({ view }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleCalendar: (calendarId) => set((state) => ({
    selectedCalendars: {
      ...state.selectedCalendars,
      [calendarId]: !state.selectedCalendars[calendarId]
    }
  })),
  initCalendars: (ids) => set((state) => {
    const current = state.selectedCalendars;
    const next: Record<string, boolean> = {};
    ids.forEach(id => { next[id] = current[id] !== false; });
    return { selectedCalendars: next };
  }),

  openDetailPopover: (eventId, anchor) => set({
    selectedEventId: eventId,
    popoverAnchor: anchor,
    isDetailPopoverOpen: true,
    isQuickCreateOpen: false,
  }),
  closePopovers: () => set({
    isDetailPopoverOpen: false,
    isQuickCreateOpen: false,
    selectedEventId: null,
    popoverAnchor: null,
  }),
}));
