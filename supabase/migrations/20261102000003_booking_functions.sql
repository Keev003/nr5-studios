-- =============================================================================
-- Nr5 Studios – booking logic
-- Mirrors src/lib/availability.ts so the server re-checks exactly what the
-- browser offered. All times are interpreted in Europe/Oslo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Public schedule: everything the calendar needs, nothing personal.
-- Returns { weekly: [...], exceptions: [...], busy: [{startsAt, endsAt}] }.
-- -----------------------------------------------------------------------------
create or replace function public.get_artist_schedule(p_artist_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if not exists (select 1 from artists where id = p_artist_id and active) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if p_to < p_from or p_to - p_from > 400 then
    raise exception 'invalid' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'weekly', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dayOfWeek', day_of_week,
        'startTime', to_char(start_time, 'HH24:MI'),
        'endTime', to_char(end_time, 'HH24:MI')) order by day_of_week, start_time)
      from artist_availability where artist_id = p_artist_id), '[]'::jsonb),
    'exceptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', to_char(date, 'YYYY-MM-DD'),
        'startTime', to_char(start_time, 'HH24:MI'),
        'endTime', to_char(end_time, 'HH24:MI'),
        'isAvailable', is_available) order by date, start_time)
      from availability_exceptions
      where artist_id = p_artist_id and date between p_from and p_to), '[]'::jsonb),
    'busy', coalesce((
      select jsonb_agg(jsonb_build_object('startsAt', starts_at, 'endsAt', ends_at) order by starts_at)
      from bookings
      where artist_id = p_artist_id
        and status in ('pending', 'confirmed')
        and ends_at > (p_from::timestamp at time zone 'Europe/Oslo')
        and starts_at < ((p_to + 1)::timestamp at time zone 'Europe/Oslo')), '[]'::jsonb)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- True if [p_starts_at, p_ends_at) is a slot the calendar would offer.
-- -----------------------------------------------------------------------------
create or replace function public.is_slot_available(p_artist_id uuid, p_starts_at timestamptz, p_ends_at timestamptz)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  s          studio_settings;
  v_buffer   interval;
  v_date     date := (p_starts_at at time zone 'Europe/Oslo')::date;
  v_custom   boolean;
  v_fits     boolean;
begin
  select * into s from studio_settings;
  select make_interval(mins => buffer_minutes) into v_buffer from artists where id = p_artist_id and active;
  if v_buffer is null then
    return false;
  end if;

  -- Minimum notice and booking horizon.
  if p_starts_at < now() + make_interval(hours => s.min_notice_hours)
     or p_starts_at > now() + make_interval(days => s.booking_horizon_days + 1) then
    return false;
  end if;

  -- Day off?
  if exists (select 1 from availability_exceptions
             where artist_id = p_artist_id and date = v_date and not is_available and start_time is null) then
    return false;
  end if;

  -- Must fit fully inside one working window (custom hours replace weekly
  -- hours) and start on the slot grid measured from the window start.
  v_custom := exists (select 1 from availability_exceptions
                      where artist_id = p_artist_id and date = v_date and is_available);
  select exists (
    select 1
    from (
      select (v_date + start_time) at time zone 'Europe/Oslo' as w_start,
             (v_date + end_time) at time zone 'Europe/Oslo' as w_end
      from availability_exceptions
      where v_custom and artist_id = p_artist_id and date = v_date and is_available
      union all
      select (v_date + start_time) at time zone 'Europe/Oslo',
             (v_date + end_time) at time zone 'Europe/Oslo'
      from artist_availability
      where not v_custom and artist_id = p_artist_id and day_of_week = extract(dow from v_date)
    ) w
    where p_starts_at >= w.w_start
      and p_ends_at <= w.w_end
      and (extract(epoch from p_starts_at - w.w_start)::bigint % (s.slot_interval_minutes * 60)) = 0
  ) into v_fits;
  if not v_fits then
    return false;
  end if;

  -- Blocked windows on that date.
  if exists (
    select 1 from availability_exceptions
    where artist_id = p_artist_id and date = v_date and not is_available and start_time is not null
      and tstzrange((v_date + start_time) at time zone 'Europe/Oslo', (v_date + end_time) at time zone 'Europe/Oslo', '[)')
          && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then
    return false;
  end if;

  -- Other active bookings, padded by the artist's buffer on both sides.
  return not exists (
    select 1 from bookings
    where artist_id = p_artist_id
      and status in ('pending', 'confirmed')
      and tstzrange(starts_at - v_buffer, ends_at + v_buffer, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Creates a booking. The only way customers can write to the database.
-- Prices, durations and statuses are decided here, never by the client.
-- Raises P0001 with one of: spam, policy, invalid, not_found, rate_limited,
-- minor_not_permitted, slot_unavailable.
-- -----------------------------------------------------------------------------
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
  p_website                 text default null
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
  v_alphabet   constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  -- Honeypot field: real people never fill it in.
  if coalesce(trim(p_website), '') <> '' then
    raise exception 'spam' using errcode = 'P0001';
  end if;

  select * into s from studio_settings;
  if not coalesce(p_policy_accepted, false) or p_policy_version is distinct from s.policy_version then
    raise exception 'policy' using errcode = 'P0001';
  end if;

  -- Field validation (the browser validates too, but is never trusted).
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

  -- Uploaded reference image must be a fresh, unused upload in the private bucket.
  if p_reference_image_path is not null then
    if p_reference_image_path !~ '^uploads/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
       or not exists (select 1 from storage.objects where bucket_id = 'reference-images' and name = p_reference_image_path)
       or exists (select 1 from bookings where reference_image_path = p_reference_image_path) then
      raise exception 'invalid' using errcode = 'P0001';
    end if;
  end if;

  -- Rate limiting: per email and studio-wide.
  if (select count(*) from bookings where lower(customer_email) = v_email and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from bookings where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- Serialise bookings per artist so the buffer check below can't race.
  -- The exclusion constraint is the final guarantee against overlaps.
  perform pg_advisory_xact_lock(hashtextextended(p_artist_id::text, 0));

  v_ends_at := p_starts_at + make_interval(mins => v_service.duration_minutes);
  if not public.is_slot_available(p_artist_id, p_starts_at, v_ends_at) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  -- Age on the appointment date (not today).
  v_local_date := (p_starts_at at time zone 'Europe/Oslo')::date;
  v_age := extract(year from age(v_local_date, p_customer_date_of_birth))::integer;
  if v_age < s.minimum_age then
    if s.minor_policy = 'reject' then
      raise exception 'minor_not_permitted' using errcode = 'P0001';
    end if;
    v_minor := true;
  end if;
  -- Under-age requests always wait for manual approval.
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
      cancellation_policy_accepted_at, cancellation_policy_version
    ) values (
      v_reference, v_artist.id, v_service.id, v_service.name, v_service.price_nok,
      trim(p_customer_name), v_email, v_phone, p_customer_date_of_birth,
      trim(p_tattoo_placement), trim(p_tattoo_description), p_reference_image_path,
      p_starts_at, v_ends_at, v_status, v_minor,
      now(), p_policy_version
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

-- Only the two public entry points are callable by visitors.
revoke execute on function public.is_slot_available(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.get_artist_schedule(uuid, date, date) from public;
revoke execute on function public.create_booking(uuid, uuid, timestamptz, text, text, text, date, text, text, text, boolean, text, text) from public;
grant execute on function public.get_artist_schedule(uuid, date, date) to anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, timestamptz, text, text, text, date, text, text, text, boolean, text, text) to anon, authenticated;
