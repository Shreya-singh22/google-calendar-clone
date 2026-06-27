// Wire shape returned to clients — matches the frontend CalendarEvent contract exactly.
export interface CalendarEventDTO {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startUtc: string;         // ISO 8601 UTC
  endUtc: string;           // ISO 8601 UTC
  allDay: boolean;
  colorId: string;
  calendarId: string;
  readOnly?: boolean;        // true for synthetic events (holidays, etc.)
  createdAt: string;
  updatedAt: string;
  rrule?: string | null;
  recurringEventId?: string | null;
}

export interface AuthPayload {
  userId: string;
  email: string;
}
