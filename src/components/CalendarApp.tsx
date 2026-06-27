'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCalendarStore } from '@/store';
import { useEventRepository } from '@/lib/data/useEventRepository';
import { CalendarEvent } from '@/lib/data/types';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MonthView } from '@/components/views/MonthView';
import { WeekDayView } from '@/components/views/WeekDayView';
import { DetailPopover } from '@/components/events/DetailPopover';
import { QuickCreatePopover } from '@/components/events/QuickCreatePopover';
import { EventEditor } from '@/components/events/EventEditor';
import { Toast, ToastMessage } from '@/components/ui/Toast';
import { OverlapWarning } from '@/components/ui/OverlapWarning';
import { SearchBar } from '@/components/ui/SearchBar';
import { TrashModal } from '@/components/ui/TrashModal';
import { AppearanceModal } from '@/components/ui/AppearanceModal';
import { SettingsModal } from '@/components/ui/SettingsModal';
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal';
import { findOverlappingEvents } from '@/lib/layout/overlapDetection';
import { getUserTimezone } from '@/lib/time/utils';
import { addDays, addMonths, addWeeks, subDays, subMonths, subWeeks } from 'date-fns';
import { Plus } from 'lucide-react';
import { localStorageRepository } from '@/lib/data/LocalStorageEventRepository';
import { OverlapError } from '@/lib/data/HttpEventRepository';
import { useAuthStore } from '@/store/authStore';
import { useCalendarListStore } from '@/store/calendarListStore';
import { useSettingsStore } from '@/store/settingsStore';

// Seed localStorage on first mount (no-op if already seeded)
if (typeof window !== 'undefined') {
  localStorageRepository.list({ startUtc: '2000-01-01T00:00:00.000Z', endUtc: '2099-01-01T00:00:00.000Z' });
}

type PendingSave = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

