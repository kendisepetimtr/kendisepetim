-- Superadmin restoran yönetimi için ek alanlar
alter table public.restaurants
  add column if not exists admin_username text,
  add column if not exists admin_email text,
  add column if not exists admin_phone text,
  add column if not exists admin_password_hash text;

comment on column public.restaurants.admin_username is
  'Restoran admin panel kullanıcı adı (superadmin yönetir).';
comment on column public.restaurants.admin_email is
  'Restoran admin panel e-posta bilgisi (superadmin yönetir).';
comment on column public.restaurants.admin_phone is
  'Restoran admin panel telefon bilgisi (superadmin yönetir).';
comment on column public.restaurants.admin_password_hash is
  'Restoran admin panel şifre özeti (hash).';
