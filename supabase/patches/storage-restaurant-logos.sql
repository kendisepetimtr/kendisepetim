-- =============================================================================
-- Restoran logolari: bucket + storage.objects politikalari
-- Path: {restaurant_id}/logo.{ext}  (bucket: restaurant-logos)
-- NOT: storage.objects uzerinde ALTER ... ENABLE RLS kullanmayin (hosted Supabase).
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('restaurant-logos', 'restaurant-logos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "restaurant_logos_public_read" on storage.objects;
drop policy if exists "restaurant_logos_member_insert" on storage.objects;
drop policy if exists "restaurant_logos_member_update" on storage.objects;
drop policy if exists "restaurant_logos_member_delete" on storage.objects;

create policy "restaurant_logos_public_read"
on storage.objects for select
using (bucket_id = 'restaurant-logos');

create policy "restaurant_logos_member_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'restaurant-logos'
  and split_part(name, '/', 1) in (
    select rm.restaurant_id::text
    from public.restaurant_members rm
    where rm.user_id = auth.uid() and rm.is_active = true
  )
);

create policy "restaurant_logos_member_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'restaurant-logos'
  and split_part(name, '/', 1) in (
    select rm.restaurant_id::text
    from public.restaurant_members rm
    where rm.user_id = auth.uid() and rm.is_active = true
  )
)
with check (
  bucket_id = 'restaurant-logos'
  and split_part(name, '/', 1) in (
    select rm.restaurant_id::text
    from public.restaurant_members rm
    where rm.user_id = auth.uid() and rm.is_active = true
  )
);

create policy "restaurant_logos_member_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'restaurant-logos'
  and split_part(name, '/', 1) in (
    select rm.restaurant_id::text
    from public.restaurant_members rm
    where rm.user_id = auth.uid() and rm.is_active = true
  )
);
