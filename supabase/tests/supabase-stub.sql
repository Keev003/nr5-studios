-- Minimal stand-in for what a Supabase project provides out of the box,
-- so migrations can be tested in PGlite. Not deployed anywhere.
create role anon nologin;
create role authenticated nologin;
create schema extensions;
create schema auth;
create schema storage;
grant usage on schema public, extensions, auth, storage to anon, authenticated;

-- Supabase grants table access broadly and relies on RLS; mirror that.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;

create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table auth.users (
  instance_id uuid, id uuid primary key, aud text, role text, email text, encrypted_password text,
  email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz, updated_at timestamptz, confirmation_token text, recovery_token text,
  email_change text, email_change_token_new text, email_change_token_current text,
  reauthentication_token text, phone_change text, phone_change_token text
);
create table auth.identities (
  id uuid primary key, user_id uuid references auth.users, provider_id text, identity_data jsonb, provider text,
  last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz, unique (provider_id, provider)
);

create table storage.buckets (
  id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets, name text, owner uuid,
  created_at timestamptz default now(), unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant all on storage.objects to anon, authenticated;

create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant execute on function storage.foldername(text) to anon, authenticated;
