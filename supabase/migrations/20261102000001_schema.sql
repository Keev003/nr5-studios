-- =============================================================================
-- Nr5 Studios – core schema
-- Tables, types, constraints and indexes. Security (RLS) lives in the next
-- migration; booking logic in the one after.
-- =============================================================================

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('artist', 'admin');
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
create type public.minor_policy as enum ('reject', 'pending_with_guardian_consent');

-- -----------------------------------------------------------------------------
-- Staff accounts. One row per studio user in auth.users (artists and admins).
-- Customers never get accounts.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        public.app_role not null default 'artist',
  email       text not null,
  created_at  timestamptz not null default now()
);

create table public.artists (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid unique references public.profiles (id) on delete set null,
  slug            text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name            text not null check (char_length(name) between 1 and 60),
  bio             text not null default '',
  bio_en          text,
  image_url       text,
  specialties     text[] not null default '{}',
  -- Free time kept before and after each appointment.
  buffer_minutes  integer not null default 15 check (buffer_minutes between 0 and 240),
  sort_order      integer not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create table public.services (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name              text not null,
  description       text not null default '',
  -- Estimated price in whole NOK. 0 = free.
  price_nok         integer not null check (price_nok >= 0),
  duration_minutes  integer not null check (duration_minutes between 15 and 720 and duration_minutes % 15 = 0),
  -- Optional display text such as '1–2 timer'.
  duration_label    text,
  sort_order        integer not null default 0,
  active            boolean not null default true,
  updated_at        timestamptz not null default now()
);

-- Single-row table with business rules staff can change without a deploy.
create table public.studio_settings (
  id                          boolean primary key default true check (id),
  minimum_age                 integer not null default 18 check (minimum_age between 0 and 99),
  minor_policy                public.minor_policy not null default 'pending_with_guardian_consent',
  cancellation_fee_nok        integer not null default 500 check (cancellation_fee_nok >= 0),
  cancellation_deadline_hours integer not null default 24 check (cancellation_deadline_hours >= 0),
  policy_version              text not null,
  slot_interval_minutes       integer not null default 30 check (slot_interval_minutes in (15, 30, 60)),
  min_notice_hours            integer not null default 12 check (min_notice_hours >= 0),
  booking_horizon_days        integer not null default 120 check (booking_horizon_days between 1 and 400),
  guardian_consent_form_url   text not null default '/samtykkeskjema-placeholder.pdf',
  updated_at                  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Availability. Times are wall-clock times in Europe/Oslo.
-- day_of_week: 0 = Sunday … 6 = Saturday (same as EXTRACT(DOW)).
-- -----------------------------------------------------------------------------
create table public.artist_availability (
  id           uuid primary key default gen_random_uuid(),
  artist_id    uuid not null references public.artists (id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 0 and 6),
  start_time   time not null,
  end_time     time not null,
  check (end_time > start_time)
);
create index artist_availability_artist_day_idx on public.artist_availability (artist_id, day_of_week);

-- Date-specific overrides:
--   is_available = false, no times  → whole day off (vacation)
--   is_available = false, times     → that window blocked
--   is_available = true,  times     → custom hours replacing the weekly schedule
create table public.availability_exceptions (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references public.artists (id) on delete cascade,
  date          date not null,
  start_time    time,
  end_time      time,
  is_available  boolean not null,
  reason        text,
  check ((start_time is null) = (end_time is null)),
  check (end_time is null or end_time > start_time),
  check (not is_available or start_time is not null)
);
create index availability_exceptions_artist_date_idx on public.availability_exceptions (artist_id, date);

-- -----------------------------------------------------------------------------
-- Bookings. Inserted only through public.create_booking().
-- -----------------------------------------------------------------------------
create table public.bookings (
  id                               uuid primary key default gen_random_uuid(),
  booking_reference                text not null unique,
  artist_id                        uuid not null references public.artists (id) on delete restrict,
  service_id                       uuid not null references public.services (id) on delete restrict,
  -- Snapshots, so later price/name edits don't rewrite history.
  service_name                     text not null,
  price_nok                        integer not null,
  customer_name                    text not null check (char_length(customer_name) between 2 and 100),
  customer_email                   text not null check (customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  customer_phone                   text not null check (char_length(customer_phone) between 8 and 25),
  customer_date_of_birth           date not null,
  tattoo_placement                 text not null check (char_length(tattoo_placement) between 2 and 100),
  tattoo_description               text not null check (char_length(tattoo_description) between 10 and 2000),
  reference_image_path             text unique,
  starts_at                        timestamptz not null,
  ends_at                          timestamptz not null,
  status                           public.booking_status not null default 'pending',
  requires_guardian_consent        boolean not null default false,
  guardian_consent_verified_at     timestamptz,
  cancellation_policy_accepted_at  timestamptz not null,
  cancellation_policy_version      text not null,
  status_changed_at                timestamptz,
  created_at                       timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Atomic double-booking protection: two active bookings for the same
  -- artist can never overlap, no matter how requests race.
  constraint bookings_no_overlap exclude using gist (
    artist_id extensions.gist_uuid_ops with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);
create index bookings_artist_starts_idx on public.bookings (artist_id, starts_at);
create index bookings_status_idx on public.bookings (status);
create index bookings_email_created_idx on public.bookings (lower(customer_email), created_at);
create index bookings_created_idx on public.bookings (created_at);
