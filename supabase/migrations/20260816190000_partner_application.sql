/*
  Partner başvuru: durum, iletişim alanları, cihaz taahhüdü.
  Mevcut işletmeler approved kalır (canlıyı bozmamak için).
*/

alter table public.tenants
  add column if not exists application_status text not null default 'approved',
  add column if not exists owner_last_name text not null default '',
  add column if not exists business_phone text not null default '',
  add column if not exists business_type text not null default 'restaurant',
  add column if not exists branch_count integer not null default 1,
  add column if not exists has_device_internet boolean,
  add column if not exists lighting_accepted_at timestamptz,
  add column if not exists application_note text not null default '',
  add column if not exists rejected_reason text not null default '';

alter table public.tenants drop constraint if exists tenants_application_status_check;
alter table public.tenants
  add constraint tenants_application_status_check
  check (application_status in ('pending', 'approved', 'rejected'));

alter table public.tenants drop constraint if exists tenants_business_type_check;
alter table public.tenants
  add constraint tenants_business_type_check
  check (business_type = 'restaurant');

alter table public.tenants drop constraint if exists tenants_branch_count_check;
alter table public.tenants
  add constraint tenants_branch_count_check
  check (branch_count = 1);

create index if not exists tenants_application_status_idx
  on public.tenants (application_status, created_at desc);

comment on column public.tenants.application_status is
  'pending: partner başvurusu bekliyor; approved: QR/panel açılabilir; rejected: red.';
comment on column public.tenants.owner_last_name is 'İşletme sahibi soyadı; owner_name ad+soyad birleşik.';
comment on column public.tenants.business_phone is 'İş telefonu E.164 (+90…).';
comment on column public.tenants.has_device_internet is
  'Sipariş yönetimi için cihaz/internet taahhüdü. false ise başvuru alınır, onay önerilmez.';

create table if not exists public.tenant_password_reset_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  owner_user_id uuid,
  actor_label text not null default 'superadmin',
  note text not null default 'one_time_password'
);

create index if not exists tenant_password_reset_events_tenant_idx
  on public.tenant_password_reset_events (tenant_id, created_at desc);

alter table public.tenant_password_reset_events enable row level security;

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
    new.marketplace_enabled := old.marketplace_enabled;
    new.application_status := old.application_status;
    new.rejected_reason := old.rejected_reason;
    new.application_note := old.application_note;
    new.owner_user_id := old.owner_user_id;
    new.owner_admin_pin_hash := old.owner_admin_pin_hash;
    new.owner_admin_pin_set_at := old.owner_admin_pin_set_at;
  end if;
  return new;
end;
$$;
