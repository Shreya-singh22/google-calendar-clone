import { CalendarEvent, DateRange, EventRepository, SaveOptions, DeleteOptions } from './types';

const STORAGE_KEY = 'google_calendar_clone_events';
const TRASH_KEY   = 'google_calendar_clone_trash';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15);
}

function seedIfNeeded(): CalendarEvent[] {
  if (typeof window === 'undefined') return [];
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    try { return JSON.parse(existing); } catch {}
  }
  const now = new Date().toISOString();
  const seed: CalendarEvent[] = [
    { id: generateId(), title: 'Team Standup',             startUtc: '2026-06-22T14:00:00.000Z', endUtc: '2026-06-22T14:30:00.000Z', allDay: false, colorId: 'Blueberry',  calendarId: 'work',      createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Project Sync',             startUtc: '2026-06-23T15:00:00.000Z', endUtc: '2026-06-23T16:00:00.000Z', allDay: false, colorId: 'Peacock',    calendarId: 'work',      createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Lunch with Sarah',         startUtc: '2026-06-24T17:00:00.000Z', endUtc: '2026-06-24T18:00:00.000Z', allDay: false, colorId: 'Tomato',     calendarId: 'personal',  createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Quarterly Planning',       startUtc: '2026-06-25T13:00:00.000Z', endUtc: '2026-06-25T15:00:00.000Z', allDay: false, colorId: 'Grape',      calendarId: 'work',      createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Design Review',            startUtc: '2026-06-25T14:00:00.000Z', endUtc: '2026-06-25T16:00:00.000Z', allDay: false, colorId: 'Flamingo',   calendarId: 'work',      createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Company Offsite',          startUtc: '2026-06-26T00:00:00.000Z', endUtc: '2026-06-27T00:00:00.000Z', allDay: true,  colorId: 'Sage',       calendarId: 'work',      createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Gym',                      startUtc: '2026-06-27T11:00:00.000Z', endUtc: '2026-06-27T12:00:00.000Z', allDay: false, colorId: 'Tangerine',  calendarId: 'personal',  createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Grocery Shopping',         startUtc: '2026-06-27T15:00:00.000Z', endUtc: '2026-06-27T16:00:00.000Z', allDay: false, colorId: 'Banana',     calendarId: 'personal',  createdAt: now, updatedAt: now },
    { id: generateId(), title: 'Movie Night',              startUtc: '2026-06-27T23:00:00.000Z', endUtc: '2026-06-28T02:00:00.000Z', allDay: false, colorId: 'Graphite',   calendarId: 'personal',  createdAt: now, updatedAt: now },
    { id: generateId(), title: "Mom's Birthday",           startUtc: '2026-06-22T00:00:00.000Z', endUtc: '2026-06-23T00:00:00.000Z', allDay: true,  colorId: 'Lavender',   calendarId: 'birthdays', createdAt: now, updatedAt: now },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

export class LocalStorageEventRepository implements EventRepository {
  private getEvents(): CalendarEvent[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return seedIfNeeded();
    try { return JSON.parse(data); } catch { return []; }
  }

  private saveEvents(events: CalendarEvent[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  private getTrash(): CalendarEvent[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(TRASH_KEY);
    if (!data) return [];
    try { return JSON.parse(data); } catch { return []; }
  }

  private saveTrash(events: CalendarEvent[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TRASH_KEY, JSON.stringify(events));
  }

  async list(range: DateRange): Promise<CalendarEvent[]> {
    await Promise.resolve();
    const all = this.getEvents();
    return all.filter(e => e.startUtc < range.endUtc && e.endUtc > range.startUtc);
  }

  async get(id: string): Promise<CalendarEvent | null> {
    await Promise.resolve();
    return this.getEvents().find(e => e.id === id) ?? null;
  }

  async create(
    input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>,
    _options?: SaveOptions,
  ): Promise<CalendarEvent> {
    await Promise.resolve();
    const now = new Date().toISOString();
    const ev: CalendarEvent = { ...input, id: generateId(), createdAt: now, updatedAt: now };
    const all = this.getEvents();
    all.push(ev);
    this.saveEvents(all);
    return ev;
  }

  async update(id: string, patch: Partial<CalendarEvent>, _options?: SaveOptions): Promise<CalendarEvent> {
    await Promise.resolve();
    const all = this.getEvents();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) throw new Error(`Event ${id} not found`);
    const updated = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
    all[idx] = updated;
    this.saveEvents(all);
    return updated;
  }

  async remove(id: string, options?: DeleteOptions): Promise<void> {
    await Promise.resolve();
    if (options?.permanent) {
      // Hard-delete from trash
      this.saveTrash(this.getTrash().filter(e => e.id !== id));
      return;
    }
    // Soft-delete: move to trash
    const all = this.getEvents();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return;
    const ev = all[idx];
    all.splice(idx, 1);
    this.saveEvents(all);
    this.saveTrash([{ ...ev, deletedAt: new Date().toISOString() }, ...this.getTrash()]);
  }

  async search(q: string): Promise<CalendarEvent[]> {
    await Promise.resolve();
    const term = q.toLowerCase();
    return this.getEvents()
      .filter(e =>
        e.title.toLowerCase().includes(term) ||
        e.description?.toLowerCase().includes(term) ||
        e.location?.toLowerCase().includes(term)
      )
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc))
      .slice(0, 50);
  }

  async listTrash(): Promise<CalendarEvent[]> {
    await Promise.resolve();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return this.getTrash().filter(e => !e.deletedAt || e.deletedAt >= thirtyDaysAgo);
  }

  async restore(id: string): Promise<CalendarEvent> {
    await Promise.resolve();
    const trash = this.getTrash();
    const idx = trash.findIndex(e => e.id === id);
    if (idx === -1) throw new Error(`Event ${id} not in trash`);
    const { deletedAt: _, ...ev } = trash[idx];
    trash.splice(idx, 1);
    this.saveTrash(trash);
    const all = this.getEvents();
    all.push(ev);
    this.saveEvents(all);
    return ev;
  }
}

export const localStorageRepository = new LocalStorageEventRepository();
