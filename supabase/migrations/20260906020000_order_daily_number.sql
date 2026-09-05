-- Günlük sipariş sırası (İstanbul takvim günü, restoran bazında 1, 2, 3…).

alter table public.orders
  add column if not exists daily_number integer;

create table if not exists public.order_daily_seq (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  day_key date not null,
  seq integer not null default 0,
  primary key (tenant_id, day_key),
  constraint order_daily_seq_positive check (seq >= 0)
);

create or replace function public.allocate_order_daily_number(p_tenant_id uuid, p_day_key date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.order_daily_seq (tenant_id, day_key, seq)
  values (p_tenant_id, p_day_key, 1)
  on conflict (tenant_id, day_key)
  do update set seq = public.order_daily_seq.seq + 1
  returning seq into n;
  return n;
end;
$$;

revoke all on function public.allocate_order_daily_number(uuid, date) from public;
grant execute on function public.allocate_order_daily_number(uuid, date) to service_role;
revoke all on public.order_daily_seq from public;
grant all on public.order_daily_seq to service_role;
