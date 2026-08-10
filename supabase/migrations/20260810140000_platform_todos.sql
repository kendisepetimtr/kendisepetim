/*
  KendiSepetim platform yapılacaklar + sürüm takibi (süperadmin).
  Sürümler major.minor.patch (1.0.0, 1.0.1, 1.1.0, 2.0.0); tek mevcut ve tek hedef sürüm.
*/

create table if not exists public.platform_versions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  major integer not null,
  minor integer not null,
  patch integer not null default 0,
  is_current boolean not null default false,
  is_target boolean not null default false,
  released_at timestamptz,
  constraint platform_versions_major_non_negative check (major >= 0),
  constraint platform_versions_minor_non_negative check (minor >= 0),
  constraint platform_versions_patch_non_negative check (patch >= 0),
  constraint platform_versions_unique_label unique (major, minor, patch)
);

create unique index if not exists platform_versions_one_current_idx
  on public.platform_versions (is_current)
  where is_current = true;

create unique index if not exists platform_versions_one_target_idx
  on public.platform_versions (is_target)
  where is_target = true;

create index if not exists platform_versions_order_idx
  on public.platform_versions (major desc, minor desc, patch desc);

comment on table public.platform_versions is
  'Platform sürümleri (major.minor.patch) — süperadmin yapılacaklar';

create table if not exists public.platform_todos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  title text not null,
  description text not null default '',
  version_id uuid not null references public.platform_versions (id) on delete restrict,
  status text not null default 'open',
  constraint platform_todos_title_not_blank check (btrim(title) <> ''),
  constraint platform_todos_status_check
    check (status in ('open', 'in_progress', 'done', 'cancelled'))
);

create index if not exists platform_todos_version_idx
  on public.platform_todos (version_id, status);

create index if not exists platform_todos_created_idx
  on public.platform_todos (created_at desc);

comment on table public.platform_todos is
  'Platform yapılacaklar — süperadmin; sürüm notları için';

-- Başlangıç: mevcut 1.0.0, hedef 1.1.0
insert into public.platform_versions (major, minor, patch, is_current, is_target, released_at)
select 1, 0, 0, true, false, now()
where not exists (
  select 1 from public.platform_versions where major = 1 and minor = 0 and patch = 0
);

insert into public.platform_versions (major, minor, patch, is_current, is_target, released_at)
select 1, 1, 0, false, true, null
where not exists (
  select 1 from public.platform_versions where major = 1 and minor = 1 and patch = 0
);
