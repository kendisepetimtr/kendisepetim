alter table public.tenants
  add column if not exists owner_admin_pin_hash text,
  add column if not exists owner_admin_pin_set_at timestamptz;

comment on column public.tenants.owner_admin_pin_hash is 'Patron admin PIN hash verisi; duz PIN tutulmaz.';
comment on column public.tenants.owner_admin_pin_set_at is 'Patron admin PIN son degisim zamani.';

alter table public.tenants drop constraint if exists tenants_owner_admin_pin_hash_len;

alter table public.tenants
  add constraint tenants_owner_admin_pin_hash_len check (
    owner_admin_pin_hash is null or char_length(owner_admin_pin_hash) <= 255
  );

create or replace function public.tenants_strip_privileged_on_owner_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is not null then
    new.subdomain := old.subdomain;
    new.plan := old.plan;
    new.public_menu_enabled := old.public_menu_enabled;
    new.dashboard_enabled := old.dashboard_enabled;
    new.owner_user_id := old.owner_user_id;
    new.owner_admin_pin_hash := old.owner_admin_pin_hash;
    new.owner_admin_pin_set_at := old.owner_admin_pin_set_at;
  end if;
  return new;
end;
$$;
