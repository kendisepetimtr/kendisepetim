-- Restoran hangi yemek kartı markalarını kabul ediyor; sipariş brand listesi genişletildi.

alter table public.tenants
  add column if not exists payment_meal_card_brands text[] not null default '{}';

comment on column public.tenants.payment_meal_card_brands is
  'Aktif yemek kartı marka id listesi (multinet, sodexo, ticket, …). payment_meal_card true iken kullanılır.';

-- Yemek kartı zaten açık işletmeler: marka listesi boşsa klasik üçü doldur
-- (sonra ayarlardan Setcard / Metropol vb. eklenebilir; müşteri yalnızca seçilenleri görür)
update public.tenants
set payment_meal_card_brands = array['multinet', 'sodexo', 'edenred']::text[]
where payment_meal_card = true
  and coalesce(cardinality(payment_meal_card_brands), 0) = 0;

alter table public.orders drop constraint if exists orders_meal_card_brand_check;

alter table public.orders
  add constraint orders_meal_card_brand_check check (
    meal_card_brand_id is null
    or meal_card_brand_id in (
      'multinet',
      'sodexo',
      'edenred',
      'setcard',
      'metropol',
      'ticket',
      'paye',
      'tokenflex',
      'winwin'
    )
  );
