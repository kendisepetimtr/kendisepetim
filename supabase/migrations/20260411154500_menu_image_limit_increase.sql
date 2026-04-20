/*
  Ürün görsel limiti artırıldı.
  Frontend'deki MAX_IMAGE_DATA_URL_LENGTH ile uyumlu tutulmalı.
*/

alter table public.menu_products
  drop constraint if exists menu_products_image_url_len;

alter table public.menu_products
  add constraint menu_products_image_url_len check (
    image_url is null or char_length(image_url) <= 4800000
  );
