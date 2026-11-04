# Nr5 Studios – booking platform

Tattoo studio website with a step-by-step booking flow and an artist dashboard.
React 19 + TypeScript + Vite + Tailwind CSS v4 + Supabase.

> Work in progress — built in phases. Full setup docs (Supabase, email, deployment) are added in later phases.

## Run locally

```bash
npm install
cp .env.example .env   # fill in Supabase URL + anon key (optional until phase 4)
npm run dev            # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit/component + database tests |
| `npm run test:functions` | Deno tests for the Edge Functions |

## Where things live

- `src/index.css` – design tokens (colours, fonts, radii) in Tailwind's `@theme`
- `src/lib/config.ts` – studio name, contact info, opening hours, policy fallbacks
- `src/components/ui` – reusable primitives (Button, Section, form fields, Stepper…)
- `src/components/layout` – header, footer, layouts
- `src/pages` – route components
- `supabase/` – migrations and Edge Functions (from phase 4)

## Supabase setup

1. **Create the database** – open the Supabase dashboard → *SQL Editor* → *New query*, paste the whole of
   [`supabase/setup-all.sql`](supabase/setup-all.sql) and click *Run*. It runs in one transaction: either everything
   is created or nothing is. (Generated from `supabase/migrations/*` + `supabase/seed.sql` with `npm run db:bundle`.)
2. **Turn off public sign-ups** – *Authentication → Sign In / Providers →* disable "Allow new users to sign up".
   Staff accounts are created by an admin; customers never need an account. (Even if left on, a stranger gets no
   dashboard access: profiles are only created for users whose `app_metadata.studio_role` is set.)
3. **Switch the app to Supabase** – remove `VITE_DATA_SOURCE=demo` from `.env` and restart `npm run dev`.

Using the Supabase CLI instead: `npx supabase link --project-ref <ref>` then `npx supabase db push` and run the seed.

### What lives where

| Migration | Contents |
| --- | --- |
| `…01_schema.sql` | Tables, enums, constraints, indexes, **exclusion constraint** against overlapping bookings |
| `…02_security.sql` | Row Level Security, column privileges, staff-profile trigger, booking status rules |
| `…03_booking_functions.sql` | `get_artist_schedule` (public calendar data), `create_booking` (validation, availability re-check, age policy, rate limit) |
| `…04_storage.sql` | Private `reference-images` bucket and its policies |
| `…06_profile_on_role_update.sql` | Creates staff profiles when the role is set after sign-up (admin API order) |
| `…07_notifications.sql` | Email outbox: queued on booking changes, claimed by the sender, retries; customer language |
| `…05_dashboard.sql` | Weekly-hours RPC, cancellation reason, admin-only artist visibility, public `artist-photos` bucket |

Customers create bookings only through `create_booking()` (a `SECURITY DEFINER` function): prices, durations and
statuses are decided in the database, never trusted from the browser.

### Edge Function: `admin-users`

Creating logins needs Supabase's service-role key, which must never reach the browser. The admin's
"Legg til person", "Nytt passord" and "Steng konto" buttons therefore call a small Edge Function that first checks
the caller is an admin. Deploy it once:

- **Dashboard (no CLI):** Supabase → *Edge Functions* → *Deploy a new function* → *Via Editor*, name it
  `admin-users`, paste [`supabase/functions/admin-users/index.ts`](supabase/functions/admin-users/index.ts), *Deploy*.
  Keep "Verify JWT" on.
- **CLI:** `npx supabase functions deploy admin-users --project-ref <ref>`

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the function automatically.

### Emails and calendar invitations (`send-notifications`)

**Status:** built and unit-tested. Not verified end-to-end until a Resend API key is set (see below).

How it works: every booking change queues rows in `notifications` *in the same transaction* (customer + artist).
The `send-notifications` Edge Function claims due rows, builds the email (NO/EN for customers, NO for artists) with
an `.ics` invitation (`METHOD:REQUEST`, or `CANCEL` when a confirmed booking is cancelled), sends via Resend with the
notification id as `Idempotency-Key`, and records `sent`/`failed`. Failed rows retry after 1, 5, 15, 60 min (max 5
attempts). Email problems can therefore never block or duplicate a booking. Staff see per-booking delivery status in
the dashboard and can click *Send på nytt*.

| Event | Customer | Artist |
| --- | --- | --- |
| New booking (adult) | Confirmation + invite | New booking + invite |
| New request (under age) | "Request received", consent form link, no invite | "Waiting for approval" |
| Request approved | Confirmed + invite | Confirmed + invite |
| Cancelled | Cancelled (+ reason) + calendar cancel if it was confirmed | Cancelled + calendar cancel |
| Time changed | New time + updated invite | Moved + updated invite |

Setup:
1. Create a free account at [resend.com](https://resend.com) and an API key (*Sending access*).
2. Supabase → *Edge Functions* → *Secrets*: add `RESEND_API_KEY`, `EMAIL_TEST_RECIPIENT` (your Resend sign-up email)
   and `SITE_URL` (`http://localhost:5173` for now).
3. Deploy `supabase/functions/send-notifications/index.ts` as a function named `send-notifications`.
4. Optional safety net: run [`supabase/cron-setup.sql`](supabase/cron-setup.sql) to process the queue every minute.

**Test mode:** without your own domain, Resend only delivers to the address you signed up with.
`EMAIL_TEST_RECIPIENT` sends *every* email there, with the real recipient in the subject (`[TEST → kunde@…]`).
When the domain is ready: verify it in Resend, set `EMAIL_FROM` (e.g. `Nr5 Studios <booking@send.yourdomain.no>`)
and delete `EMAIL_TEST_RECIPIENT`.

### Test users

`supabase/seed.sql` creates three accounts (Shmoky, AJ, admin) on the fake `.test` domain. Their passwords are in the
comment at the top of that file. They are for this demo project only – change or delete them before launch.

### Database tests

`npm run test:db` applies all migrations + seed to an in-memory Postgres (PGlite) with a small stand-in for Supabase's
`auth`/`storage` schemas, and tests double booking, simultaneous requests, buffers, age policy, rate limiting, RLS
per artist and private image access.

## Artist dashboard (`/dashboard`)

Everything day-to-day happens here – no Supabase or code needed:

| Page | Who | What |
| --- | --- | --- |
| Oversikt | all | Today, upcoming, pending requests, completed/cancelled this month |
| Avtaler | all | List + month calendar, search/filter, details (contact, idea, private reference image, consent, policy acceptance), confirm / cancel with reason / completed / no-show |
| Tilgjengelighet | all | Weekly hours incl. split shifts, buffer, days off/vacation ranges, blocked windows, extra working days, colour-coded calendar, warning when new time off overlaps existing bookings |
| Tjenester og priser | all | Edit/add services, prices, durations, hide from booking |
| Min profil | all | Photo, name, bio (NO/EN), styles, change own password |
| Studio og team | admins | Booking rules (fee, deadline, terms version, age policy, slot grid, notice, horizon); add people, reset passwords, hide/show artists, lock accounts |

Artists only ever see and change their own schedule and appointments (enforced by RLS, not just the UI). Admins can
switch between artists in the menu.

### Demo mode

With `VITE_DATA_SOURCE=demo` (or without Supabase credentials) the booking flow runs on an in-browser data source
(`src/services/demoRepository.ts`) that applies the same rules. Useful for presenting offline.

## Before launch (open tasks)

- [ ] **Email domain** – buy a domain, add a sending subdomain (e.g. `send.<domain>`) in Resend, add its DNS records and verify. Then set `EMAIL_FROM`, remove `EMAIL_TEST_RECIPIENT` and set `SITE_URL` to the live address. Until then emails only work in Resend test mode (delivered to the Resend account owner only).
- [ ] Delete or change the seeded test users and their passwords
- [ ] Remove setup-verification bookings: `delete from public.bookings where customer_email like 'verifisering%@example.com';`
- [ ] Clean up orphaned uploads in `reference-images/uploads` (files from abandoned bookings) – e.g. a scheduled job
- [ ] Replace placeholder logo (`studio.logoUrl` in `src/lib/config.ts`)
- [ ] Replace placeholder photos, address, phone and opening hours
- [ ] Real guardian consent form (replace `public/samtykkeskjema-placeholder.pdf`)
- [ ] Official prices and booking terms
