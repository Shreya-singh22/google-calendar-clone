import { RRule } from 'rrule';
import { Event } from '@prisma/client';
import { CalendarEventDTO } from './types';

// Separator used in synthetic IDs for generated recurring instances.
export const RECURRING_ID_SEP = '::';

export function buildSyntheticId(masterId: string, occurrenceStartIso: string): string {
  return `${masterId}${RECURRING_ID_SEP}${occurrenceStartIso}`;
}

export function parseSyntheticId(
  id: string,
): { masterId: string; occurrenceStartUtc: string } | null {
  const idx = id.indexOf(RECURRING_ID_SEP);
  if (idx === -1) return null;
  return {
    masterId: id.slice(0, idx),
    occurrenceStartUtc: id.slice(idx + RECURRING_ID_SEP.length),
  };
}

// Expand a master recurring event into CalendarEventDTO instances that fall
// within [rangeStart, rangeEnd). Merges override rows and strips exDates.
export function expandMaster(
  master: Event,
  overrides: Event[],
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEventDTO[] {
  if (!master.rrule) return [];

  // Build RRule using the master's startUtc as DTSTART.
  const rule = new RRule({
    ...RRule.parseString(master.rrule),
    dtstart: master.startUtc,
  });

  const occurrences = rule.between(rangeStart, rangeEnd, true /* inclusive */);
  if (occurrences.length === 0) return [];

  const exDates = new Set<string>(JSON.parse(master.exDatesJson) as string[]);
  const durationMs = master.endUtc.getTime() - master.startUtc.getTime();

  // Index overrides by the occurrence they replace.
  const overrideByOriginal = new Map<string, Event>();
  for (const ov of overrides) {
    if (ov.originalStartUtc) overrideByOriginal.set(ov.originalStartUtc, ov);
  }

  const results: CalendarEventDTO[] = [];

  for (const occ of occurrences) {
    const occIso = occ.toISOString();

    // Overrides take priority: check before exDates, since a scope='single' edit
    // both adds the occurrence to exDates AND creates an override row.
    const override = overrideByOriginal.get(occIso);
    if (override) {
      results.push(serializeOverride(override, master.id));
      continue;
    }

    // Skip explicitly excluded dates (deleted single occurrences with no override).
    if (exDates.has(occIso)) continue;

    const occEnd = new Date(occ.getTime() + durationMs);
    results.push({
      id: buildSyntheticId(master.id, occIso),
      title: master.title,
      description: master.description ?? undefined,
      location: master.location ?? undefined,
      startUtc: occIso,
      endUtc: occEnd.toISOString(),
      allDay: master.allDay,
      colorId: master.colorId,
      calendarId: master.calendarId,
      createdAt: master.createdAt.toISOString(),
      updatedAt: master.updatedAt.toISOString(),
      rrule: null,
      recurringEventId: master.id,
    });
  }

  return results;
}

function serializeOverride(ev: Event, masterId: string): CalendarEventDTO {
  return {
    id: ev.id,
    title: ev.title,
    description: ev.description ?? undefined,
    location: ev.location ?? undefined,
    startUtc: ev.startUtc.toISOString(),
    endUtc: ev.endUtc.toISOString(),
    allDay: ev.allDay,
    colorId: ev.colorId,
    calendarId: ev.calendarId,
    createdAt: ev.createdAt.toISOString(),
    updatedAt: ev.updatedAt.toISOString(),
    rrule: null,
    recurringEventId: masterId,
  };
}

// Modify a master's RRULE so it ends just before the given occurrence.
// Used for "this and following" delete/edit operations.
export function truncateRruleUntil(rruleStr: string, beforeIso: string): string {
  // RRule.parseString parses the RRULE: line without a DTSTART prefix.
  const parsed = (RRule.parseString(rruleStr) ?? {}) as Record<string, unknown>;
  const until = new Date(new Date(beforeIso).getTime() - 1000); // 1 s before
  delete parsed['count'];
  parsed['until'] = until;
  return new RRule(parsed as ConstructorParameters<typeof RRule>[0]).toString().replace(/^RRULE:/, '');
}
