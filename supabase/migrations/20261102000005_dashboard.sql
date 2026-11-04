-- =============================================================================
-- Nr5 Studios – dashboard support
-- Everything artists need to run their own schedule from the dashboard,
-- without touching Supabase.
-- =============================================================================

-- Optional note shown to the customer when an appointment is cancelled.
alter table public.bookings add column cancellation_reason text check (char_length(cancellation_reason) <= 500);
grant update (cancellation_reason) on public.bookings to authenticated;

-- Admins may (de)activate and reorder artists; artists may not do it themselves.
grant update (active, sort_order) on public.artists to authenticated;

create or replace function public.artists_guard_update()
returns trigger
language plpgsql set search_path = public
as $$
begin
  -- Applies to signed-in dashboard users; the service role (Edge Functions) and SQL Editor are trusted.
  if (new.active is distinct from old.active or new.sort_order is distinct from old.sort_order)
     and current_user = 'authenticated' and not public.is_admin() then
    raise exception 'only_admin' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger artists_guard_update
  before update on public.artists
  for each row execute function public.artists_guard_update();

-- -----------------------------------------------------------------------------
-- Replace an artist's weekly hours in one go (atomic, validated).
-- p_hours: [{"dayOfWeek": 1, "startTime": "10:00", "endTime": "17:00"}, …]
-- -----------------------------------------------------------------------------
create or replace function public.set_weekly_hours(p_artist_id uuid, p_hours jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_invalid     boolean;
  v_overlapping boolean;
begin
  if p_artist_id is distinct from public.current_artist_id() and not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with h as (
    select (x ->> 'dayOfWeek')::smallint as d, (x ->> 'startTime')::time as s, (x ->> 'endTime')::time as e, n
    from jsonb_array_elements(coalesce(p_hours, '[]'::jsonb)) with ordinality as t(x, n)
  )
  select exists (select 1 from h where e <= s or d not between 0 and 6),
         -- Windows on the same day must not overlap.
         exists (select 1 from h a join h b on a.d = b.d and a.n < b.n and a.s < b.e and b.s < a.e)
  into v_invalid, v_overlapping;

  if v_invalid then
    raise exception 'invalid_hours' using errcode = 'P0001';
  end if;
  if v_overlapping then
    raise exception 'overlapping_hours' using errcode = 'P0001';
  end if;

  delete from artist_availability where artist_id = p_artist_id;
  insert into artist_availability (artist_id, day_of_week, start_time, end_time)
  select p_artist_id, (x ->> 'dayOfWeek')::smallint, (x ->> 'startTime')::time, (x ->> 'endTime')::time
  from jsonb_array_elements(coalesce(p_hours, '[]'::jsonb)) as x;
end;
$$;

revoke execute on function public.set_weekly_hours(uuid, jsonb) from public, anon;
grant execute on function public.set_weekly_hours(uuid, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Public artist photos, managed from the dashboard.
-- Path: <artist_id>/<file>. Artists manage their own folder; admins all.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('artist-photos', 'artist-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Staff upload artist photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'artist-photos'
    and ((storage.foldername(name))[1] = public.current_artist_id()::text or public.is_admin())
  );

create policy "Staff replace artist photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'artist-photos'
    and ((storage.foldername(name))[1] = public.current_artist_id()::text or public.is_admin())
  );

create policy "Staff delete artist photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'artist-photos'
    and ((storage.foldername(name))[1] = public.current_artist_id()::text or public.is_admin())
  );
