export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startUtc: string;   // ISO 8601 in UTC, e.g. "2026-06-27T09:30:00.000Z"
  endUtc: string;     // ISO 8601 in UTC
  allDay: boolean;
  colorId: string;    // references the Google color palette
  calendarId: string; // for multi-calendar support
  readOnly?: boolean;   // true for holiday events
  deletedAt?: string;   // ISO string — present on trash items
  createdAt: string;
  updatedAt: string;

  // Recurrence
  rrule?: string | null;
  recurringEventId?: string | null;
}

export interface DateRange {
  startUtc: string;
  endUtc: string;
}

export interface SaveOptions {
  override?: boolean;
  scope?: 'single' | 'following' | 'all';
  expectedUpdatedAt?: string;
}

export interface DeleteOptions {
  permanent?: boolean;
  scope?: 'single' | 'following' | 'all';
}

export interface EventRepository {
  list(range: DateRange): Promise<CalendarEvent[]>;
  get(id: string): Promise<CalendarEvent | null>;
  create(input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>, options?: SaveOptions): Promise<CalendarEvent>;
  update(id: string, patch: Partial<CalendarEvent>, options?: SaveOptions): Promise<CalendarEvent>;
  remove(id: string, options?: DeleteOptions): Promise<void>;
  search(q: string): Promise<CalendarEvent[]>;
  listTrash(): Promise<CalendarEvent[]>;
  restore(id: string): Promise<CalendarEvent>;
}
