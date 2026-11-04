-- =============================================================================
-- Nr5 Studios – access control
-- Every table has RLS on. Anonymous visitors can read the public catalogue
-- only; bookings are created through a SECURITY DEFINER function and are
-- readable only by the assigned artist and admins.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so policies can use them without recursion).
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.current_artist_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.artists where profile_id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- Staff profiles are created only for users whose app_metadata carries a
-- studio_role. app_metadata can only be set with the service role (dashboard
-- or seed), so a stranger signing up never gets dashboard access.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role text := new.raw_app_meta_data ->> 'studio_role';
begin
  if v_role in ('artist', 'admin') then
    insert into public.profiles (id, email, full_name, role)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''), v_role::public.app_role)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.services enable row level security;
alter table public.studio_settings enable row level security;
alter table public.artist_availability enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings enable row level security;

-- profiles
create policy "Staff read own profile; admins read all" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Admins manage profiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- artists
create policy "Anyone reads active artists" on public.artists
  for select to anon, authenticated using (active or public.is_staff());
create policy "Artists edit own profile; admins edit all" on public.artists
  for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());
create policy "Admins add artists" on public.artists
  for insert to authenticated with check (public.is_admin());
create policy "Admins remove artists" on public.artists
  for delete to authenticated using (public.is_admin());

-- services: public catalogue; artists and admins may edit prices/durations
create policy "Anyone reads active services" on public.services
  for select to anon, authenticated using (active or public.is_staff());
create policy "Staff manage services" on public.services
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- studio settings: readable by everyone (no secrets), editable by admins
create policy "Anyone reads settings" on public.studio_settings
  for select to anon, authenticated using (true);
create policy "Admins edit settings" on public.studio_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- availability: managed by the artist themself or an admin. Public visitors
-- get availability through public.get_artist_schedule(), which hides reasons.
create policy "Artists manage own weekly hours" on public.artist_availability
  for all to authenticated
  using (artist_id = public.current_artist_id() or public.is_admin())
  with check (artist_id = public.current_artist_id() or public.is_admin());
create policy "Artists manage own exceptions" on public.availability_exceptions
  for all to authenticated
  using (artist_id = public.current_artist_id() or public.is_admin())
  with check (artist_id = public.current_artist_id() or public.is_admin());

-- bookings: no anon access at all; staff see only their own (admins all)
create policy "Artists read own bookings" on public.bookings
  for select to authenticated using (artist_id = public.current_artist_id() or public.is_admin());
create policy "Artists update own bookings" on public.bookings
  for update to authenticated
  using (artist_id = public.current_artist_id() or public.is_admin())
  with check (artist_id = public.current_artist_id() or public.is_admin());

-- -----------------------------------------------------------------------------
-- Column-level privileges: limit what can change even within allowed rows.
-- -----------------------------------------------------------------------------
revoke all on public.bookings from anon;
revoke insert, update, delete, truncate on public.bookings from authenticated;
grant update (status, guardian_consent_verified_at) on public.bookings to authenticated;

revoke insert, update, delete, truncate on public.artists from anon;
revoke update on public.artists from authenticated;
grant update (name, bio, bio_en, image_url, specialties, buffer_minutes) on public.artists to authenticated;

revoke insert, update, delete, truncate on public.profiles, public.services, public.studio_settings,
  public.artist_availability, public.availability_exceptions from anon;
revoke select on public.profiles, public.artist_availability, public.availability_exceptions from anon;

-- -----------------------------------------------------------------------------
-- Booking status rules, enforced for every client.
-- -----------------------------------------------------------------------------
create or replace function public.bookings_guard_update()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'pending'   and new.status in ('confirmed', 'cancelled')) or
      (old.status = 'confirmed' and new.status in ('cancelled', 'completed', 'no_show'))
    ) then
      raise exception 'Ugyldig statusendring: % → %', old.status, new.status using errcode = 'P0001';
    end if;
    new.status_changed_at := now();
  end if;

  -- Under-age bookings can never be confirmed before consent is verified.
  if new.status = 'confirmed' and new.requires_guardian_consent and new.guardian_consent_verified_at is null then
    raise exception 'guardian_consent_not_verified' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger bookings_guard_update
  before update on public.bookings
  for each row execute function public.bookings_guard_update();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger services_touch before update on public.services
  for each row execute function public.touch_updated_at();
create trigger studio_settings_touch before update on public.studio_settings
  for each row execute function public.touch_updated_at();
