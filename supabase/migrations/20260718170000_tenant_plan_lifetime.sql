/*
  Ömür boyu plan — pilot / özel restoranlar için süresiz tam erişim.
*/

do $$
begin
  alter type public.tenant_plan add value 'lifetime';
exception
  when duplicate_object then null;
end
$$;

comment on type public.tenant_plan is 'free | premium | lifetime (ömür boyu / pilot)';
