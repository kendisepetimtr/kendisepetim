-- Havale (banka transferi) ödeme yöntemi — kasa tahsilatı / beyan

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('cash', 'door_card', 'meal_card', 'havale'));

alter table public.orders drop constraint if exists orders_payment_method_at_close_check;
alter table public.orders
  add constraint orders_payment_method_at_close_check
  check (
    payment_method_at_close is null
    or payment_method_at_close in ('cash', 'door_card', 'meal_card', 'havale')
  );
