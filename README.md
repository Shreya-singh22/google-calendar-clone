# Google Calendar Clone — Full Stack

A high-fidelity Google Calendar clone with Month, Week, and Day views, backed by an Express + Prisma API with JWT auth, recurring events, and real-time overlap detection.

---

## Quick Start

### Prerequisites
- Node.js ≥ 20, npm ≥ 9

### 1. Start the API

```bash
cd api
cp .env.example .env          # edit JWT_SECRET; leave DATABASE_URL as-is for SQLite
npm install
npm run db:dev                # creates dev.db + runs the migration
npm run db:seed               # seeds demo user + sample events
npm run dev                   # starts on http://localhost:4000
```

Demo account: **`demo@example.com`** / **`password123`**

### 2. Start the Frontend

```bash
# from repo root
cp .env.local.example .env.local   # already points to http://localhost:4000
npm install
npm run dev                         # starts on http://localhost:3000
```

Open http://localhost:3000 — sign in with the demo account or register a new one.

---

## Environment Variables

### API (`api/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite (local dev) or Postgres connection string |
| `JWT_SECRET` | — | Random secret — **change in production** |
| `CLIENT_ORIGIN` | `http://localhost:3000` | Frontend URL for CORS |
| `COOKIE_SECURE` | `false` | Set `true` when running over HTTPS |
| `PORT` | `4000` | API listen port |

**Switching to PostgreSQL:** change `provider = "sqlite"` → `"postgresql"` in `api/prisma/schema.prisma` and set `DATABASE_URL` to a Neon/Supabase/Render connection string.

### Frontend (`.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Leave **unset** for localStorage-only (no auth) mode |

---

## Project Structure

```
/                          ← Next.js frontend
  src/
    app/page.tsx           ← Auth bootstrap + route guard
    components/
      auth/AuthPage.tsx    ← Login / register UI
      layout/TopBar.tsx    ← Avatar with user menu + logout
      CalendarApp.tsx      ← Main orchestrator (overlap wiring)
    lib/data/
      types.ts             ← CalendarEvent + EventRepository interface
      HttpEventRepository  ← Fetch-based backend repo
      LocalStorageEventRepo← Offline / demo fallback repo
      useEventRepository   ← Switches on NEXT_PUBLIC_API_URL
    store/
      authStore.ts         ← Zustand: user, login, logout, bootstrap

api/                       ← Express + Prisma backend
  prisma/
    schema.prisma          ← User, Calendar, Event models
    seed.ts                ← Demo user + sample events
    migrations/            ← Committed migration SQL
  src/
    app.ts                 ← Express app (CORS, rate limit, routes)
    index.ts               ← Server entry point (dotenv → listen)
    middleware/
      auth.ts              ← JWT cookie guard (requireAuth)
      errorHandler.ts      ← Zod→422, AppError, central handler
    routes/                ← auth.ts, calendars.ts, events.ts
    controllers/           ← HTTP plumbing only (parse → call service → respond)
    services/              ← Business logic (auth, calendar, event)
    db/prisma.ts           ← Prisma client singleton
    lib/
      overlapDetection.ts  ← Pure predicate (same logic as frontend)
      recurringEvents.ts   ← rrule.js expansion + synthetic IDs
    schemas/               ← Zod schemas (auth, calendar, event)

docs/
  architecture.md          ← ASCII diagrams + data flow sequences
```

---

## Architecture & Tech Choices

### Layered API: routes → controllers → services → Prisma

Controllers are pure HTTP glue (parse, validate, respond). Services hold all business logic. This keeps controllers thin and services independently testable.

### Auth: JWT in httpOnly cookies

Storing the JWT in `httpOnly; Secure; SameSite` cookie prevents XSS-based token theft. CSRF is mitigated by `SameSite=Lax` for same-origin and `SameSite=None; Secure` for cross-origin deployments. bcrypt cost 12 makes brute-force infeasible.

### Repository abstraction

`EventRepository` is a pure TypeScript interface. The frontend switches between `LocalStorageEventRepository` (offline/demo) and `HttpEventRepository` (backend) at startup based on `NEXT_PUBLIC_API_URL`. Views call the same five methods regardless of backend — no view code changed.

### Prisma + SQLite/PostgreSQL

