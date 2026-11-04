-- =============================================================================
-- Nr5 Studios – private storage for customer reference images
-- Visitors may upload (but never read or list) files under uploads/.
-- Only the assigned artist and admins can view an image, and only once it is
-- attached to a booking.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reference-images', 'reference-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Visitors upload booking reference images" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'reference-images'
    and name ~ '^uploads/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
  );

create policy "Staff view reference images for their bookings" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reference-images'
    and (
      public.is_admin()
      or exists (
        select 1 from public.bookings b
        where b.reference_image_path = storage.objects.name
          and b.artist_id = public.current_artist_id()
      )
    )
  );

create policy "Admins delete reference images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'reference-images' and public.is_admin());
