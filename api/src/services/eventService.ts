import { Event } from '@prisma/client';
import { prisma } from '../db/prisma';
import { AppError } from '../middleware/errorHandler';
import { CreateEventInput, UpdateEventInput } from '../schemas/event';
import { CalendarEventDTO } from '../lib/types';
import { findOverlappingEvents } from '../lib/overlapDetection';
import {
  expandMaster,
  parseSyntheticId,
  truncateRruleUntil,
  buildSyntheticId,
} from '../lib/recurringEvents';
import { RRule } from 'rrule';
import { getHolidayEvents, isHolidayId } from '../lib/holidays';

// ── Serialization ──────────────────────────────────────────────────────────

export function serialize(ev: Event): CalendarEventDTO {
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
    rrule: ev.rrule ?? null,
    recurringEventId: ev.recurringEventId ?? null,
  };
}

// ── List with recurring expansion ──────────────────────────────────────────

export async function listEvents(
  userId: string,
  startUtc: string,
  endUtc: string,
): Promise<CalendarEventDTO[]> {
  const rangeStart = new Date(startUtc);
  const rangeEnd = new Date(endUtc);

  // 1. Non-recurring events that intersect the range.
  const plain = await prisma.event.findMany({
    where: {
      userId,
      deletedAt: null,
      rrule: null,
      recurringEventId: null,
      startUtc: { lt: rangeEnd },
      endUtc: { gt: rangeStart },
    },
  });

  // 2. Master recurring events that could have occurrences in range
  //    (startUtc of master <= range end; we can't easily pre-filter UNTIL in SQL so
  //    we expand them all and filter — acceptable for typical calendar volumes).
  const masters = await prisma.event.findMany({
    where: {
      userId,
      deletedAt: null,
      rrule: { not: null },
      recurringEventId: null,
      startUtc: { lte: rangeEnd },
    },
  });

  // 3. Override (exception) rows that fall inside the range — these replace
  //    specific generated instances and have already been loaded implicitly
  //    via expandMaster; we fetch them here to pass into expandMaster.
  const overridesByMaster = new Map<string, Event[]>();
  if (masters.length > 0) {
    const masterIds = masters.map((m) => m.id);
    const overrides = await prisma.event.findMany({
      where: { userId, deletedAt: null, recurringEventId: { in: masterIds }, isException: true },
    });
    for (const ov of overrides) {
      if (!ov.recurringEventId) continue;
      const list = overridesByMaster.get(ov.recurringEventId) ?? [];
      list.push(ov);
      overridesByMaster.set(ov.recurringEventId, list);
    }
  }

  // 4. Expand masters.
  const instances: CalendarEventDTO[] = [];
  for (const master of masters) {
    const expanded = expandMaster(
      master,
      overridesByMaster.get(master.id) ?? [],
      rangeStart,
      rangeEnd,
    );
    instances.push(...expanded);
  }

  // 5. Merge computed holiday events (never stored, always generated on read).
  const holidayCals = await prisma.calendar.findMany({
    where: { userId, kind: 'holiday', visible: true },
    select: { id: true, country: true },
  });
  const holidayEvents: CalendarEventDTO[] = holidayCals.flatMap(c =>
    c.country ? getHolidayEvents(c.country, c.id, rangeStart, rangeEnd) : [],
  );

  return [...plain.map(serialize), ...instances, ...holidayEvents];
}

// ── Get single event ────────────────────────────────────────────────────────

export async function getEvent(userId: string, id: string): Promise<CalendarEventDTO | null> {
  // Handle synthetic IDs for generated instances.
  const parsed = parseSyntheticId(id);
  if (parsed) {
    const master = await prisma.event.findFirst({
      where: { id: parsed.masterId, userId, deletedAt: null },
    });
    if (!master || !master.rrule) return null;

    const occDate = new Date(parsed.occurrenceStartUtc);
    const duration = master.endUtc.getTime() - master.startUtc.getTime();
    return {
      ...serialize(master),
      id,
      startUtc: occDate.toISOString(),
      endUtc: new Date(occDate.getTime() + duration).toISOString(),
      rrule: null,
      recurringEventId: master.id,
    };
  }

  const ev = await prisma.event.findFirst({ where: { id, userId, deletedAt: null } });
  return ev ? serialize(ev) : null;
}

