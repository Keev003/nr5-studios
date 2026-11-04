# Nr5 Studios – booking platform

Website for the tattoo studio **Nr5 Studios** in Oslo, with a five-step booking flow, an artist dashboard,
email confirmations with calendar invitations, and a Supabase backend that enforces every business rule on the server.

**Live:** [www.nr5studios.no](https://www.nr5studios.no) (Vercel) · **Repository:** private (GitHub)

---

## Contents

1. [Features](#features)
2. [Technologies](#technologies)
3. [Running locally](#running-locally)
4. [Environment variables](#environment-variables)
5. [Supabase setup](#supabase-setup) – database, auth, storage
6. [Email and calendar invitations](#email-and-calendar-invitations)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Security](#security)
10. [Accessibility](#accessibility)
11. [Project structure](#project-structure)
12. [Before launch](#before-launch-open-tasks)

---

## Features

**Public website (Norwegian, with an English toggle)**
- Homepage: hero, about, artists (live from the database), gallery with lightbox, how booking works, contact.
- Booking in five steps: artist → service → date & time → details → review. Back navigation keeps everything; the
  browser back button moves between steps; "Book med …" on an artist preselects them.
- Calendar shows only times where the whole service fits inside the artist's hours, around existing bookings,
  buffers, days off and blocked windows – computed in `Europe/Oslo`, daylight-saving safe.
- Optional reference image (JPG/PNG/WebP ≤ 10 MB) stored in a **private** bucket.
- Age is checked on the appointment date. Under-18s get a guardian-consent notice and form; their booking becomes a
  *pending request* that can never be auto-confirmed (configurable: allow as request, or refuse).
- The studio's cancellation terms are shown before booking; the checkbox "Jeg har lest og forstått
  avbestillingsvilkårene" is unticked by default and mandatory (also enforced by the database). Acceptance time and
  terms version are stored with the booking.
- Confirmation page with booking reference and "Legg til i kalender" (`.ics`).

**Artist dashboard (`/dashboard`)** – everything day-to-day, no Supabase or code needed

| Page | Who | What |
| --- | --- | --- |
| Oversikt | all | Today, upcoming, pending requests, completed / cancelled this month |
| Avtaler | all | List + month calendar, search/filter, details (contact, idea, private reference image, consent, policy acceptance, email status), confirm / cancel with reason / completed / no-show |
| Tilgjengelighet | all | Weekly hours incl. split shifts, buffer, vacation ranges, blocked windows, extra working days, colour-coded calendar, warning when new time off clashes with bookings |
| Tjenester og priser | all | Edit/add services, prices, durations, hide from booking |
| Min profil | all | Photo, name, bio (NO/EN), styles, change own password |
| Studio og team | admins | Booking rules (cancellation windows/percentage, terms version, age policy, slot grid, notice, horizon); add people, reset passwords, hide/show artists, lock accounts |

Artists only ever see and change their own schedule and appointments – enforced by Row Level Security, not just the UI.

## Technologies

| Area | Choice |
| --- | --- |
| Frontend | React 19, TypeScript (strict), Vite 8, Tailwind CSS v4, React Router 7 |
| Forms & validation | React Hook Form + Zod |
| Dates | date-fns + `@date-fns/tz` (Europe/Oslo), React DayPicker |
| Icons | Lucide |
| Backend | Supabase: PostgreSQL, Auth, Storage, Edge Functions (Deno) |
| Email | Resend (sending domain `booking.nr5studios.no`) |
| Hosting | Vercel (static build from GitHub) |
| Tests | Vitest + Testing Library, PGlite (real Postgres in-process) for SQL, Deno test for Edge Functions, axe-core for accessibility |

## Running locally

Requires Node.js ≥ 20.19.

```bash
npm install
cp .env.example .env      # fill in the two Supabase values
npm run dev               # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the build **with the same security headers as Vercel** (`vercel.json`) |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm test` | All Vitest suites (frontend + database) |
| `npm run test:db` | Database tests only |
| `npm run test:functions` | Deno tests for the Edge Functions |
| `npm run db:bundle` | Regenerate `supabase/setup-all.sql` from migrations + seed |

**Demo mode:** with `VITE_DATA_SOURCE=demo` (or without Supabase credentials) the booking flow runs on an in-browser
data source (`src/services/demoRepository.ts`) that applies the same rules – handy for presenting offline.

## Environment variables

| Where | Name | Notes |
| --- | --- | --- |
| `.env` / Vercel | `VITE_SUPABASE_URL` | Project URL. Must start with `VITE_` or Vite will not include it. |
| `.env` / Vercel | `VITE_SUPABASE_ANON_KEY` | Public anon key (safe in the browser; RLS protects data). |
| `.env` (optional) | `VITE_DATA_SOURCE=demo` | Force demo mode. |
| Supabase → Edge Functions → Secrets | `RESEND_API_KEY` | Required for email. |
| 〃 | `EMAIL_FROM` | `Nr5 Studios <bekreftelse@booking.nr5studios.no>` |
| 〃 | `SITE_URL` | `https://www.nr5studios.no` (links in emails) |
| 〃 | `EMAIL_TEST_RECIPIENT` | Optional: send *every* email here instead (testing). Remove for production. |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected into Edge Functions automatically.
**Never** put the service-role key or the Resend key in `.env`, Vercel, or any `VITE_` variable.

## Supabase setup

### Database (migrations)

New project: Supabase → *SQL Editor* → paste [`supabase/setup-all.sql`](supabase/setup-all.sql) → *Run* (one
transaction: everything or nothing). Existing project: run only the migrations not yet applied, in order.

| Migration | Contents |
| --- | --- |
| `…01_schema.sql` | Tables, enums, constraints, indexes, **exclusion constraint** against overlapping bookings |
| `…02_security.sql` | Row Level Security, column privileges, staff-profile trigger, booking status rules |
| `…03_booking_functions.sql` | `get_artist_schedule` (public calendar data), `create_booking` (validation, availability re-check, age policy, rate limit) |
| `…04_storage.sql` | Private `reference-images` bucket and its policies |
| `…05_dashboard.sql` | Weekly-hours RPC, cancellation reason, admin-only artist visibility, public `artist-photos` bucket |
| `…06_profile_on_role_update.sql` | Staff profile when the role is set after sign-up (admin API order) |
| `…07_notifications.sql` | Email outbox, retries, customer language |
| `…08_cancellation_tiers.sql` | Studio's tiered cancellation terms (48 h free / 50 % / 100 %), terms version 2026-11-04 |

Customers create bookings only through `create_booking()` (`SECURITY DEFINER`): prices, durations and statuses are
decided in the database, never trusted from the browser.

### Authentication

- *Authentication → Sign In / Providers*: **disable "Allow new users to sign up"**. Customers never need accounts;
  staff are added by an admin from the dashboard. (Even if left on, a stranger gets no access: profiles are only
  created for users whose `app_metadata.studio_role` is set, which only the service role can do.)
- Staff are created by the `admin-users` Edge Function (admin-only), with a temporary password the admin passes on.
- Test users (Shmoky, AJ, admin) are in [`supabase/seed.sql`](supabase/seed.sql); passwords are in its header. Demo only.

### Storage

| Bucket | Access |
| --- | --- |
| `reference-images` (private, 10 MB, images) | Anyone may upload to `uploads/<uuid>.<ext>`; nobody can list or read except the assigned artist and admins (short-lived signed URLs). |
| `artist-photos` (public, 5 MB, images) | Artists upload to their own folder, admins anywhere. |

### Edge Functions

Deploy each via Supabase → *Edge Functions* → *Deploy a new function* → *Via Editor* (name exactly as below, paste the
file into `index.ts`), or `npx supabase functions deploy <name>`.

| Function | File | Purpose |
| --- | --- | --- |
| `admin-users` | [`supabase/functions/admin-users/index.ts`](supabase/functions/admin-users/index.ts) | Create staff, reset passwords, lock/unlock accounts. Verifies the caller is an admin. |
| `send-notifications` | [`supabase/functions/send-notifications/index.ts`](supabase/functions/send-notifications/index.ts) | Sends queued emails with `.ics` invitations via Resend. |

## Email and calendar invitations

Every booking change queues rows in `notifications` *in the same transaction* (customer + artist). `send-notifications`
claims due rows, builds the email (NO/EN for customers, NO for artists) with an `.ics` invitation (`METHOD:REQUEST`, or
`CANCEL` when a confirmed booking is cancelled), sends via Resend with the notification id as `Idempotency-Key`, and
records `sent`/`failed`. Failed rows retry after 1, 5, 15, 60 min (max 5 attempts). An email problem can therefore
never block or duplicate a booking. Staff see delivery status per booking and can click *Send på nytt*.

| Event | Customer | Artist |
| --- | --- | --- |
| New booking (adult) | Confirmation + invite + cancellation terms | New booking + invite |
| New request (under age) | "Request received", consent form link, no invite | "Waiting for approval" |
| Request approved | Confirmed + invite | Confirmed + invite |
| Cancelled | Cancelled (+ reason) + calendar cancel if it was confirmed | Cancelled + calendar cancel |
| Time changed | New time + updated invite | Moved + updated invite |

Calendar entries contain only service, artist, reference and studio contact – no surname, phone or tattoo details.

**Setup:** Resend account → API key → verify `booking.nr5studios.no` (its DKIM/SPF records are in the domene.no DNS) →
set the secrets above → deploy `send-notifications`. Optional safety net: run
[`supabase/cron-setup.sql`](supabase/cron-setup.sql) so the queue is processed every minute.

## Testing

**120 automated tests** (110 Vitest + 10 Deno). Database tests apply every migration and the seed to a real
PostgreSQL (PGlite) with a small stand-in for Supabase's `auth`/`storage` schemas, then call the functions as an
anonymous visitor, an artist or an admin.

| Requirement from the brief | Where it is tested |
| --- | --- |
| Artist selection (incl. preselect from link) | `src/components/booking/BookingFlow.test.tsx`, `ArtistCard.test.tsx` |
| Service selection | `BookingFlow.test.tsx` |
| Booking form validation, image type/size | `src/lib/validation.test.ts` |
| Age calculation (appointment date, leap years) | `src/lib/age.test.ts` |
| Guardian-consent flow | `AgeNotice.test.tsx` (customer), `BookingDetailModal.test.tsx` (staff), `supabase/tests/booking.test.ts` + `dashboard.test.ts` (cannot confirm without consent) |
| Available time-slot calculation, DST | `src/lib/availability.test.ts` |
| Appointment overlaps & buffers | `availability.test.ts`, `supabase/tests/booking.test.ts` (exclusion constraint) |
| Simultaneous booking attempts | `supabase/tests/booking.test.ts` |
| Cancellation-policy checkbox & terms | `BookingFlow.test.tsx`, `supabase/tests/cancellation.test.ts` |
| Authentication & authorisation | `RequireStaff.test.tsx`, RLS tests in `supabase/tests/*.test.ts` |
| Artist-specific dashboard access | `supabase/tests/booking.test.ts` ("staff access"), `dashboard.test.ts`, `notifications.test.ts` |
| Email content, `.ics`, no personal data in calendars | `supabase/functions/send-notifications/index.test.ts` |
| Recovery after a new deploy | `src/utils/staleDeploy.test.ts` |

Manual checks done during development: every page at 375 / 768 / 1024 / 1440 px; axe-core (WCAG 2.1 AA) on every
public page in both languages and on all dashboard pages; booking, double booking, upload and email end-to-end
against the live Supabase project.

## Deployment

- **Vercel** builds from the `main` branch on GitHub (`npm run build` → `dist/`). [`vercel.json`](vercel.json) adds
  SPA rewrites (direct links to `/booking` etc. work), long caching for hashed assets, and security headers.
- **Domain:** `nr5studios.no` (registered and DNS at domene.no) → Vercel; `www.nr5studios.no` is the main address.
- **Order matters** when a change needs a new migration: run the migration in Supabase first, then push the code,
  then redeploy any changed Edge Function.
- A visitor who has an old version open when a new one is deployed is reloaded once automatically
  (`src/utils/staleDeploy.ts`) instead of seeing a blank page.

## Security

- **Server-side rules:** prices, durations, statuses, availability and age policy are decided in `create_booking`;
  overlapping bookings are impossible at database level (exclusion constraint + per-artist advisory lock).
- **RLS on every table**; visitors cannot read bookings, profiles, raw availability or the email outbox; column
  privileges stop artists changing prices or customer data; status transitions are validated by a trigger.
- **Spam:** honeypot field, per-email and studio-wide rate limits, strict field validation.
- **Secrets:** only the public anon key reaches the browser; service-role and Resend keys live in Edge Function secrets.
- **Headers (Vercel):** Content-Security-Policy (only self, Supabase, Unsplash, Google Fonts), HSTS,
  `X-Frame-Options: DENY`, `nosniff`, strict referrer and permissions policies.
- `npm audit --omit=dev`: 0 known vulnerabilities (2026-11-04).

## Accessibility

Semantic landmarks and headings, skip link, visible focus, keyboard-operable calendar/time slots/dialogs, labelled
form fields with announced errors, `lang` switches with the language, per-page `<title>`, WCAG AA contrast, reduced
motion respected. Verified with axe-core (0 violations on all checked pages).

## Project structure

```
src/
  components/
    booking/     five booking steps, summary, cancellation terms, upload
    calendar/    month calendar used in the dashboard
    dashboard/   layout, appointments, availability, studio/team, guards
    home/        homepage sections
    layout/      header, footer, logo, error page
    ui/          Button, form fields, Modal, Stepper, …
  contexts/      booking draft, auth, dashboard scope, toasts
  hooks/         data and UI hooks
  i18n/          Norwegian + English dictionaries (type-checked to match)
  lib/           availability, age, ics, validation, time (Europe/Oslo), config
  pages/         route components (+ pages/dashboard)
  services/      Supabase/demo repositories, dashboard API, notifications
supabase/
  migrations/    numbered SQL migrations
  functions/     admin-users, send-notifications (Deno)
  tests/         PGlite database tests
  seed.sql, setup-all.sql, cron-setup.sql
```

## Before launch (open tasks)

- [ ] **Create the mailbox `contact@nr5studios.no`** (domene.no → kontrollpanel → E-postkontoer). It is the studio
  address on the site and the reply-to of every booking email; until it exists, replies bounce.
- [ ] Remove `EMAIL_TEST_RECIPIENT` from the Edge Function secrets once the test emails look right.
- [ ] **Privacy policy:** confirm retention periods with the studio and set up the deletion it promises (bookings after
  12 months, reference images after 3 months) – e.g. a scheduled job – or adjust the text.
- [ ] Confirm the draft sections of the booking terms (booking, age, health).
- [ ] Delete or change the seeded test users and their passwords.
- [ ] Remove setup-verification bookings:
  `delete from public.bookings where customer_email like 'verifisering%@example.com';`
- [ ] Clean up orphaned uploads in `reference-images/uploads` (from abandoned bookings) – e.g. a scheduled job.
- [ ] Studio's own logo, photos, address, phone and opening hours (planned together with the layout redesign).
- [ ] Real guardian consent form (replace `public/samtykkeskjema-placeholder.pdf`).
- [ ] Official prices.
