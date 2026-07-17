/*
  Süperadmin giriş — kullanıcı adı + şifre hash (Supabase).
  Şifre düz metin saklanmaz; panelden veya server action ile hash üretilir.
*/

create table if not exists public.superadmin_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  username text not null,
  password_hash text not null,
  is_active boolean not null default true,
  constraint superadmin_users_username_not_blank check (btrim(username) <> ''),
  constraint superadmin_users_username_len check (char_length(btrim(username)) between 3 and 64),
  constraint superadmin_users_password_hash_not_blank check (btrim(password_hash) <> '')
);

create unique index if not exists superadmin_users_username_lower_uidx
  on public.superadmin_users (lower(btrim(username)));

comment on table public.superadmin_users is
  'KendiSepetim süperadmin hesapları — şifre scrypt hash (panelden yönetilir)';
