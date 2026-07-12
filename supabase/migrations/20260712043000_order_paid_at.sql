-- Ödeme kapanış zaman damgası (kasa tahsilatı)
alter table public.orders
  add column if not exists paid_at timestamptz;

comment on column public.orders.paid_at is 'Kasa tahsilat anı (payment_method_at_close ile birlikte)';
