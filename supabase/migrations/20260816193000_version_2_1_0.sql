/*
  Hedef sürüm 2.1.0 — 3.0.0 henüz değil.
  v3 yapılacakları 2.1.0 altına taşır.
*/

insert into public.platform_versions (major, minor, patch, is_current, is_target, released_at)
select 2, 1, 0, false, false, null
where not exists (
  select 1 from public.platform_versions where major = 2 and minor = 1 and patch = 0
);

update public.platform_versions
set is_target = false, updated_at = now()
where is_target = true
  and not (major = 2 and minor = 1 and patch = 0);

update public.platform_versions
set is_target = true, updated_at = now()
where major = 2 and minor = 1 and patch = 0;

update public.platform_todos t
set version_id = v210.id, updated_at = now()
from public.platform_versions v3, public.platform_versions v210
where v3.major = 3 and v3.minor = 0 and v3.patch = 0
  and v210.major = 2 and v210.minor = 1 and v210.patch = 0
  and t.version_id = v3.id;

insert into public.platform_todos (title, description, version_id, status)
select
  '[Pazaryeri] www müşteri keşif ana sayfa',
  'Slogan, konum eşleştirme, partner bandı tek sefer, sepet drawer, dolu kalp, nav.',
  v.id,
  'in_progress'
from public.platform_versions v
where v.major = 2 and v.minor = 1 and v.patch = 0
  and not exists (
    select 1 from public.platform_todos t
    where t.version_id = v.id and t.title = '[Pazaryeri] www müşteri keşif ana sayfa'
  );
