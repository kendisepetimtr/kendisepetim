/*
  Süperadmin müşteri yönetimi: e-posta, engel ve iç not.
*/

alter table public.customer_profiles
  add column if not exists email text not null default '',
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text not null default '',
  add column if not exists admin_note text not null default '';

create index if not exists customer_profiles_blocked_idx
  on public.customer_profiles (blocked_at)
  where blocked_at is not null;

create index if not exists customer_profiles_created_at_idx
  on public.customer_profiles (created_at desc);

comment on column public.customer_profiles.blocked_at is 'Doluysa müşteri girişi ve sipariş kapalı.';
comment on column public.customer_profiles.blocked_reason is 'Süperadmin engel gerekçesi (müşteriye gösterilmez).';
comment on column public.customer_profiles.admin_note is 'İç not; yalnızca süperadmin görür.';