Defaults to SQLite for zero-setup local dev. Switch to PostgreSQL by changing one line in `schema.prisma`. The composite index `(userId, startUtc, endUtc)` keeps range queries fast at scale.

---

## Business Logic & Edge Cases

### Overlap Detection

The server is the authority. On `POST /events` and `PATCH /events/:id`:

1. Query for events in the same calendar with `startUtc < new.endUtc AND endUtc > new.startUtc`.
2. All-day events are excluded (same rule as the frontend).
3. If overlaps exist and `override` is absent → **409** `{ error: "overlap", conflicts: [...] }`.
4. `HttpEventRepository` catches 409 and throws `OverlapError`. `CalendarApp` catches it and shows the existing `OverlapWarning` modal.
5. On confirm, client resubmits with `override: true`; server skips check.

The same pure predicate lives in both `api/src/lib/overlapDetection.ts` and `src/lib/layout/overlapDetection.ts`. The frontend pre-check gives instant feedback; the server check is the enforced constraint.

### UTC Throughout

All datetimes are stored as UTC `DateTime` in Prisma and serialized with `.toISOString()`. The frontend owns all local-timezone display. Range query: `event.startUtc < range.endUtc AND event.endUtc > range.startUtc` — returns multi-day events and events that start before but extend into the window. End ≤ start is rejected with 422 for timed events.

### Recurring Events

**Storage model:**
- The **master** event holds the `rrule` string (RFC 5545 without `DTSTART`, e.g. `FREQ=WEEKLY;BYDAY=MO`). The master's `startUtc` is used as DTSTART when expanding.
- `exDatesJson` is a JSON array of ISO strings for explicitly excluded occurrences.
- **Override rows** are real `Event` rows with `recurringEventId = masterId`, `isException = true`, and `originalStartUtc` recording which occurrence they replace.
- Generated instances are **never stored** — computed on every `GET /events` read.

**Expansion on read:**
1. Fetch plain events and master events overlapping the range.
2. Fetch override rows for those masters.
3. `expandMaster()` calls `rrule.js between()`, strips `exDates`, replaces occurrences that have overrides, and assigns synthetic IDs: `${masterId}::${occurrenceStartUtcISO}`.

**Edit/delete scopes:**

| Scope | Edit | Delete |
|---|---|---|
| `single` | Add occurrence to `exDates`; create override row | Add occurrence to `exDates` |
| `following` | Truncate master RRULE with `UNTIL = occurrence − 1s`; create new master | Truncate master RRULE |
| `all` | Update master; cascade overrides | Delete master + override rows |

### Optimistic Concurrency

`PATCH /events/:id` accepts `expectedUpdatedAt`. If the server's `updatedAt` differs, it returns **409** `{ error: "stale", serverUpdatedAt }` so the client can refetch and retry — prevents lost updates when two devices edit the same event simultaneously.

### Calendar Deletion

Deleting a calendar cascades to all its events (enforced at the Prisma schema level via `onDelete: Cascade`). The frontend shows the calendar as immediately removed.

### Holidays — Computed Overlay

