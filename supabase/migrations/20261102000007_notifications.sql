-- =============================================================================
-- Nr5 Studios – email notifications (outbox)
-- Booking changes enqueue notification rows in the same transaction, so an
-- email failure can never undo or duplicate a booking. The send-notifications
-- Edge Function claims due rows, sends them and records the result.
-- =============================================================================

-- Language the customer booked in, so their emails match.
alter table public.bookings add column language text not null default 'nb' check (language in ('nb', 'en'));

create type public.notification_kind as enum ('booking_received', 'booking_confirmed', 'booking_cancelled', 'booking_changed');
create type public.notification_recipient as enum ('customer', 'artist');
create type public.notification_status as enum ('pending', 'sending', 'sent', 'failed');

create table public.notifications (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid not null references public.bookings (id) on delete cascade,
  kind                 public.notification_kind not null,
  recipient            public.notification_recipient not null,
  -- Booking status before the change (decides e.g. whether a calendar cancel is needed).
  previous_status      public.booking_status,
  -- Calendar SEQUENCE: grows with each update so calendars replace the old event.
  calendar_sequence    integer not null default 0,
  status               public.notification_status not null default 'pending',
  attempts             integer not null default 0,
  next_attempt_at      timestamptz not null default now(),
  last_error           text,
  provider_message_id  text,
  created_at           timestamptz not null default now(),
  sent_at              timestamptz
);
create index notifications_due_idx on public.notifications (status, next_attempt_at);
create index notifications_booking_idx on public.notifications (booking_id);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon;
revoke insert, update, delete, truncate on public.notifications from authenticated;

create policy "Staff read notifications for their bookings" on public.notifications
  for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = notifications.booking_id
      and (b.artist_id = public.current_artist_id() or public.is_admin())
  ));

-- -----------------------------------------------------------------------------
-- Enqueue on booking changes.
-- -----------------------------------------------------------------------------
create or replace function public.enqueue_booking_notifications()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_kind notification_kind;
  v_seq  integer;
begin
  if tg_op = 'INSERT' then
    v_kind := 'booking_received';
  elsif new.status is distinct from old.status and new.status = 'confirmed' and old.status = 'pending' then
    v_kind := 'booking_confirmed';
  elsif new.status is distinct from old.status and new.status = 'cancelled' and old.status in ('pending', 'confirmed') then
    v_kind := 'booking_cancelled';
  elsif (new.starts_at, new.ends_at) is distinct from (old.starts_at, old.ends_at) and new.status in ('pending', 'confirmed') then
    v_kind := 'booking_changed';
  else
    return new; -- completed / no-show / other edits: no email
  end if;

  select count(*) into v_seq from notifications where booking_id = new.id and recipient = 'customer';

  insert into notifications (booking_id, kind, recipient, previous_status, calendar_sequence)
  values
    (new.id, v_kind, 'customer', case when tg_op = 'UPDATE' then old.status end, v_seq),
    (new.id, v_kind, 'artist',   case when tg_op = 'UPDATE' then old.status end, v_seq);
  return new;
end;
$$;

create trigger bookings_enqueue_notifications
  after insert or update of status, starts_at, ends_at on public.bookings
  for each row execute function public.enqueue_booking_notifications();

-- -----------------------------------------------------------------------------
-- Claim due notifications for sending (Edge Function only, via service role).
-- Retries failed rows with back-off; rows stuck in 'sending' are retried after 10 min.
-- -----------------------------------------------------------------------------
create or replace function public.claim_notifications(p_limit integer default 20)
returns setof public.notifications
language sql volatile security definer set search_path = public
as $$
  update notifications n
     set status = 'sending', attempts = n.attempts + 1, next_attempt_at = now() + interval '10 minutes'
   where n.id in (
     select id from notifications
      where attempts < 5
        and next_attempt_at <= now()
        and status in ('pending', 'failed', 'sending')
      order by created_at
      limit greatest(1, least(p_limit, 50))
      for update skip locked
   )
  returning n.*;
$$;