// ── Create event ────────────────────────────────────────────────────────────

export async function createEvent(
  userId: string,
  input: CreateEventInput,
): Promise<CalendarEventDTO> {
  const { override, ...data } = input;

  validateTimes(data.startUtc, data.endUtc, data.allDay);
  await assertCalendarOwned(userId, data.calendarId);
  await assertCalendarMutable(userId, data.calendarId);

  if (!override) {
    await checkOverlap(userId, data.startUtc, data.endUtc, data.allDay, data.calendarId);
  }

  const ev = await prisma.event.create({
    data: {
      userId,
      calendarId: data.calendarId,
      title: data.title,
      description: data.description,
      location: data.location,
      startUtc: new Date(data.startUtc),
      endUtc: new Date(data.endUtc),
      allDay: data.allDay,
      colorId: data.colorId,
      rrule: data.rrule ?? null,
      recurringEventId: data.recurringEventId ?? null,
    },
  });

  return serialize(ev);
}

// ── Update event ────────────────────────────────────────────────────────────

export async function updateEvent(
  userId: string,
  id: string,
  input: UpdateEventInput,
): Promise<CalendarEventDTO> {
  if (isHolidayId(id)) throw new AppError(403, 'Holiday events are read-only');

  const { override, expectedUpdatedAt, scope, ...patch } = input;

  // ── Recurring instance edit ──────────────────────────────────────────────
  const parsed = parseSyntheticId(id);
  if (parsed) {
    return updateRecurringInstance(userId, parsed.masterId, parsed.occurrenceStartUtc, patch, scope ?? 'single', override);
  }

  // ── Regular event edit ───────────────────────────────────────────────────
  const existing = await prisma.event.findFirst({ where: { id, userId, deletedAt: null } });
  if (!existing) throw new AppError(404, 'Event not found');

  // Optimistic concurrency: reject if the client's copy is stale.
  if (expectedUpdatedAt && existing.updatedAt.toISOString() !== expectedUpdatedAt) {
    throw new AppError(409, 'Conflict: event was modified by another session', {
      error: 'stale',
      serverUpdatedAt: existing.updatedAt.toISOString(),
    });
  }

  const startUtc = patch.startUtc ?? existing.startUtc.toISOString();
  const endUtc = patch.endUtc ?? existing.endUtc.toISOString();
  const allDay = patch.allDay ?? existing.allDay;
  const calendarId = patch.calendarId ?? existing.calendarId;

  validateTimes(startUtc, endUtc, allDay);

  if (patch.calendarId && patch.calendarId !== existing.calendarId) {
    await assertCalendarOwned(userId, patch.calendarId);
  }

  if (!override) {
    await checkOverlap(userId, startUtc, endUtc, allDay, calendarId, id);
  }

  const updated = await prisma.event.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.location !== undefined && { location: patch.location }),
      ...(patch.startUtc !== undefined && { startUtc: new Date(patch.startUtc) }),
      ...(patch.endUtc !== undefined && { endUtc: new Date(patch.endUtc) }),
      ...(patch.allDay !== undefined && { allDay: patch.allDay }),
      ...(patch.colorId !== undefined && { colorId: patch.colorId }),
      ...(patch.calendarId !== undefined && { calendarId: patch.calendarId }),
      ...(patch.rrule !== undefined && { rrule: patch.rrule }),
    },
  });

  return serialize(updated);
}

// ── Delete event ────────────────────────────────────────────────────────────

