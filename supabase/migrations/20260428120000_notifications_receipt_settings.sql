/*
  Bildirim zili ve fiş ayarları — Faz 8.
*/

alter table public.tenants
  add column if not exists notification_settings jsonb not null default '{
    "soundEnabled": true,
    "soundId": "classic",
    "toastEnabled": true,
    "alertOnOrderCreated": true,
    "alertOnBillRequested": true
  }'::jsonb,
  add column if not exists receipt_settings jsonb not null default '{
    "enabled": false,
    "autoPrintOnPayment": true,
    "copies": 1,
    "headerText": "",
    "footerText": "Afiyet olsun!",
    "showLogo": true,
    "showBusinessName": true,
    "showOrderCode": true,
    "showDateTime": true,
    "showCustomerInfo": true,
    "showPaymentMethod": true,
    "showTableNumber": true,
    "showOrderNote": true,
    "showItemUnitPrices": true,
    "kitchenTicketEnabled": false,
    "paperWidthMm": 80
  }'::jsonb;

comment on column public.tenants.notification_settings is 'Panel bildirim zili — ses ve toast tercihleri';
comment on column public.tenants.receipt_settings is 'Fiş / yazdırma şablonu ayarları (jsonb)';
