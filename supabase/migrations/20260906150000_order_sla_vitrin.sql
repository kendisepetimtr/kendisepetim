-- Mutfak SLA (görüldü), iptal nedeni, keşif vitrin onayı.

alter table public.orders
  add column if not exists seen_at timestamptz,
  add column if not exists cancel_reason text,
  add column if not exists cancel_note text;

alter table public.orders
  drop constraint if exists orders_cancel_reason_check;

alter table public.orders
  add constraint orders_cancel_reason_check
  check (
    cancel_reason is null
    or cancel_reason in ('out_of_stock', 'closed', 'out_of_area', 'other')
  );

comment on column public.orders.seen_at is 'Kasa/dashboard siparişi açınca veya kabul edince dolar.';
comment on column public.orders.cancel_reason is 'İptal kodu: stok yok / kapalı / bölge dışı / diğer.';
comment on column public.orders.cancel_note is 'İptal serbest notu (müşteri takipte görür).';

alter table public.tenants
  add column if not exists marketplace_vitrin_approved boolean not null default false;

comment on column public.tenants.marketplace_vitrin_approved is
  'Superadmin keşif vitrin onayı. QR menüden bağımsızdır.';

-- Zaten pazaryerinde yayınlı işletmeler vitrinde kalsın.
update public.tenants
set marketplace_vitrin_approved = true
where marketplace_enabled = true
  and marketplace_vitrin_approved = false;