Holiday calendars use `kind = "holiday"` and `readOnly = true` on the `Calendar` model. Their events are **never stored as rows** — they are computed on every `GET /events` read using the [`date-holidays`](https://github.com/commenthol/date-holidays) library (offline, no external API call), then merged into the response alongside real events and expanded recurring instances.

**Why this mirrors the recurring-expansion pattern:** `expandMaster()` also generates synthetic DTOs on read without persisting instances. Holidays follow the same principle — the DB holds only the subscription (the `Calendar` row with `country = "IN"`), and the read path materialises events for the requested date window.

**Date anchoring:** `date-holidays` returns the local calendar date for each holiday (e.g. `"2026-01-26 00:00:00"` for Republic Day in IST). We strip the time component and anchor the all-day event to UTC midnight of that date (`2026-01-26T00:00:00.000Z`). This means Republic Day always renders on Jan 26 for users in UTC and any timezone ahead of UTC (i.e. all Indian users in +5:30).

**Read-only guards:**
- `PATCH`/`DELETE` on any ID starting with `holiday::` → **403 Holiday events are read-only** (checked before any DB query in `eventService`).
- Creating an event into a `readOnly` calendar → **403 This calendar is read-only**.
- Frontend: `HttpEventRepository.update/remove` throws immediately if the ID starts with `holiday::`. `WeekDayView` disables drag and resize for events with `readOnly: true`. `DetailPopover` hides Edit/Delete buttons.

**Overlap detection ignores holidays:** `findOverlappingEvents()` filters out any event where `readOnly === true`, so scheduling a meeting on Diwali never triggers a conflict warning.

**Country parameterisation:** adding a second holiday calendar (e.g. US) is a single DB insert:
```sql
INSERT INTO Calendar (id, userId, name, colorId, kind, country, readOnly, visible)
VALUES (cuid(), '<userId>', 'Holidays in United States', 'Sage', 'holiday', 'US', 1, 1);
```

**Future enhancement — ICS subscription:** the most authentic approach (used by Google Calendar itself) is to subscribe to a public holiday ICS feed and parse it with `node-ical`. This allows the exact same holidays Google shows, supports daylight-saving adjustments, and doesn't require bundling a holiday database. It would require a per-country+year cache layer (Redis or SQLite) to avoid re-fetching on every read.

---

## Animations & Interaction (Phase 1)

- **Drag-to-create:** `WeekDayView` uses pointer events to track a `DragState` union (`'create' | 'move' | 'resize-top' | 'resize-bottom'`). Coordinates → UTC via `getLocalMinutesFromMidnight`, snapped to 15-min increments.
- **Layout algorithm:** `layoutEvents()` clusters overlapping events, assigns column positions, and computes CSS `top/height/left/width` in pixels (`PX_PER_HOUR = 48`, min 15 min height).
- **Transitions:** View switches use Framer Motion `AnimatePresence mode="wait"`. Popovers scale-in from click anchor. Toast stack slides up.
- **Keyboard shortcuts:** `d/w/m` for views, `t` for today, `Esc` closes modals.

---

## Theory Questions

### Q1: Scaling to 1 million users

**Database:** Partition `Event` by `userId` (hash sharding) or use Citus/Aurora. The `(userId, startUtc, endUtc)` index (already in schema) keeps range queries on a single shard fast. Pre-materialise recurring instances nightly into `event_instances` to decouple read-heavy queries from write-heavy master updates.

**API:** Stateless Express nodes behind a load balancer. JWT requires no session store — any node can verify any token. Horizontal scale is linear.

**Read caching:** `GET /events` is the hot path. Cache responses in Redis keyed on `userId:startUtc:endUtc` with a 30 s TTL; invalidate on any write. This absorbs ~95% of reads at calendar scale.

**Recurring expansion:** Cap at 365 occurrences per request and refuse ranges > 1 year. At 1 M users with ≤10 recurring events each, expansion load is predictable and bounded.

**Optimistic concurrency** (already implemented) avoids row-level locks on writes. Debounce drag-resize PATCHes on the client to ≤1 req/500 ms.

### Q2: Rendering thousands of events without jank

**Virtual windowing:** Month view is bounded (≤35 cells × ≤3 chips = ~105 DOM nodes). For week/day, render only rows whose pixel range intersects the scroll viewport.

**Layout pre-computation:** `layoutEvents()` runs once per `events` array change, memoised. The render pass maps over pre-computed pixel positions — no DOM measurement at render time.

**Stable keys:** Event chips use `event.id` as React key so reconciler reuses DOM nodes on re-render. During drag, only the dragged chip's inline style changes — not the whole list.

**Server-side clustering:** For very busy days, the server can return count-only summaries for collapsed hour buckets. The client requests detail only when the user expands a slot — the same pattern Google Calendar uses.

---

## Deployment

### Frontend → Vercel

Set `NEXT_PUBLIC_API_URL=https://your-api.onrender.com` in the Vercel dashboard.

### API → Render

1. Root directory: `api/`
2. Build: `npm install && npx prisma generate && npm run build`
3. Start: `node dist/index.js`
4. Env vars: `DATABASE_URL` (Neon Postgres), `JWT_SECRET`, `CLIENT_ORIGIN=https://your-app.vercel.app`, `COOKIE_SECURE=true`
5. After first deploy, run `npx prisma migrate deploy` in the Render shell.

### CORS + cookies cross-origin

`COOKIE_SECURE=true` emits cookies with `Secure; SameSite=None`. `HttpEventRepository` sends `credentials: 'include'` on every request. Set `CLIENT_ORIGIN` to the exact Vercel origin (no trailing slash).
