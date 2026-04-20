/*
  KendiSepetim — merkezi işletme (tenant) tablosu.
  RLS: anon için kapalı; sahip auth.uid() eşleşince okuma/güncelleme.
  İlk kayıt / süperadmin: service_role sunucu istemcisi.
*/

-- Plan seviyesi (süperadmin düzenler)
create type public.tenant_plan as enum ('free', 'premium');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  business_name text not null,
  subdomain text not null,
  owner_name text not null,
  email text not null,
  phone text not null default '',

  owner_user_id uuid references auth.users (id) on delete set null,

  logo_url text,

  hours_day_mode text not null default 'calendar',
  open_time text not null default '09:00',
  close_time text not null default '22:00',

  payment_cash boolean not null default true,
  payment_door_card boolean not null default false,
  payment_meal_card boolean not null default false,

  plan public.tenant_plan not null default 'free',
  public_menu_enabled boolean not null default true,
  dashboard_enabled boolean not null default true,

  constraint tenants_subdomain_unique unique (subdomain),
  constraint tenants_subdomain_format check (
    char_length(subdomain) >= 2
    and subdomain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
  ),
  constraint tenants_hours_day_mode_check check (hours_day_mode in ('calendar', 'shift'))
);

create index tenants_owner_user_id_idx on public.tenants (owner_user_id);
create index tenants_email_idx on public.tenants (lower(email));

comment on table public.tenants is 'Kayıtlı işletmeler; süperadmin ve service_role yönetir.';
comment on column public.tenants.owner_user_id is 'auth.users ile eşleşir; kurulumda null olabilir.';
comment on column public.tenants.logo_url is 'İleride Storage; şimdilik opsiyonel.';
comment on column public.tenants.public_menu_enabled is 'QR / herkese açık menü';
comment on column public.tenants.dashboard_enabled is 'İşletme sahibi paneli';

-- updated_at
create or replace function public.tenants_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_set_updated_at
before update on public.tenants
for each row
execute function public.tenants_set_updated_at();

alter table public.tenants enable row level security;

-- Oturum açmış sahip kendi satırını okur (owner_user_id dolu olduğunda)
create policy "tenants_select_own"
on public.tenants
for select
to authenticated
using (owner_user_id is not null and owner_user_id = (select auth.uid()));

create policy "tenants_update_own"
on public.tenants
for update
to authenticated
using (owner_user_id is not null and owner_user_id = (select auth.uid()))
with check (owner_user_id is not null and owner_user_id = (select auth.uid()));

-- İlk kurulumda kayıt: service_role veya ileride "signup sonrası insert" politikası
create policy "tenants_insert_as_owner"
on public.tenants
for insert
to authenticated
with check (owner_user_id = (select auth.uid()));
