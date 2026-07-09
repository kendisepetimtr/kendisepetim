/*
  Fiş ayarları — 3 ayrı fiş tipi (müşteri, mutfak, kurye) varsayılanları.
  Mevcut kayıtlar parseReceiptSettings ile uyumlu kalır; yeni alanlar eksikse kod tarafında tamamlanır.
*/

comment on column public.tenants.receipt_settings is
  'Fiş yazdırma ayarları: müşteri, mutfak, kurye fişleri; autoPrintOnNewOrder / autoPrintOnPayment';
