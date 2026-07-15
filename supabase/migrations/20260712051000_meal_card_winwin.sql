-- Setcard / Metropol zaten vardı; WinWin eklendi. Constraint güncellenir.

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
