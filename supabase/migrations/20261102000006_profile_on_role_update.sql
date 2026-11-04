-- =============================================================================
-- Nr5 Studios – create staff profiles when the role arrives after sign-up
-- Supabase's admin API inserts the auth user first and sets app_metadata in a
-- follow-up update, so the insert-only trigger never saw `studio_role`.
-- ======================x=======================================================

create trigger on_auth_user_role_updated
  after update of raw_app_meta_data on auth.users
  for each row
  when (new.raw_app_meta_data ->> 'studio_role' is distinct from old.raw_app_meta_data ->> 'studio_role')
  execute function public.handle_new_user();

-- Backfill: users created before this fix who have a role but no profile.
insert into public.profiles (id, email, full_name, role)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', ''), (u.raw_app_meta_data ->> 'studio_role')::public.app_role
from auth.users u
where u.raw_app_meta_data ->> 'studio_role' in ('artist', 'admin')
  and not exists (select 1 from public.profiles p where p.id = u.id);
