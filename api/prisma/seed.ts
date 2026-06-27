/**
 * Seed script — run with: npm run db:seed
 * Creates a demo user with 3 default calendars and the same sample events
 * visible in the UI, plus one weekly recurring event.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@example.com';
  const password = 'password123';

  // Idempotent: remove existing demo user before re-seeding.
  await prisma.user.deleteMany({ where: { email } });

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: hash,
      name: 'Demo User',
      calendars: {
        create: [
          { name: 'Personal',          colorId: 'Tomato',    kind: 'user',    readOnly: false },
          { name: 'Work',              colorId: 'Blueberry', kind: 'user',    readOnly: false },
          { name: 'Birthdays',        colorId: 'Lavender',  kind: 'user',    readOnly: false },
          { name: 'Holidays in India', colorId: 'Sage',      kind: 'holiday', country: 'IN', readOnly: true },
        ],
      },
    },
    include: { calendars: true },
  });

  const calMap: Record<string, string> = {};
  for (const c of user.calendars) calMap[c.name] = c.id;

  const now = new Date().toISOString();

  await prisma.event.createMany({
    data: [
      // ── Non-recurring seed events (mirrors LocalStorageEventRepository seed) ──
      {
        userId: user.id,
        calendarId: calMap['Work'],
        title: 'Team Standup',
        startUtc: new Date('2026-06-22T14:00:00.000Z'),
        endUtc: new Date('2026-06-22T14:30:00.000Z'),
        allDay: false,
        colorId: 'Blueberry',
      },
      {
        userId: user.id,
        calendarId: calMap['Work'],
        title: 'Project Sync',
        startUtc: new Date('2026-06-23T15:00:00.000Z'),
        endUtc: new Date('2026-06-23T16:00:00.000Z'),
        allDay: false,
        colorId: 'Peacock',
      },
      {
        userId: user.id,
        calendarId: calMap['Personal'],
        title: 'Lunch with Sarah',
        startUtc: new Date('2026-06-24T17:00:00.000Z'),
        endUtc: new Date('2026-06-24T18:00:00.000Z'),
        allDay: false,
        colorId: 'Tomato',
      },
      {
        userId: user.id,
        calendarId: calMap['Work'],
        title: 'Quarterly Planning',
        startUtc: new Date('2026-06-25T13:00:00.000Z'),
        endUtc: new Date('2026-06-25T15:00:00.000Z'),
        allDay: false,
        colorId: 'Grape',
      },
      {
        userId: user.id,
        calendarId: calMap['Work'],
        title: 'Design Review',
        startUtc: new Date('2026-06-25T14:00:00.000Z'), // overlaps Quarterly Planning
        endUtc: new Date('2026-06-25T16:00:00.000Z'),
        allDay: false,
        colorId: 'Flamingo',
      },
      {
        userId: user.id,
        calendarId: calMap['Work'],
        title: 'Company Offsite',
        startUtc: new Date('2026-06-26T00:00:00.000Z'),
        endUtc: new Date('2026-06-27T00:00:00.000Z'),
        allDay: true,
        colorId: 'Sage',
      },
      {
        userId: user.id,
        calendarId: calMap['Personal'],
        title: 'Gym',
        startUtc: new Date('2026-06-27T11:00:00.000Z'),
        endUtc: new Date('2026-06-27T12:00:00.000Z'),
        allDay: false,
        colorId: 'Tangerine',
      },
      {
        userId: user.id,
        calendarId: calMap['Personal'],
        title: 'Grocery Shopping',
        startUtc: new Date('2026-06-27T15:00:00.000Z'),
        endUtc: new Date('2026-06-27T16:00:00.000Z'),
        allDay: false,
        colorId: 'Banana',
      },
      {
        userId: user.id,
        calendarId: calMap['Personal'],
        title: 'Movie Night',
        startUtc: new Date('2026-06-27T23:00:00.000Z'),
        endUtc: new Date('2026-06-28T02:00:00.000Z'), // crosses midnight
        allDay: false,
        colorId: 'Graphite',
      },
      {
        userId: user.id,
        calendarId: calMap['Birthdays'],
        title: "Mom's Birthday",
        startUtc: new Date('2026-06-22T00:00:00.000Z'),
        endUtc: new Date('2026-06-23T00:00:00.000Z'),
        allDay: true,
        colorId: 'Lavender',
      },

      // ── Recurring event: Weekly Team Standup every Monday ──────────────────
      // DTSTART is the master's startUtc; the RRULE is stored without DTSTART.
      {
        userId: user.id,
        calendarId: calMap['Work'],
        title: 'Weekly Sync',
        startUtc: new Date('2026-06-01T10:00:00.000Z'),
        endUtc: new Date('2026-06-01T10:30:00.000Z'),
        allDay: false,
        colorId: 'Peacock',
        rrule: 'FREQ=WEEKLY;BYDAY=MO',
      },
    ],
  });

  console.log(`✓ Seeded demo user: ${email} / ${password}`);
  console.log(`  Calendars: ${user.calendars.map((c) => c.name).join(', ')}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