export default function CalendarApp() {
  const { view, setView, currentDate, setCurrentDate } = useCalendarStore();
  const { setUser } = useAuthStore();
  const { calendars } = useCalendarListStore();
  const repo = useEventRepository();
  const settings = useSettingsStore();
  const defaultCalendarId = calendars[0]?.id ?? 'personal';

  // ── Event Data ──────────────────────────────────────────────
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadKey, setLoadKey] = useState(0);

  const refreshEvents = useCallback(() => setLoadKey(k => k + 1), []);

  useEffect(() => {
    let mounted = true;
    const now = new Date(currentDate);
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 3, 1);
    repo.list({ startUtc: start.toISOString(), endUtc: end.toISOString() }).then(data => {
      if (mounted) setEvents(data);
    }).catch((err: unknown) => {
      if ((err as { status?: number }).status === 401) setUser(null);
    });
    return () => { mounted = false; };
  }, [currentDate, loadKey, repo]);

  // ── Modal state ───────────────────────────────────────────────
  const [searchOpen,      setSearchOpen]      = useState(false);
  const [trashOpen,       setTrashOpen]       = useState(false);
  const [appearanceOpen,  setAppearanceOpen]  = useState(false);
  const [settingsOpen,    setSettingsOpen]    = useState(false);
  const [helpOpen,        setHelpOpen]        = useState(false);

  // ── Detail / Quick-create / Editor ───────────────────────────
  const [toasts,          setToasts]          = useState<ToastMessage[]>([]);
  const [detailEvent,     setDetailEvent]     = useState<CalendarEvent | null>(null);
  const [detailAnchor,    setDetailAnchor]    = useState<{ x: number; y: number } | null>(null);
  const [quickCreateDate, setQuickCreateDate] = useState<Date | null>(null);
  const [quickCreateAnchor, setQuickCreateAnchor] = useState<{ x: number; y: number } | null>(null);
  const [editorEvent,     setEditorEvent]     = useState<Partial<CalendarEvent> | null>(null);
  const [isEditorOpen,    setIsEditorOpen]    = useState(false);
  const [pendingSave,     setPendingSave]      = useState<PendingSave | null>(null);
  const [overlapTitles,   setOverlapTitles]   = useState<string[]>([]);

  // ── Swipe navigation ─────────────────────────────────────────
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button, [data-event-chip], select, input, textarea, [role="dialog"]')) return;
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (swipeStartX.current === null || swipeStartY.current === null) return;
    const dx = e.clientX - swipeStartX.current;
    const dy = e.clientY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    const { currentDate: cd, view: v, setCurrentDate: scd } = useCalendarStore.getState();
    const dateObj = new Date(cd);
    let next: Date;
    if (dx < 0) {
      next = v === 'month' ? addMonths(dateObj, 1) : v === 'week' ? addWeeks(dateObj, 1) : addDays(dateObj, 1);
    } else {
      next = v === 'month' ? subMonths(dateObj, 1) : v === 'week' ? subWeeks(dateObj, 1) : subDays(dateObj, 1);
    }
    scd(next.toISOString());
  }, []);

  // ── Toast helpers ─────────────────────────────────────────────
  const addToast = useCallback((msg: ToastMessage) => setToasts(t => [...t, msg]), []);
  const dismissToast = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), []);

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'd') setView('day');
      else if (e.key === 'w') setView('week');
      else if (e.key === 'm') setView('month');
      else if (e.key === 't') useCalendarStore.getState().setCurrentDate(new Date().toISOString());
      else if (e.key === 'Escape') {
        setDetailEvent(null);
        setQuickCreateDate(null);
        setIsEditorOpen(false);
        setSearchOpen(false);
        setHelpOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setView]);

  // ── Event handlers ────────────────────────────────────────────
  const handleEventClick = useCallback((event: CalendarEvent, anchor: { x: number; y: number }) => {
    setDetailEvent(event);
    setDetailAnchor(anchor);
    setQuickCreateDate(null);
  }, []);

  const handleCreateRequest = useCallback((date: Date, anchor: { x: number; y: number }) => {
    setQuickCreateDate(date);
    setQuickCreateAnchor(anchor);
    setDetailEvent(null);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const event = events.find(e => e.id === id);
    const canRestore = !id.includes('::') && event?.rrule == null;
    setDetailEvent(null);
    await repo.remove(id);
    refreshEvents();
    addToast({
      id: `del-${Date.now()}`,
      message: `"${event?.title ?? 'Event'}" moved to Trash`,
      action: canRestore ? {
        label: 'Undo',
        onClick: async () => {
          try {
            await repo.restore(id);
            refreshEvents();
          } catch {
            // silently fail — event is still in Trash; user can restore from there
          }
        },
      } : undefined,
    });
  }, [events, repo, refreshEvents, addToast]);

  const handleEdit = useCallback((event: CalendarEvent) => {
    setDetailEvent(null);
    setEditorEvent(event);
    setIsEditorOpen(true);
  }, []);

  const handleOpenEditor = useCallback(() => {
    setEditorEvent(null);
    setIsEditorOpen(true);
    setQuickCreateDate(null);
  }, []);

  const doSave = useCallback(async (data: PendingSave, override = false) => {
    try {
      if (data.id) {
        await repo.update(data.id, data, { override });
      } else {
        await repo.create(data as Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>, { override });
      }
    } catch (err: unknown) {
      if (err instanceof OverlapError) {
        setPendingSave(data);
        setOverlapTitles(err.conflicts.map(e => e.title));
        return;
      }
      throw err;
    }
    refreshEvents();
    setIsEditorOpen(false);
    setQuickCreateDate(null);
    setPendingSave(null);
    setOverlapTitles([]);
    addToast({ id: `save-${Date.now()}`, message: `"${data.title}" ${data.id ? 'updated' : 'created'}` });
  }, [repo, refreshEvents, addToast]);

  const handleSave = useCallback(async (data: PendingSave) => {
    const overlapping = findOverlappingEvents(
      { startUtc: data.startUtc, endUtc: data.endUtc, id: data.id, calendarId: data.calendarId },
      events
    );
    if (overlapping.length > 0) {
      setPendingSave(data);
      setOverlapTitles(overlapping.map(e => e.title));
    } else {
      await doSave(data);
    }
  }, [events, doSave]);

  const handleEventUpdate = useCallback(async (id: string, patch: Partial<CalendarEvent>) => {
    await repo.update(id, patch);
  }, [repo]);

  const handleQuickSave = useCallback(async (data: { title: string; startUtc: string; endUtc: string; allDay: boolean }) => {
    await handleSave({ title: data.title, startUtc: data.startUtc, endUtc: data.endUtc, allDay: data.allDay, colorId: 'Blueberry', calendarId: defaultCalendarId });
  }, [handleSave, defaultCalendarId]);

  const handleEditorSave = useCallback(async (data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    await handleSave(data);
  }, [handleSave]);

  const handleMoreOptions = useCallback((data: { title: string; startUtc: string; endUtc: string; allDay: boolean }) => {
    setQuickCreateDate(null);
    setEditorEvent({ title: data.title, startUtc: data.startUtc, endUtc: data.endUtc, allDay: data.allDay, colorId: 'Blueberry', calendarId: defaultCalendarId });
    setIsEditorOpen(true);
  }, [defaultCalendarId]);

  // Search result click: navigate to the event's date and open detail
  const handleSearchResult = useCallback((event: CalendarEvent) => {
    setCurrentDate(event.startUtc);
    setDetailEvent(event);
    setDetailAnchor({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
  }, [setCurrentDate]);

  const timezone = getUserTimezone();

  return (
    <div
      className="flex flex-col h-screen w-full bg-white dark:bg-[#202124] overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <TopBar
        onCreateClick={handleOpenEditor}
        onSearchOpen={() => setSearchOpen(true)}
        onHelpOpen={() => setHelpOpen(true)}
        onTrashOpen={() => setTrashOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
        onAppearanceOpen={() => setAppearanceOpen(true)}
        onPrintClick={() => window.print()}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar onCreateClick={handleOpenEditor} />

        <main className="flex-1 flex flex-col relative overflow-hidden min-h-0 min-w-0">
          {/* Timezone badge */}
          <div className="absolute top-2 right-3 z-10 text-[10px] text-gray-400 dark:text-gray-500 pointer-events-none select-none">
            {timezone}
          </div>

          {/* Calendar Views */}
          <AnimatePresence mode="wait" initial={false}>
            {view === 'month' ? (
              <motion.div
                key="month"
                className="flex-1 min-h-0 flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <MonthView
                  events={events}
                  onEventClick={handleEventClick}
                  onCreateRequest={handleCreateRequest}
                  weekStartsOn={settings.weekStartsOn}
                />
              </motion.div>
            ) : (
              <motion.div
                key={view}
                className="flex-1 min-h-0 flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <WeekDayView
                  events={events}
                  onEventClick={handleEventClick}
                  onCreateRequest={handleCreateRequest}
                  onEventUpdate={handleEventUpdate}
                  onEventsChange={refreshEvents}
                  weekStartsOn={settings.weekStartsOn}
                  showWeekends={settings.showWeekends}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile FAB */}
      <button
        type="button"
        title="Create event"
        onClick={handleOpenEditor}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-white dark:bg-[#2d2e31] rounded-full shadow-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:scale-105 transition-all md:hidden"
      >
        <Plus className="w-6 h-6 text-blue-600" />
      </button>

      {/* ── Popovers & Modals ── */}
      <AnimatePresence>
        {detailEvent && detailAnchor && (
          <DetailPopover
            key="detail"
            event={detailEvent}
            anchor={detailAnchor}
            onClose={() => setDetailEvent(null)}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quickCreateDate && quickCreateAnchor && (
          <QuickCreatePopover
            key="quick-create"
            anchor={quickCreateAnchor}
            defaultDate={quickCreateDate}
            onClose={() => setQuickCreateDate(null)}
            onSave={handleQuickSave}
            onMoreOptions={handleMoreOptions}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditorOpen && (
          <EventEditor
            key="editor"
            initialData={editorEvent ?? undefined}
            calendars={calendars.length > 0 ? calendars : undefined}
            onClose={() => { setIsEditorOpen(false); setEditorEvent(null); }}
            onSave={handleEditorSave}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingSave && overlapTitles.length > 0 && (
          <OverlapWarning
            key="overlap"
            overlappingTitles={overlapTitles}
            onSaveAnyway={() => doSave(pendingSave, true)}
            onCancel={() => { setPendingSave(null); setOverlapTitles([]); }}
          />
        )}
      </AnimatePresence>

      {/* ── Top-level overlay modals ── */}
      <SearchBar
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onEventSelect={handleSearchResult}
      />

      <TrashModal
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        repo={repo}
        onRestored={refreshEvents}
      />

      <AppearanceModal
        open={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <KeyboardShortcutsModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />

      {/* Toasts */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
