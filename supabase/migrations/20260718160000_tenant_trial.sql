/*
  Ücretsiz deneme: kayıtta +90 gün; superadmin trial_ends_at ile oynar.
  Owner JWT ile plan / trial alanları değiştirilemez.
*/

alter table public.tenants
  add column if not exists trial_ends_at timestamptz;

comment on column public.tenants.trial_ends_at is
  'Ücretsiz deneme bitiş zamanı. null = deneme yok. plan=premium veya now()<trial_ends_at ise tam erişim.';

-- Mevcut işletmeler: kayıt tarihinden +90 gün (hala denemede olanlar için)
update public.tenants
set trial_ends_at = created_at + interval '90 days'
where trial_ends_at is null;

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
    new.trial_ends_at := old.trial_ends_at;
    new.public_menu_enabled := old.public_menu_enabled;
    new.dashboard_enabled := old.dashboard_enabled;
    new.owner_user_id := old.owner_user_id;
    new.owner_admin_pin_hash := old.owner_admin_pin_hash;
    new.owner_admin_pin_set_at := old.owner_admin_pin_set_at;
  end if;
  return new;
end;
$$;