export async function deleteEvent(
  userId: string,
  id: string,
  scope?: 'single' | 'following' | 'all',
  permanent: boolean = false,
): Promise<void> {
  if (isHolidayId(id)) throw new AppError(403, 'Holiday events are read-only');

  const parsed = parseSyntheticId(id);
  if (parsed) {
    return deleteRecurringInstance(userId, parsed.masterId, parsed.occurrenceStartUtc, scope ?? 'single', permanent);
  }

  const ev = await prisma.event.findFirst({ where: { id, userId, deletedAt: null } });
  if (!ev) throw new AppError(404, 'Event not found');

  if (ev.rrule && scope === 'all') {
    if (permanent) {
      // Hard-delete master and all override rows.
      await prisma.event.deleteMany({ where: { userId, recurringEventId: id } });
      await prisma.event.delete({ where: { id } });
    } else {
      // Soft-delete master and all override rows.
      await prisma.event.updateMany({ where: { userId, recurringEventId: id }, data: { deletedAt: new Date() } });
      await prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    return;
  }

  if (permanent) {
    await prisma.event.delete({ where: { id } });
  } else {
    await prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

// ── Recurring helpers ────────────────────────────────────────────────────────

async function updateRecurringInstance(
  userId: string,
  masterId: string,
  occurrenceStartUtc: string,
  patch: Partial<Omit<UpdateEventInput, 'override' | 'expectedUpdatedAt' | 'scope'>>,
  scope: 'single' | 'following' | 'all',
  override?: boolean,
): Promise<CalendarEventDTO> {
  const master = await prisma.event.findFirst({ where: { id: masterId, userId, deletedAt: null } });
  if (!master || !master.rrule) throw new AppError(404, 'Recurring event not found');

  if (scope === 'all') {
    // Edit the master directly.
    if (!override) {
      const startUtc = patch.startUtc ?? master.startUtc.toISOString();
      const endUtc = patch.endUtc ?? master.endUtc.toISOString();
      await checkOverlap(userId, startUtc, endUtc, patch.allDay ?? master.allDay, patch.calendarId ?? master.calendarId, masterId);
    }
    const updated = await prisma.event.update({
      where: { id: masterId },
      data: buildPatchData(patch),
    });
    return serialize(updated);
  }

  if (scope === 'following') {
    // Truncate the master's RRULE to end just before this occurrence,
    // then create a new master from this occurrence onward.
    const truncated = truncateRruleUntil(master.rrule, occurrenceStartUtc);
    await prisma.event.update({
      where: { id: masterId },
      data: { rrule: truncated },
    });

    const newStart = patch.startUtc ?? occurrenceStartUtc;
    const duration = master.endUtc.getTime() - master.startUtc.getTime();
    const newEnd = patch.endUtc ?? new Date(new Date(newStart).getTime() + duration).toISOString();

    // Reconstruct RRULE starting from the new start date.
    const parsedOpts = RRule.parseString(master.rrule) as ConstructorParameters<typeof RRule>[0] | undefined;
    const origOpts: ConstructorParameters<typeof RRule>[0] = parsedOpts ?? {};
    if ('count' in origOpts) delete origOpts.count;
    if ('until' in origOpts) delete origOpts.until;
    origOpts.dtstart = new Date(newStart);
    const newRrule = new RRule(origOpts).toString().replace(/^RRULE:/, '');

    const newMaster = await prisma.event.create({
      data: {
        userId,
        calendarId: patch.calendarId ?? master.calendarId,
        title: patch.title ?? master.title,
        description: patch.description !== undefined ? patch.description : master.description,
        location: patch.location !== undefined ? patch.location : master.location,
        startUtc: new Date(newStart),
        endUtc: new Date(newEnd),
        allDay: patch.allDay ?? master.allDay,
        colorId: patch.colorId ?? master.colorId,
        rrule: newRrule,
      },
    });
    return serialize(newMaster);
  }

  // scope === 'single': create an override row for this occurrence.
  // First add this occurrence to exDates on the master so the original is hidden.
  const exDates = JSON.parse(master.exDatesJson) as string[];
  if (!exDates.includes(occurrenceStartUtc)) {
    exDates.push(occurrenceStartUtc);
    await prisma.event.update({
      where: { id: masterId },
      data: { exDatesJson: JSON.stringify(exDates) },
    });
  }

  const duration = master.endUtc.getTime() - master.startUtc.getTime();
  const occStart = new Date(occurrenceStartUtc);
  const occEnd = new Date(occStart.getTime() + duration);

  const overrideStartUtc = patch.startUtc ? new Date(patch.startUtc) : occStart;
  const overrideEndUtc = patch.endUtc ? new Date(patch.endUtc) : occEnd;

  if (!override) {
    await checkOverlap(
      userId,
      overrideStartUtc.toISOString(),
      overrideEndUtc.toISOString(),
      patch.allDay ?? master.allDay,
      patch.calendarId ?? master.calendarId,
    );
  }

  // Check if there's already an override for this occurrence and update it.
  const existing = await prisma.event.findFirst({
    where: { userId, recurringEventId: masterId, originalStartUtc: occurrenceStartUtc, deletedAt: null },
  });

  if (existing) {
    const updated = await prisma.event.update({
      where: { id: existing.id },
      data: {
        ...buildPatchData(patch),
        startUtc: overrideStartUtc,
        endUtc: overrideEndUtc,
      },
    });
    return serialize(updated);
  }

  const overrideRow = await prisma.event.create({
    data: {
      userId,
      calendarId: patch.calendarId ?? master.calendarId,
      title: patch.title ?? master.title,
      description: patch.description !== undefined ? patch.description : master.description,
      location: patch.location !== undefined ? patch.location : master.location,
      startUtc: overrideStartUtc,
      endUtc: overrideEndUtc,
      allDay: patch.allDay ?? master.allDay,
      colorId: patch.colorId ?? master.colorId,
      recurringEventId: masterId,
      originalStartUtc: occurrenceStartUtc,
      isException: true,
    },
  });

  return serialize(overrideRow);
}

async function deleteRecurringInstance(
  userId: string,
  masterId: string,
  occurrenceStartUtc: string,
  scope: 'single' | 'following' | 'all',
  permanent: boolean = false,
): Promise<void> {
  const master = await prisma.event.findFirst({ where: { id: masterId, userId, deletedAt: null } });
  if (!master || !master.rrule) throw new AppError(404, 'Recurring event not found');

  if (scope === 'all') {
    if (permanent) {
      await prisma.event.deleteMany({ where: { userId, recurringEventId: masterId } });
      await prisma.event.delete({ where: { id: masterId } });
    } else {
      await prisma.event.updateMany({ where: { userId, recurringEventId: masterId }, data: { deletedAt: new Date() } });
      await prisma.event.update({ where: { id: masterId }, data: { deletedAt: new Date() } });
    }
    return;
  }

  if (scope === 'following') {
    // Truncate RRULE — the RRULE change itself hides future occurrences; no soft-delete needed.
    const truncated = truncateRruleUntil(master.rrule, occurrenceStartUtc);
    await prisma.event.update({ where: { id: masterId }, data: { rrule: truncated } });
    // Remove override rows that fall on or after this occurrence.
    const overrides = await prisma.event.findMany({
      where: { userId, recurringEventId: masterId, deletedAt: null },
    });
    const toDelete = overrides
      .filter((ov) => ov.startUtc >= new Date(occurrenceStartUtc))
      .map((ov) => ov.id);
    if (toDelete.length > 0) {
      await prisma.event.deleteMany({ where: { id: { in: toDelete } } });
    }
    return;
  }

  // scope === 'single': add to exDates — no soft-delete needed for single occurrence.
  const exDates = JSON.parse(master.exDatesJson) as string[];
  if (!exDates.includes(occurrenceStartUtc)) {
    exDates.push(occurrenceStartUtc);
    await prisma.event.update({
      where: { id: masterId },
      data: { exDatesJson: JSON.stringify(exDates) },
    });
  }
}

// ── Search ───────────────────────────────────────────────────────────────────

export async function searchEvents(userId: string, q: string): Promise<CalendarEventDTO[]> {
  // SQLite: 'contains' uses LIKE which is case-insensitive for ASCII by default
  const events = await prisma.event.findMany({
    where: {
      userId,
      deletedAt: null,
      rrule: null,
      recurringEventId: null,
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { location: { contains: q } },
      ],
    },
    orderBy: { startUtc: 'asc' },
    take: 50,
  });
  return events.map(serialize);
}

// ── Trash ─────────────────────────────────────────────────────────────────────

export async function listTrash(userId: string): Promise<CalendarEventDTO[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const events = await prisma.event.findMany({
    where: {
      userId,
      deletedAt: { not: null, gte: thirtyDaysAgo },
      recurringEventId: null,   // don't show override rows, only top-level events
    },
    orderBy: { deletedAt: 'desc' },
  });
  return events.map(serialize);
}

export async function restoreEvent(userId: string, id: string): Promise<CalendarEventDTO> {
  const ev = await prisma.event.findFirst({ where: { id, userId, deletedAt: { not: null } } });
  if (!ev) throw new AppError(404, 'Event not found in trash');
  const updated = await prisma.event.update({ where: { id }, data: { deletedAt: null } });
  return serialize(updated);
}

// ── Guards ───────────────────────────────────────────────────────────────────

function validateTimes(startUtc: string, endUtc: string, allDay: boolean): void {
  if (!allDay && endUtc <= startUtc) {
    throw new AppError(422, 'endUtc must be after startUtc for timed events');
  }
}

async function assertCalendarOwned(userId: string, calendarId: string): Promise<void> {
  const cal = await prisma.calendar.findFirst({ where: { id: calendarId, userId } });
  if (!cal) throw new AppError(404, 'Calendar not found');
}

async function assertCalendarMutable(userId: string, calendarId: string): Promise<void> {
  const cal = await prisma.calendar.findFirst({ where: { id: calendarId, userId } });
  if (cal?.readOnly) throw new AppError(403, 'This calendar is read-only');
}

async function checkOverlap(
  userId: string,
  startUtc: string,
  endUtc: string,
  allDay: boolean,
  calendarId: string,
  excludeId?: string,
): Promise<void> {
  if (allDay) return; // all-day events never trigger overlap warning

  const candidates = await prisma.event.findMany({
    where: {
      userId,
      deletedAt: null,
      calendarId,
      allDay: false,
      rrule: null,       // only compare against concrete events, not masters
      recurringEventId: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startUtc: { lt: new Date(endUtc) },
      endUtc: { gt: new Date(startUtc) },
    },
  });

  if (candidates.length === 0) return;

  const conflicts = candidates.map(serialize);
  const candidate = { id: excludeId, startUtc, endUtc, allDay, calendarId };
  const overlapping = findOverlappingEvents(candidate, conflicts);

  if (overlapping.length > 0) {
    throw new AppError(409, 'overlap', { error: 'overlap', conflicts: overlapping });
  }
}

function buildPatchData(
  patch: Partial<Omit<UpdateEventInput, 'override' | 'expectedUpdatedAt' | 'scope'>>,
) {
  return {
    ...(patch.title !== undefined && { title: patch.title }),
    ...(patch.description !== undefined && { description: patch.description }),
    ...(patch.location !== undefined && { location: patch.location }),
    ...(patch.startUtc !== undefined && { startUtc: new Date(patch.startUtc) }),
    ...(patch.endUtc !== undefined && { endUtc: new Date(patch.endUtc) }),
    ...(patch.allDay !== undefined && { allDay: patch.allDay }),
    ...(patch.colorId !== undefined && { colorId: patch.colorId }),
    ...(patch.calendarId !== undefined && { calendarId: patch.calendarId }),
  };
}
