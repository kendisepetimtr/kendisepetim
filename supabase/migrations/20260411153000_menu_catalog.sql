/*
  Menü kataloğu — kategori ve ürün tabloları.
  Mevcut local menu modeli ile uyumlu: kategori gizleme/sıra, ürün fiyat/paket fiyatı,
  gizleme, imza ürün, upsell ve isteğe bağlı görsel.
*/

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text not null default '',
  hidden boolean not null default false,
  sort_order integer not null default 0,

  constraint menu_categories_name_not_blank check (char_length(btrim(name)) > 0)
);

create index if not exists menu_categories_tenant_sort_idx
  on public.menu_categories (tenant_id, hidden, sort_order, lower(name));

create table if not exists public.menu_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  category_id uuid references public.menu_categories (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text not null default '',
  ingredients text not null default '',
  price numeric(12,2) not null default 0,
  use_package_price boolean not null default false,
  package_price numeric(12,2) not null default 0,
  hidden boolean not null default false,
  signature_dish boolean not null default false,
  checkout_upsell boolean not null default false,
  image_url text,
  sort_order integer not null default 0,

  constraint menu_products_name_not_blank check (char_length(btrim(name)) > 0),
  constraint menu_products_price_nonnegative check (price >= 0),
  constraint menu_products_package_price_nonnegative check (package_price >= 0),
  constraint menu_products_signature_not_hidden check (not (signature_dish and hidden)),
  constraint menu_products_image_url_len check (
    image_url is null or char_length(image_url) <= 1300000
  )
);

create index if not exists menu_products_tenant_category_sort_idx
  on public.menu_products (tenant_id, category_id, hidden, sort_order, lower(name));

create index if not exists menu_products_tenant_upsell_idx
  on public.menu_products (tenant_id, checkout_upsell)
  where checkout_upsell = true;

create unique index if not exists menu_products_one_signature_per_tenant_idx
  on public.menu_products (tenant_id)
  where signature_dish = true;

comment on table public.menu_categories is 'İşletme menüsündeki kategoriler';
comment on table public.menu_products is 'İşletme menüsündeki ürünler';
comment on column public.menu_categories.hidden is 'QR / public menüde görünmez';
comment on column public.menu_products.use_package_price is 'Gösterilen fiyat package_price olur';
comment on column public.menu_products.signature_dish is 'Müşteri menüsünde öne çıkan tek ürün';
comment on column public.menu_products.checkout_upsell is 'Sepet/ödeme adımında önerilebilir';

create or replace function public.menu_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.menu_products_validate_category()
returns trigger
language plpgsql
as $$
declare
  category_tenant_id uuid;
begin
  if new.category_id is null then
    return new;
  end if;

  select tenant_id
    into category_tenant_id
  from public.menu_categories
  where id = new.category_id;

  if category_tenant_id is null then
    raise exception 'Kategori bulunamadı.';
  end if;

  if category_tenant_id <> new.tenant_id then
    raise exception 'Ürün, başka işletmenin kategorisine bağlanamaz.';
  end if;

  return new;
end;
$$;

drop trigger if exists menu_categories_touch_updated_at on public.menu_categories;
create trigger menu_categories_touch_updated_at
before update on public.menu_categories
for each row
execute function public.menu_touch_updated_at();

drop trigger if exists menu_products_touch_updated_at on public.menu_products;
create trigger menu_products_touch_updated_at
before update on public.menu_products
for each row
execute function public.menu_touch_updated_at();

drop trigger if exists menu_products_validate_category on public.menu_products;
create trigger menu_products_validate_category
before insert or update on public.menu_products
for each row
execute function public.menu_products_validate_category();

alter table public.menu_categories enable row level security;
alter table public.menu_products enable row level security;

/* İşletme sahibi kendi kategorilerini/ürünlerini tam yönetir */
drop policy if exists  menu_categories_select_own on public.menu_categories;
create policy menu_categories_select_own
on public.menu_categories
for select
to authenticated
using (
  exists (
    select 1
    from public.tenants t
    where t.id = menu_categories.tenant_id
      and t.owner_user_id = (select auth.uid())
  )
);

drop policy if exists menu_categories_insert_own on public.menu_categories;
create policy menu_categories_insert_own
on public.menu_categories
for insert
to authenticated
with check (
  exists (
    select 1
    from public.tenants t
    where t.id = menu_categories.tenant_id
      and t.owner_user_id = (select auth.uid())
  )
);

drop policy if exists menu_categories_update_own on public.menu_categories;
create policy menu_categories_update_own
on public.menu_categories
for update
to authenticated
using (
  exists (
    select 1
    from public.tenants t
    where t.id = menu_categories.tenant_id
      and t.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.tenants t
    where t.id = menu_categories.tenant_id
      and t.owner_user_id = (select auth.uid())
  )
);

drop policy if exists menu_categories_delete_own on public.menu_categories;
create policy menu_categories_delete_own
on public.menu_categories
for delete
to authenticated
using (
  exists (
    select 1
    from public.tenants t
    where t.id = menu_categories.tenant_id
      and t.owner_user_id = (select auth.uid())
  )
);

/* Public menü: yalnızca görünür kategori ve QR menü açık tenant */
drop policy if exists menu_categories_select_public_visible on public.menu_categories;
create policy menu_categories_select_public_visible
on public.menu_categories
for select
to anon, authenticated
using (
  hidden = false
  and exists (
    select 1
    from public.tenants t
    where t.id = menu_categories.tenant_id
      and t.public_menu_enabled = true
  )
);

drop policy if exists menu_products_select_own on public.menu_products;
create policy menu_products_select_own
on public.menu_products
for select
to authenticated
using (
  exists (
    select 1
    from public.tenants t
    where t.id = menu_products.tenant_id
      and t.owner_user_id = (select auth.uid())
  )
);

drop policy if exists menu_products_insert_own on public.menu_products;
create policy menu_products_insert_own
on public.menu_products
for insert
to authenticated
with check (
  exists (
    select 1
    from public.tenants t
    where t.id = menu_products.tenant_id
      and t.owner_user_id = (select auth.uid())
  )
);

drop policy if exists menu_products_update_own on public.menu_products;
create policy menu_products_update_own
on public.menu_products
for update
to authenticated
using (
  exists (
    select 1
    from public.tenants t
    where t.id = menu_products.tenant_id
      and t.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.tenants t
    where t.id = menu_products.tenant_id
      and t.owner_user_id = (select auth.uid())
  )
);

drop policy if exists menu_products_delete_own on public.menu_products;
create policy menu_products_delete_own
on public.menu_products
for delete
to authenticated
using (
  exists (
    select 1
    from public.tenants t
    where t.id = menu_products.tenant_id
      and t.owner_user_id = (select auth.uid())
  )
);

/* Public menü: yalnızca görünür ürün, görünür kategori ve QR menü açık tenant */
drop policy if exists menu_products_select_public_visible on public.menu_products;
create policy menu_products_select_public_visible
on public.menu_products
for select
to anon, authenticated
using (
  hidden = false
  and category_id is not null
  and exists (
    select 1
    from public.tenants t
    where t.id = menu_products.tenant_id
      and t.public_menu_enabled = true
  )
  and exists (
    select 1
    from public.menu_categories c
    where c.id = menu_products.category_id
      and c.tenant_id = menu_products.tenant_id
      and c.hidden = false
  )
);
