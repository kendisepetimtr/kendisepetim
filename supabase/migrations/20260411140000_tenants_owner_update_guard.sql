/*
  İşletme sahibi (JWT ile auth.uid() dolu) güncellemesinde subdomain, plan,
  erişim bayrakları ve owner_user_id değiştirilemez — süperadmin service_role ile değişir.
  Service role isteklerinde auth.uid() genelde null olduğundan tetikleyici bu alanlara dokunmaz.
*/

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
  end if;
  return new;
end;
$$;

drop trigger if exists tenants_strip_privileged_on_owner_update on public.tenants;

create trigger tenants_strip_privileged_on_owner_update
before update on public.tenants
for each row
execute function public.tenants_strip_privileged_on_owner_update();

alter table public.tenants drop constraint if exists tenants_logo_url_len;

alter table public.tenants
  add constraint tenants_logo_url_len check (
    logo_url is null or char_length(logo_url) <= 1300000
  );
