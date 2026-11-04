-- =============================================================================
-- Nr5 Studios – seed data (development / demo only)
-- No real customer data. Safe to run more than once.
--
-- TEST USERS (only for this demo project – change or delete before launch):
--   shmoky@nr5studios.test   Nr5-9QxK7YJ4fdrA   (artist)
--   aj@nr5studios.test       Nr5-7Xial5qIoBID   (artist)
--   admin@nr5studios.test    Nr5-VN3qsb4Ljx1M   (admin)
-- =============================================================================

update public.profiles set role = 'admin' where email = 'shmoky@nr5studios.test';

-- Studio settings (placeholder business rules – editable later)
insert into public.studio_settings (id, policy_version, cancellation_deadline_hours, late_cancellation_hours, late_cancellation_percent)
values (true, '2026-11-04', 48, 24, 50)
on conflict (id) do nothing;

-- Services. Names/descriptions in English by design; prices are placeholders.
insert into public.services (id, slug, name, description, price_nok, duration_minutes, duration_label, sort_order) values
  ('b0000000-0000-4000-8000-000000000001', 'consultation', 'Consultation',
   'Free consultation to discuss your tattoo idea, placement, size and design.', 0, 30, null, 1),
  ('b0000000-0000-4000-8000-000000000002', 'small-piece', 'Small Piece',
   'Up to roughly 10cm. Lettering, small symbols etc.', 1500, 120, '1–2 timer', 2),
  ('b0000000-0000-4000-8000-000000000003', 'half-day', 'Half Day',
   'Four hours. Medium piece.', 4000, 240, null, 3),
  ('b0000000-0000-4000-8000-000000000004', 'full-day', 'Full Day',
   'Six hours. Large scale and multi-session project.', 6000, 360, null, 4)
on conflict (id) do nothing;

-- Staff accounts (the on_auth_user_created trigger creates their profiles)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token, phone_change, phone_change_token
) values (
  '00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'shmoky@nr5studios.test', extensions.crypt('Nr5-9QxK7YJ4fdrA', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"],"studio_role":"artist"}', '{"full_name":"Shmoky"}', now(), now(),
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
  '{"sub":"a0000000-0000-4000-8000-000000000001","email":"shmoky@nr5studios.test","email_verified":true}', 'email', now(), now(), now()
) on conflict do nothing;
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token, phone_change, phone_change_token
) values (
  '00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
  'aj@nr5studios.test', extensions.crypt('Nr5-7Xial5qIoBID', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"],"studio_role":"artist"}', '{"full_name":"AJ"}', now(), now(),
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002',
  '{"sub":"a0000000-0000-4000-8000-000000000002","email":"aj@nr5studios.test","email_verified":true}', 'email', now(), now(), now()
) on conflict do nothing;
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token, phone_change, phone_change_token
) values (
  '00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
  'admin@nr5studios.test', extensions.crypt('Nr5-VN3qsb4Ljx1M', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"],"studio_role":"admin"}', '{"full_name":"Studio Admin"}', now(), now(),
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003',
  '{"sub":"a0000000-0000-4000-8000-000000000003","email":"admin@nr5studios.test","email_verified":true}', 'email', now(), now(), now()
) on conflict do nothing;

-- Artists, linked to their accounts
insert into public.artists (id, profile_id, slug, name, bio, bio_en, image_url, specialties, buffer_minutes, sort_order) values
  ('6f1c2c1e-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'shmoky', 'Shmoky',
   'Tunge, rene linjer og store prosjekter over flere økter.',
   'Bold, clean lines and large projects over several sessions.',
   'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=800&q=75',
   array['Blackwork', 'Neo-traditional'], 30, 1),
  ('6f1c2c1e-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'aj', 'AJ',
   'Detaljerte fine line-motiver med mye bevegelse.',
   'Detailed fine-line designs full of movement.',
   'https://images.unsplash.com/photo-1475403614135-5f1aa0eb5015?auto=format&fit=crop&w=800&q=75',
   array['Fine line', 'Botanical'], 15, 2)
on conflict (id) do nothing;

-- Weekly hours (examples from the brief – editable in the dashboard)
insert into public.artist_availability (artist_id, day_of_week, start_time, end_time)
select v.* from (values
  ('6f1c2c1e-0000-4000-8000-000000000001'::uuid, 1::smallint, '10:00'::time, '17:00'::time),
  ('6f1c2c1e-0000-4000-8000-000000000001', 2, '12:00', '19:00'),
  ('6f1c2c1e-0000-4000-8000-000000000001', 4, '10:00', '17:00'),
  ('6f1c2c1e-0000-4000-8000-000000000001', 5, '10:00', '16:00'),
  ('6f1c2c1e-0000-4000-8000-000000000002', 2, '10:00', '18:00'),
  ('6f1c2c1e-0000-4000-8000-000000000002', 3, '10:00', '18:00'),
  ('6f1c2c1e-0000-4000-8000-000000000002', 4, '12:00', '20:00'),
  ('6f1c2c1e-0000-4000-8000-000000000002', 6, '11:00', '16:00')
) as v(artist_id, day_of_week, start_time, end_time)
where not exists (select 1 from public.artist_availability);

-- Example vacation for AJ in the Christmas week
insert into public.availability_exceptions (artist_id, date, is_available, reason)
select '6f1c2c1e-0000-4000-8000-000000000002', d::date, false, 'Juleferie'
from generate_series(date '2026-12-21', date '2026-12-27', interval '1 day') as d
where not exists (select 1 from public.availability_exceptions);
