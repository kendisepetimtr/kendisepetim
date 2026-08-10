/*
  platform_versions: major.minor → major.minor.patch
  (İlk migration zaten patch ile kurulduysa bu dosya no-op güvenli çalışır.)
*/

alter table public.platform_versions
  add column if not exists patch integer;

update public.platform_versions
set patch = 0
where patch is null;

alter table public.platform_versions
  alter column patch set default 0;

alter table public.platform_versions
  alter column patch set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_versions_patch_non_negative'
      and conrelid = 'public.platform_versions'::regclass
  ) then
    alter table public.platform_versions
      add constraint platform_versions_patch_non_negative check (patch >= 0);
  end if;
end $$;

alter table public.platform_versions
  drop constraint if exists platform_versions_unique_label;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'platform_versions_unique_label'
      and conrelid = 'public.platform_versions'::regclass
  ) then
    alter table public.platform_versions
      add constraint platform_versions_unique_label unique (major, minor, patch);
  end if;
end $$;

drop index if exists public.platform_versions_order_idx;

create index if not exists platform_versions_order_idx
  on public.platform_versions (major desc, minor desc, patch desc);

comment on table public.platform_versions is
  'Platform sürümleri (major.minor.patch) — süperadmin yapılacaklar';
