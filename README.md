# Google Calendar Clone

A full-stack Google Calendar clone built with Next.js 16, Express, Prisma, and PostgreSQL. Supports multi-calendar management, recurring events, dark mode, offline-first fallback, and is fully deployed on Vercel + Render + Neon.

**Live demo:** https://google-calendar-clone-iota.vercel.app
_(Demo credentials: `demo@example.com` / `password123`)_

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Technology Choices](#technology-choices)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Deployment](#deployment)
- [Business Logic & Edge Cases](#business-logic--edge-cases)
- [Animations & Interactions](#animations--interactions)
- [API Reference](#api-reference)
- [Future Enhancements](#future-enhancements)

---

## Features

- **Three calendar views** — Month, Week, Day with smooth navigation
- **Multi-calendar support** — Personal, Work, Birthdays; toggle visibility per calendar
- **Recurring events** — daily, weekly, monthly, yearly (RFC 5545 RRULE); edit single / following / all occurrences
- **Holiday calendar** — auto-generated national holidays per country (no storage, computed on read)
- **Event overlap detection** — warns before saving conflicting events, with "Save anyway" override
- **Soft-delete trash** — 30-day retention, restore or permanently delete
- **Search** — debounced full-text search across title, description, location
- **Dark / Light / System theme** — no flash on page load
- **Offline-first fallback** — works with localStorage when no backend is configured
- **User settings** — week start day, default view, event duration, hide weekends
- **Print support** — `@media print` stylesheet hides chrome
- **Keyboard shortcuts** — `/` to search, `?` for shortcuts modal, `d/w/m` to switch views
- **Auth** — register, login, logout with JWT in httpOnly cookies
- **Rate limiting** — 20 auth requests per 15-minute window

---

## Architecture Overview

![Architecture Diagram](https://drive.google.com/uc?export=view&id=1HYxLRgyXNK9OgMtz9P86tHOwcK2SSrGj)

### Key design decisions

**Repository pattern for data access**
The frontend uses an `EventRepository` interface. Two implementations exist — `LocalStorageEventRepository` (offline) and `HttpEventRepository` (backend). `useEventRepository()` returns the right one based on whether `NEXT_PUBLIC_API_URL` is set. This means the entire frontend works standalone with no backend, which is useful for demos and local development.

**All timestamps in UTC**
Events store `startUtc` and `endUtc` as ISO 8601 strings in UTC. The UI converts to local time at render time using the browser's native `Date` API. This avoids timezone bugs when users travel or share events.

**Recurring events via synthetic IDs**
Generated occurrences of a recurring event are never stored — they are expanded from the master row at query time using `rrule.between()`. Each occurrence is identified by a synthetic ID `masterId::occurrenceStartUtc`. Edits are materialized as override rows (exception records with `recurringEventId` pointing to the master).

**Holidays are never stored**
The holiday calendar uses the `date-holidays` library on the API server to compute events on every read. No database rows are created. Events have read-only synthetic IDs prefixed `holiday::`.

---

## Technology Choices

| Layer | Technology | Why |
|---|---|---|
| Frontend framework | Next.js 16 (App Router) | File-based routing, SSR/static prerender, Turbopack builds |
| UI state | Zustand 5 | Minimal boilerplate, no Provider wrapper needed |
| Styling | Tailwind CSS v4 | Utility-first; v4's `@custom-variant` enables class-based dark mode |
| Animations | Framer Motion 12 | Declarative spring animations, `AnimatePresence` for mount/unmount |
| Icons | Lucide React | Tree-shakeable, consistent with Google Material style |
| Date math | date-fns 4 | Immutable, modular, locale-aware |
| API framework | Express 4 | Lightweight, well-understood, easy layered architecture |
| ORM | Prisma 5 | Type-safe queries, migration system, easy schema changes |
| Database | PostgreSQL (Neon) | ACID, full-text search, production-grade |
| Auth | JWT + httpOnly cookie | Cookie-based avoids XSS token theft; httpOnly prevents JS access |
| Validation | Zod | Runtime schema validation on all API inputs |
| Recurring events | rrule | RFC 5545 compliant RRULE parsing and expansion |
| Holiday data | date-holidays | Country-aware national holiday database |
| Rate limiting | express-rate-limit | Brute-force protection on auth routes |

---

## Project Structure

```
google-calendar-clone/
├── src/                              # Next.js frontend
│   ├── app/
│   │   ├── layout.tsx                # Root layout: no-flash theme script
│   │   ├── page.tsx                  # Entry: auth gate or calendar app
│   │   ├── globals.css               # Tailwind imports, CSS vars, print styles
│   │   └── error.tsx                 # App-level React error boundary
│   ├── components/
│   │   ├── CalendarApp.tsx           # Root calendar component, all state wiring
│   │   ├── auth/
│   │   │   └── AuthPage.tsx          # Login / register form
│   │   ├── views/
│   │   │   ├── MonthView.tsx         # Month grid
│   │   │   ├── WeekDayView.tsx       # Week and Day views (shared component)
│   │   │   └── CurrentTimeLine.tsx   # Red line for current time
│   │   ├── events/
│   │   │   ├── EventEditor.tsx       # Full event edit form (modal)
│   │   │   ├── QuickCreatePopover.tsx # Inline quick-create on day click
│   │   │   ├── DetailPopover.tsx     # Event detail on click
│   │   │   └── EventChip.tsx         # Event pill in calendar cells
│   │   ├── layout/
│   │   │   ├── TopBar.tsx            # Header: nav, search, settings gear menu
│   │   │   ├── Sidebar.tsx           # Mini-calendar + calendar list
│   │   │   └── MiniCalendar.tsx      # Small navigation calendar
│   │   └── ui/
│   │       ├── SearchBar.tsx         # Full-screen search overlay
│   │       ├── TrashModal.tsx        # Trash bin viewer
│   │       ├── AppearanceModal.tsx   # Theme picker (Light/Dark/System)
│   │       ├── SettingsModal.tsx     # User preferences
│   │       ├── KeyboardShortcutsModal.tsx
│   │       ├── OverlapWarning.tsx    # Conflict dialog
│   │       └── Toast.tsx             # Undo toast notifications
│   ├── lib/
│   │   ├── data/
│   │   │   ├── types.ts              # CalendarEvent type, EventRepository interface
│   │   │   ├── LocalStorageEventRepository.ts
│   │   │   ├── HttpEventRepository.ts
│   │   │   └── useEventRepository.ts # Hook: picks the right implementation
│   │   ├── layout/
│   │   │   ├── layoutEvents.ts       # Column-packing algorithm for overlapping events
│   │   │   └── overlapDetection.ts
│   │   └── time/
│   │       └── utils.ts              # Date helpers
│   └── store/
│       ├── index.ts                  # Calendar + event state (Zustand)
│       ├── authStore.ts              # User session, login/register/logout
│       ├── calendarListStore.ts      # Calendar list (visibility, colors)
│       ├── themeStore.ts             # Dark/light/system theme
│       └── settingsStore.ts          # User preferences (localStorage)
│
├── api/                              # Express backend (deployed to Render)
│   ├── src/
│   │   ├── app.ts                    # Express setup, CORS, rate limiting
│   │   ├── index.ts                  # Server entry point
│   │   ├── routes/                   # auth / calendars / events
│   │   ├── controllers/              # Request/response layer
│   │   ├── services/                 # Business logic
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT verification middleware
│   │   │   └── errorHandler.ts       # Centralized error → HTTP response
│   │   ├── schemas/                  # Zod input validation
│   │   └── lib/
│   │       ├── recurringEvents.ts    # RRULE expansion, synthetic IDs
│   │       ├── holidays.ts           # date-holidays wrapper
│   │       └── overlapDetection.ts
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
│
├── .vercelignore                     # Excludes api/ from Vercel build
├── next.config.ts
└── tsconfig.json
```

---

## Local Setup

### Prerequisites

- Node.js 20+
- npm 9+

### 1. Clone and install

```bash
git clone https://github.com/Shreya-singh22/google-calendar-clone.git
cd google-calendar-clone

# Frontend dependencies
npm install

# Backend dependencies
cd api && npm install && cd ..
```

### 2. Run without a backend (localStorage mode)

```bash
npm run dev
```

Open http://localhost:3000. The app runs in offline-first mode — all data is stored in your browser's `localStorage`. No account or database required.

### 3. Full-stack setup (auth + real database)

**a. Create a PostgreSQL database**

Use [Neon](https://neon.tech) (free tier) or a local PostgreSQL instance.

**b. Configure the API**

```bash
# Copy the example env file
cp api/.env.example api/.env
```

Edit `api/.env`:

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
JWT_SECRET="any-random-string-at-least-32-chars"
CLIENT_ORIGIN="http://localhost:3000"
COOKIE_SECURE="false"
PORT="4000"
```

**c. Push the schema and seed demo data**

```bash
cd api
npx prisma db push          # creates tables in your database
npx tsx prisma/seed.ts      # creates demo@example.com + default calendars
cd ..
```

**d. Start both servers**

```bash
# Terminal 1 — API
cd api && npm run dev

# Terminal 2 — Frontend (with backend URL)
NEXT_PUBLIC_API_URL=http://localhost:4000 npm run dev
```

Open http://localhost:3000. Log in with `demo@example.com` / `password123`.

### Available scripts

| Command | Directory | Description |
|---|---|---|
| `npm run dev` | root | Start Next.js dev server |
| `npm run build` | root | Production build |
| `npm run dev` | `api/` | Start Express with hot reload (`tsx watch`) |
| `npm run build` | `api/` | Compile TypeScript to `dist/` |
| `npx prisma studio` | `api/` | Open Prisma database GUI |
| `npx prisma migrate dev` | `api/` | Create a new migration after schema changes |

---

## Deployment

The project is deployed as two independent services:

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://google-calendar-clone-iota.vercel.app |
| API | Render (free tier) | https://google-calendar-clone-d6n1.onrender.com |
| Database | Neon PostgreSQL | (managed, serverless) |

### Deploy your own

**Step 1 — Database (Neon)**

1. Create a free project at [neon.tech](https://neon.tech)
2. Copy the connection string (it includes `?sslmode=require`)
3. Push the schema from your local machine:
   ```bash
   cd api
   DATABASE_URL="<your-neon-url>" npx prisma db push
   ```

**Step 2 — API (Render)**

1. Go to [render.com](https://render.com) → New Web Service → connect your GitHub repo
2. Configure:
   - **Root Directory:** `api`
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `node dist/index.js`
3. Add environment variables:
   ```
   DATABASE_URL   = <your Neon connection string>
   JWT_SECRET     = <run: openssl rand -hex 32>
   CLIENT_ORIGIN  = https://<your-vercel-domain>.vercel.app
   COOKIE_SECURE  = true
   PORT           = 10000
   ```
4. Deploy — your API URL will be `https://<name>.onrender.com`

**Step 3 — Frontend (Vercel)**

1. Import your GitHub repo at [vercel.com](https://vercel.com)
2. Add one environment variable:
   ```
   NEXT_PUBLIC_API_URL = https://<your-render-api>.onrender.com
   ```
3. Deploy

> **Free tier note:** Render's free tier sleeps services after 15 minutes of inactivity. The first request after sleep takes up to 50 seconds. The app handles this with a 10-second timeout on the auth bootstrap — showing a spinner rather than a blank page.

---

## Business Logic & Edge Cases

### Event overlap detection

Overlap is checked **per calendar** (not across all calendars). Two intervals `[s1, e1)` and `[s2, e2)` overlap when `s1 < e2 AND e1 > s2`. All-day events are excluded — they represent full-day reservations, not time blocks. Users can bypass the warning with "Save anyway". The frontend shows the conflicting event's name; the API returns the full conflict list in the 409 response body.

### Recurring events — three edit scopes

The RRULE engine (RFC 5545) runs on the server:

- **This event only** — adds the occurrence's ISO timestamp to `exDatesJson` on the master (hides the generated instance), then creates a new exception override row with `recurringEventId` pointing to the master and `isException: true`
- **This and following** — truncates the master's RRULE `UNTIL` to just before this occurrence; creates a new master event from this occurrence forward with a reconstructed RRULE
- **All events** — modifies the master row directly; all generated instances reflect the change immediately

Generated occurrences use synthetic IDs (`masterId::occurrenceStartISO`) so the REST API can address them without storing them.

### Soft-delete and trash

Deleting an event sets `deletedAt` to the current timestamp. All live-event queries include `deletedAt: null`. Trash retains events for 30 days. The undo toast on delete calls `restore()` which clears `deletedAt`. Permanent deletion removes the row entirely. Recurring master soft-deletes cascade to all override rows.

### Holiday calendars

Holidays are computed by the `date-holidays` library on every API read — zero rows stored. Dates are anchored to UTC midnight (`YYYY-MM-DDT00:00:00.000Z`) so Republic Day always falls on Jan 26 regardless of the user's timezone offset. Attempts to edit or delete holiday events return HTTP 403.

### Timezone handling

All `startUtc` / `endUtc` values are stored and transmitted in UTC. The `<input type="datetime-local">` widget in EventEditor works in the user's local timezone. The conversion is:
- **Display:** `new Date(utcIso)` → browser formats in local time
- **Save:** `new Date(datetimeLocalString).toISOString()` → back to UTC

The `toDatetimeLocal` helper reads `d.getHours()` / `d.getMinutes()` (local time) from a Date object, producing the correct local representation without any explicit timezone conversion.

### Auth and sessions

- Passwords hashed with bcrypt at cost factor 12
- JWT stored in an `httpOnly`, `Secure`, `SameSite=Lax` cookie — inaccessible to JavaScript, mitigating XSS token theft
- Auth routes rate-limited: 20 requests per 15-minute window per IP
- `bootstrap()` fires on mount with a 10-second `AbortController` timeout to restore sessions; resolves to logged-out state on any error, preventing infinite loading

### Offline-first mode

When `NEXT_PUBLIC_API_URL` is not set, `useEventRepository()` returns `LocalStorageEventRepository`. This implementation covers the full interface including search, trash, and restore, storing events in two separate `localStorage` keys (live + trash). No UI component knows which implementation is active.

---

## Animations & Interactions

### Modal animations (Framer Motion)

All modals use `AnimatePresence` so they animate out before unmounting:

```tsx
<AnimatePresence>
  {open && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    />
  )}
</AnimatePresence>
```

The backdrop overlay (`opacity: 0 → 0.4`) and the modal card (`scale: 0.95 → 1`) animate independently so they can have different timing curves. The search bar slides in from the top with a slightly longer spring to feel deliberate.

### No-flash dark mode

A tiny synchronous inline `<script>` in `<head>` runs before React mounts and before any paint:

```js
(function(){
  try {
    var t = localStorage.getItem('cal-theme') || 'system';
    if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
```

This guarantees the `.dark` class is on `<html>` before the first pixel is painted, preventing the white flash that occurs when theme is applied after hydration. Tailwind v4's `@custom-variant dark (&:is(.dark *))` handles all dark-mode variants.

### Overlapping event layout (week / day view)

A custom column-packing algorithm in `layoutEvents.ts`:

1. Sort events by start time; break ties by longest duration first
2. Group into **clusters** — a cluster is any maximal set of events where at least one overlaps with another
3. Within each cluster, greedily assign events to the leftmost column where the last event ends before this one starts
4. Compute `left` and `width` as percentages of the number of columns in the cluster

Events render with `position: absolute` inside a container `24 × 48px` tall (48px per hour, configurable via `PX_PER_HOUR`). Short events enforce a minimum visual height of 15 minutes.

### Current time indicator

`CurrentTimeLine.tsx` calculates its `top` in pixels from midnight and updates every 60 seconds via `setInterval`. It uses a small red circle at the left edge plus a full-width horizontal line, matching Google Calendar's design.

### Debounced search

`SearchBar.tsx` fires the search query 250ms after the user stops typing using `useEffect` with `setTimeout`/`clearTimeout`. The `/` key anywhere in the app focuses the search input via a `keydown` listener in `TopBar.tsx`. `Escape` closes the overlay.

### Toast notifications

The undo toast for deleted events auto-dismisses after 5 seconds. Clicking "Undo" immediately calls `repo.restore(id)` and refreshes the event list. Toasts are stored as a simple array in component state and rendered as a fixed stack at the bottom of the screen.

---

## API Reference

All endpoints require a valid session cookie (set by `/auth/login`) except the auth routes themselves. Auth endpoints are rate-limited to 20 req / 15 min per IP.

### Auth

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password, name? }` | `{ id, email, name }` |
| POST | `/auth/login` | `{ email, password }` | `{ id, email, name }` + sets cookie |
| POST | `/auth/logout` | — | Clears cookie |
| GET | `/auth/me` | — | `{ id, email, name }` |

### Calendars

| Method | Path | Description |
|---|---|---|
| GET | `/calendars` | List all calendars for the current user |
| POST | `/calendars` | Create a calendar (`{ name, colorId, kind? }`) |
| PATCH | `/calendars/:id` | Update name, color, or visibility |
| DELETE | `/calendars/:id` | Delete calendar and all its events |

### Events

| Method | Path | Query / Body | Description |
|---|---|---|---|
| GET | `/events` | `?startUtc=&endUtc=` | List events in range; recurring events expanded |
| GET | `/events/search` | `?q=` | Full-text search (title, description, location) |
| GET | `/events/trash` | — | Soft-deleted events within 30 days |
| POST | `/events` | event body | Create event; `override: true` skips overlap check |
| PATCH | `/events/:id` | patch body + `?scope=` | Update; scope: `single` / `following` / `all` |
| DELETE | `/events/:id` | `?permanent=true&scope=` | Soft-delete (default) or hard-delete |
| POST | `/events/:id/restore` | — | Restore from trash |
| GET | `/health` | — | `{ status: "ok", ts }` |

**Overlap conflict response (409):**
```json
{
  "error": "overlap",
  "conflicts": [{ "id": "...", "title": "Meeting", "startUtc": "...", "endUtc": "..." }]
}
```

---

## Future Enhancements

### Features

- **Google Calendar sync** — OAuth2 + Google Calendar API to import/export real events bidirectionally
- **Event invites and sharing** — share calendars or events with other users by email; accept/decline responses
- **Event attachments** — file uploads (S3 / Cloudflare R2) linked to events
- **Notifications and reminders** — email and Web Push reminders via a background job queue (BullMQ)
- **Natural language input** — parse "Lunch with Alex next Tuesday at noon" into structured events using an LLM
- **Drag and drop** — reschedule events by dragging in week/day view using `@dnd-kit`
- **More recurrence options** — monthly on last weekday, custom intervals, count-based limits
- **Timezone per event** — specify a different timezone per event for travel use cases

### Infrastructure

- **WebSocket live updates** — push event changes to all open tabs in real time (Socket.io or Server-Sent Events)
- **Service worker + background sync** — queue offline edits and replay when connectivity returns
- **Persistent hosting** — move API from Render free tier to Railway or Fly.io to eliminate the 50-second cold start
- **Observability** — structured logging (Pino), distributed tracing (OpenTelemetry), error tracking (Sentry)
- **CI/CD pipeline** — GitHub Actions: TypeScript checks, ESLint, and integration tests on every PR

### Code quality

- **Test suite** — unit tests for `layoutEvents`, `overlapDetection`, `recurringEvents`; API integration tests against a test database
- **Storybook** — component catalogue for EventChip, EventEditor, MiniCalendar
- **Internationalization** — i18n with `next-intl` for date formats, weekday names, and UI strings
