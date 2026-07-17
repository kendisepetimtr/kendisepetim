/*
  KendiSepetim platform muhasebesi — gelir / gider kayıtları (süperadmin).
*/

create table if not exists public.platform_accounting_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entry_type text not null,
  title text not null,
  amount numeric(12, 2) not null,
  category text not null default '',
  notes text not null default '',
  entry_date date not null default (current_date),
  is_monthly_recurring boolean not null default false,
  recurring_day smallint,
  constraint platform_accounting_entry_type_check
    check (entry_type in ('income', 'expense')),
  constraint platform_accounting_title_not_blank
    check (btrim(title) <> ''),
  constraint platform_accounting_amount_non_negative
    check (amount >= 0),
  constraint platform_accounting_recurring_day_check
    check (
      recurring_day is null
      or (recurring_day >= 1 and recurring_day <= 28)
    )
);

create index if not exists platform_accounting_entries_date_idx
  on public.platform_accounting_entries (entry_date desc);

create index if not exists platform_accounting_entries_type_idx
  on public.platform_accounting_entries (entry_type, is_monthly_recurring);

comment on table public.platform_accounting_entries is
  'KendiSepetim platform gelir/gider — süperadmin muhasebe modülü';
