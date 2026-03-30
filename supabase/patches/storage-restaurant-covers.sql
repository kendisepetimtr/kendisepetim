-- Kapak görselleri: {restaurant_id}/cover.{ext}  (bucket: restaurant-covers)
insert into storage.buckets (id, name, public)
values ('restaurant-covers', 'restaurant-covers', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "restaurant_covers_public_read" on storage.objects;
drop policy if exists "restaurant_covers_member_insert" on storage.objects;
drop policy if exists "restaurant_covers_member_update" on storage.objects;
drop policy if exists "restaurant_covers_member_delete" on storage.objects;

create policy "restaurant_covers_public_read"
on storage.objects for select
using (bucket_id = 'restaurant-covers');

create policy "restaurant_covers_member_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'restaurant-covers'
  and split_part(name, '/', 1) in (
    select rm.restaurant_id::text
    from public.restaurant_members rm
    where rm.user_id = auth.uid() and rm.is_active = true
  )
);

create policy "restaurant_covers_member_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'restaurant-covers'
  and split_part(name, '/', 1) in (
    select rm.restaurant_id::text
    from public.restaurant_members rm
    where rm.user_id = auth.uid() and rm.is_active = true
  )
)
with check (
  bucket_id = 'restaurant-covers'
  and split_part(name, '/', 1) in (
    select rm.restaurant_id::text
    from public.restaurant_members rm
    where rm.user_id = auth.uid() and rm.is_active = true
  )
);

create policy "restaurant_covers_member_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'restaurant-covers'
  and split_part(name, '/', 1) in (
    select rm.restaurant_id::text
    from public.restaurant_members rm
    where rm.user_id = auth.uid() and rm.is_active = true
  )
);
