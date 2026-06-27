# Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js)                            │
│                                                                     │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────────┐  │
│  │  AuthPage    │   │   CalendarApp    │   │   Zustand Stores   │  │
│  │  (login/reg) │   │  (orchestrator)  │   │  calendarStore     │  │
│  └──────┬───────┘   └────────┬─────────┘   │  authStore         │  │
│         │                    │             └────────────────────┘  │
│         │            ┌───────┴──────────┐                          │
│         │            │  EventRepository  │ (interface)             │
│         │            │  useEventRepo()   │                          │
│         │            └───────┬──────────┘                          │
│         │                    │                                      │
│         │      ┌─────────────┴──────────────┐                      │
│         │      │                            │                       │
│         │  HttpEventRepository    LocalStorageEventRepository       │
│         │  (NEXT_PUBLIC_API_URL   (fallback / offline mode)         │
│         │   is set)                                                 │
└─────────┼──────┼─────────────────────────────────────────────────── ┘
          │      │  fetch + credentials:'include' (httpOnly cookies)
          │      │
          ▼      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Express API  (api/src/)                           │
│                                                                     │
│  POST /auth/register   POST /auth/login   GET /auth/me              │
│  POST /auth/logout                                                   │
│                                                                     │
│  GET /calendars        POST /calendars                              │
│  PATCH /calendars/:id  DELETE /calendars/:id                        │
│                                                                     │
│  GET /events?startUtc=&endUtc=   GET /events/:id                   │
│  POST /events          PATCH /events/:id   DELETE /events/:id       │
│  GET /health                                                        │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Middleware stack                                             │   │
│  │ cors → json → cookieParser → rateLimiter(auth) → requireAuth│   │
│  │ → routes → controllers → services → prisma → SQLite/Postgres│   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────────────────────┐  │
│  │ authService │   │calendarSvc  │   │      eventService        │  │
│  │ bcrypt hash │   │ ownership   │   │  serialize() → DTO       │  │
│  │ JWT sign    │   │ check       │   │  listEvents() + expand   │  │
│  └─────────────┘   └─────────────┘   │  overlapCheck()          │  │
│                                      │  recurringEvents.ts       │  │
│                                      └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│               Prisma ORM  (prisma/schema.prisma)                    │
│                                                                     │
│  User ──< Calendar ──< Event                                        │
│            (onDelete:Cascade)  (onDelete:Cascade)                   │
│                                                                     │
│  Event fields: startUtc, endUtc (DateTime, UTC)                     │
│                rrule (RRULE: string, master events)                 │
│                exDatesJson (JSON[]  of ISO strings)                 │
│                recurringEventId → master Event                      │
│                isException, originalStartUtc (override rows)        │
│                                                                     │
│  Indexes: (userId, startUtc, endUtc)  ·  (recurringEventId)        │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
  SQLite (local dev: api/prisma/dev.db)
  PostgreSQL (production: Neon / Render Postgres)


## Data Flow: Create Event with Overlap

  Client                   API                        DB
    │                       │                          │
    │  POST /events {…}     │                          │
    │──────────────────────>│                          │
    │                       │  validateTimes()         │
    │                       │  assertCalendarOwned()   │
    │                       │  checkOverlap()          │
    │                       │    SELECT WHERE           │
    │                       │    startUtc<end           │
    │                       │    AND endUtc>start ─────>│
    │                       │<─────────────── rows ────│
    │                       │                          │
    │  409 {error:'overlap',│  overlaps found          │
    │<── conflicts:[…]}     │  (override not set)      │
    │                       │                          │
    │  OverlapWarning modal │                          │
    │  user clicks "save anyway"                       │
    │                       │                          │
    │  POST /events         │                          │
    │  {…, override:true} ─>│  skip overlap check      │
    │                       │  prisma.event.create() ─>│
    │<───── 201 {event} ────│<────────────── row ──────│


## Data Flow: Recurring Event Read (GET /events)

  Client                   API                        DB
    │                       │                          │
    │  GET /events?start=…  │                          │
    │──────────────────────>│                          │
    │                       │  1. plain events:        │
    │                       │  SELECT WHERE no rrule ─>│
    │                       │<─────── plain rows ──────│
    │                       │                          │
    │                       │  2. master events:       │
    │                       │  SELECT WHERE rrule IS   │
    │                       │  NOT NULL, start≤end ───>│
    │                       │<─── master rows ─────────│
    │                       │                          │
    │                       │  3. override rows:       │
    │                       │  SELECT WHERE            │
    │                       │  recurringEventId IN…  ─>│
    │                       │<─── override rows ───────│
    │                       │                          │
    │                       │  4. expandMaster():      │
    │                       │  rrule.js.between()      │
    │                       │  strip exDates           │
    │                       │  merge overrides         │
    │                       │  assign synthetic IDs    │
    │                       │  ${masterId}::${occISO}  │
    │                       │                          │
    │<── 200 [plain…, instances…] ─────────────────────│
```
