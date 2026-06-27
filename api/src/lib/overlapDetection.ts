import { CalendarEventDTO } from './types';

// Shared pure predicate — identical logic to frontend overlapDetection.ts.
// Two timed events overlap iff their intervals intersect. All-day events are
// excluded from time-overlap checks (the frontend does the same thing).
export function doEventsOverlap(
  a: { startUtc: string; endUtc: string; allDay: boolean },
  b: { startUtc: string; endUtc: string; allDay: boolean },
): boolean {
  if (a.allDay || b.allDay) return false;
  return a.startUtc < b.endUtc && a.endUtc > b.startUtc;
}

export function findOverlappingEvents(
  candidate: { id?: string; startUtc: string; endUtc: string; allDay: boolean; calendarId: string },
  allEvents: CalendarEventDTO[],
): CalendarEventDTO[] {
  if (candidate.allDay) return []; // all-day never triggers overlap warning
  return allEvents.filter((e) => {
    if (e.id === candidate.id) return false;                 // exclude self
    if (e.calendarId !== candidate.calendarId) return false; // same calendar only
    if (e.allDay) return false;
    if (e.readOnly) return false;                            // exclude holidays/read-only
    return e.startUtc < candidate.endUtc && e.endUtc > candidate.startUtc;
  });
}