revoke execute on function public.claim_notifications(integer) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- "Send på nytt" from the dashboard: staff may requeue their own bookings' emails.
-- -----------------------------------------------------------------------------
create or replace function public.requeue_notification(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update notifications n
     set status = 'pending', attempts = 0, next_attempt_at = now(), last_error = null
    from bookings b
   where n.id = p_id
     and b.id = n.booking_id
     and (b.artist_id = public.current_artist_id() or public.is_admin());
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.requeue_notification(uuid) from public, anon;
grant execute on function public.requeue_notification(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- create_booking gains the customer's language. Drop the old signature first
-- so the API never sees two overloads.
-- -----------------------------------------------------------------------------
drop function public.create_booking(uuid, uuid, timestamptz, text, text, text, date, text, text, text, boolean, text, text);

create or replace function public.create_booking(
  p_artist_id               uuid,
  p_service_id              uuid,
  p_starts_at               timestamptz,
  p_customer_name           text,
  p_customer_email          text,
  p_customer_phone          text,
  p_customer_date_of_birth  date,
  p_tattoo_placement        text,
  p_tattoo_description      text,
  p_reference_image_path    text,
  p_policy_accepted         boolean,
  p_policy_version          text,
  p_website                 text default null,
  p_language                text default 'nb'
)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare
  s            studio_settings;
  v_artist     artists;
  v_service    services;
  v_ends_at    timestamptz;
  v_local_date date;
  v_age        integer;
  v_minor      boolean := false;
  v_status     booking_status;
  v_reference  text;
  v_email      text := lower(trim(p_customer_email));
  v_phone      text := trim(p_customer_phone);
  v_language   text := case when p_language = 'en' then 'en' else 'nb' end;
  v_alphabet   constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if coalesce(trim(p_website), '') <> '' then
    raise exception 'spam' using errcode = 'P0001';
  end if;

  select * into s from studio_settings;
  if not coalesce(p_policy_accepted, false) or p_policy_version is distinct from s.policy_version then
    raise exception 'policy' using errcode = 'P0001';
  end if;

  if char_length(trim(coalesce(p_customer_name, ''))) not between 2 and 100
     or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or v_phone !~ '^\+?[0-9 -]+$'
     or char_length(regexp_replace(v_phone, '\D', '', 'g')) not between 8 and 15
     or p_customer_date_of_birth is null
     or p_customer_date_of_birth < date '1900-01-01'
     or p_customer_date_of_birth > (now() at time zone 'Europe/Oslo')::date
     or char_length(trim(coalesce(p_tattoo_placement, ''))) not between 2 and 100
     or char_length(trim(coalesce(p_tattoo_description, ''))) not between 10 and 2000 then
    raise exception 'invalid' using errcode = 'P0001';
  end if;

  select * into v_artist from artists where id = p_artist_id and active;
  select * into v_service from services where id = p_service_id and active;
  if v_artist.id is null or v_service.id is null then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if p_reference_image_path is not null then
    if p_reference_image_path !~ '^uploads/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
       or not exists (select 1 from storage.objects where bucket_id = 'reference-images' and name = p_reference_image_path)
       or exists (select 1 from bookings where reference_image_path = p_reference_image_path) then
      raise exception 'invalid' using errcode = 'P0001';
    end if;
  end if;

  if (select count(*) from bookings where lower(customer_email) = v_email and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from bookings where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_artist_id::text, 0));

  v_ends_at := p_starts_at + make_interval(mins => v_service.duration_minutes);
  if not public.is_slot_available(p_artist_id, p_starts_at, v_ends_at) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  v_local_date := (p_starts_at at time zone 'Europe/Oslo')::date;
  v_age := extract(year from age(v_local_date, p_customer_date_of_birth))::integer;
  if v_age < s.minimum_age then
    if s.minor_policy = 'reject' then
      raise exception 'minor_not_permitted' using errcode = 'P0001';
    end if;
    v_minor := true;
  end if;
  v_status := case when v_minor then 'pending' else 'confirmed' end;

  loop
    v_reference := 'NR5-' || (
      select string_agg(substr(v_alphabet, 1 + (get_byte(b, i) % length(v_alphabet)), 1), '')
      from (select extensions.gen_random_bytes(6) as b) r, generate_series(0, 5) as i
    );
    exit when not exists (select 1 from bookings where booking_reference = v_reference);
  end loop;

  begin
    insert into bookings (
      booking_reference, artist_id, service_id, service_name, price_nok,
      customer_name, customer_email, customer_phone, customer_date_of_birth,
      tattoo_placement, tattoo_description, reference_image_path,
      starts_at, ends_at, status, requires_guardian_consent,
      cancellation_policy_accepted_at, cancellation_policy_version, language
    ) values (
      v_reference, v_artist.id, v_service.id, v_service.name, v_service.price_nok,
      trim(p_customer_name), v_email, v_phone, p_customer_date_of_birth,
      trim(p_tattoo_placement), trim(p_tattoo_description), p_reference_image_path,
      p_starts_at, v_ends_at, v_status, v_minor,
      now(), p_policy_version, v_language
    );
  exception when exclusion_violation then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end;

  return jsonb_build_object(
    'reference', v_reference,
    'status', v_status,
    'requiresGuardianConsent', v_minor,
    'artistName', v_artist.name,
    'serviceName', v_service.name,
    'priceNok', v_service.price_nok,
    'startsAt', p_starts_at,
    'endsAt', v_ends_at
  );
end;
$$;

revoke execute on function public.create_booking(uuid, uuid, timestamptz, text, text, text, date, text, text, text, boolean, text, text, text) from public;
grant execute on function public.create_booking(uuid, uuid, timestamptz, text, text, text, date, text, text, text, boolean, text, text, text) to anon, authenticated;
