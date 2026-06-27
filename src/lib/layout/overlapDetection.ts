import { CalendarEvent } from '../data/types';

/**
 * Check if two calendar events overlap in time.
 * Works with UTC ISO strings.
 */
export function doEventsOverlap(a: CalendarEvent, b: CalendarEvent): boolean {
  if (a.allDay || b.allDay) return false; // Don't flag all-day events for overlap
  return a.startUtc < b.endUtc && a.endUtc > b.startUtc;
}

/**
 * Find all events that overlap with the given event, excluding itself.
 */
export function findOverlappingEvents(
  event: { startUtc: string; endUtc: string; id?: string; calendarId?: string },
  allEvents: CalendarEvent[]
): CalendarEvent[] {
  return allEvents.filter(e => {
    if (e.id === event.id) return false;
    if (event.calendarId && e.calendarId !== event.calendarId) return false;
    if (e.allDay) return false;
    return e.startUtc < event.endUtc && e.endUtc > event.startUtc;
  });
}
