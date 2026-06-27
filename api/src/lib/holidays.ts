import Holidays from 'date-holidays';
import { CalendarEventDTO } from './types';

const HOLIDAY_ID_PREFIX = 'holiday::';

export function isHolidayId(id: string): boolean {
  return id.startsWith(HOLIDAY_ID_PREFIX);
}

function yearsInRange(startUtc: Date, endUtc: Date): number[] {
  const years: number[] = [];
  for (let y = startUtc.getUTCFullYear(); y <= endUtc.getUTCFullYear(); y++) {
    years.push(y);
  }
  return years;
}

/**
 * Compute holiday events for a country over a date range.
 * Events are synthetic (never stored) — all-day, read-only.
 *
 * Date anchoring: we use the local calendar date from `date-holidays` (h.date,
 * formatted as "YYYY-MM-DD HH:mm:ss") to build a UTC-midnight-anchored all-day
 * event. This means Republic Day always falls on Jan 26 for IST users and any
 * timezone from UTC onward.
 */
export function getHolidayEvents(
  country: string,
  calendarId: string,
  startUtc: Date,
  endUtc: Date,
): CalendarEventDTO[] {
  const hd = new Holidays(country);
  const years = yearsInRange(startUtc, endUtc);

  const results: CalendarEventDTO[] = [];

  for (const year of years) {
    const holidays = hd.getHolidays(year);
    for (const h of holidays) {
      if (h.type !== 'public') continue;

      // Extract the calendar date from the local date string ("YYYY-MM-DD HH:mm:ss").
      const datePart = h.date.slice(0, 10); // "YYYY-MM-DD"
      const eventStart = new Date(`${datePart}T00:00:00.000Z`);
      const eventEnd = new Date(`${datePart}T23:59:59.999Z`);

      // Filter to range (endUtc is exclusive, eventStart must be before endUtc;
      // eventEnd must be after startUtc).
      if (eventEnd <= startUtc || eventStart >= endUtc) continue;

      const id = `${HOLIDAY_ID_PREFIX}${calendarId}::${datePart}`;

      results.push({
        id,
        title: h.name,
        startUtc: eventStart.toISOString(),
        endUtc: eventEnd.toISOString(),
        allDay: true,
        colorId: 'Sage',
        calendarId,
        readOnly: true,
        createdAt: eventStart.toISOString(),
        updatedAt: eventStart.toISOString(),
        rrule: null,
        recurringEventId: null,
      });
    }
  }

  // Stable sort by date then name (handles substitutes consistently).
  results.sort((a, b) => a.startUtc.localeCompare(b.startUtc) || a.title.localeCompare(b.title));
  return results;
}
