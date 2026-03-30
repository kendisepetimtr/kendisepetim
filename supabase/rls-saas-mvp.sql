-- =============================================================================
-- KendiSepetim — RLS (MVP): kayit + onboarding + public menu + checkout + dashboard
-- Supabase SQL Editor'de calistir. Mevcut politikalarla cakisma olursa once DROP edin.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- restaurants
-- ---------------------------------------------------------------------------
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS restaurants_select_anon_active ON public.restaurants;
DROP POLICY IF EXISTS restaurants_select_authenticated ON public.restaurants;
DROP POLICY IF EXISTS restaurants_authenticated_insert ON public.restaurants;
DROP POLICY IF EXISTS restaurants_members_update ON public.restaurants;
DROP POLICY IF EXISTS restaurants_delete_if_no_members ON public.restaurants;

-- Misafir: sadece aktif restoran (menu)
CREATE POLICY restaurants_select_anon_active ON public.restaurants
FOR SELECT TO anon
USING (is_active = true);

-- Giris yapmis: slug kontrolu + tum satirlar (gelistirme kolayligi; sonra daraltin)
CREATE POLICY restaurants_select_authenticated ON public.restaurants
FOR SELECT TO authenticated
USING (true);

-- Onboarding: yeni restoran satiri
CREATE POLICY restaurants_authenticated_insert ON public.restaurants
FOR INSERT TO authenticated
WITH CHECK (true);

-- Uye restoranini gunceller (settings)
CREATE POLICY restaurants_members_update ON public.restaurants
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = restaurants.id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = restaurants.id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
);

-- Onboarding rollback: hic uye yokken sil (uyelik insert patlarsa)
CREATE POLICY restaurants_delete_if_no_members ON public.restaurants
FOR DELETE TO authenticated
USING (
  NOT EXISTS (
    SELECT 1 FROM public.restaurant_members rm WHERE rm.restaurant_id = restaurants.id
  )
);

-- ---------------------------------------------------------------------------
-- restaurant_members
-- ---------------------------------------------------------------------------
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS restaurant_members_select_own ON public.restaurant_members;
DROP POLICY IF EXISTS restaurant_members_insert_first_or_staff ON public.restaurant_members;

CREATE POLICY restaurant_members_select_own ON public.restaurant_members
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Ilk uye (onboarding): restoranda hic satir yokken kendi user_id ile ekleme
-- Sonra: owner/manager baska kullanici ekleyebilir (davet)
CREATE POLICY restaurant_members_insert_first_or_staff ON public.restaurant_members
FOR INSERT TO authenticated
WITH CHECK (
  (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.restaurant_members e
      WHERE e.restaurant_id = restaurant_members.restaurant_id
    )
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM public.restaurant_members e
      WHERE e.restaurant_id = restaurant_members.restaurant_id
        AND e.user_id = auth.uid()
        AND e.is_active = true
        AND e.role IN ('owner', 'manager')
    )
  )
);
-- Ilk kosul: onboarding (yalnizca kendi hesabiniz). Ikinci: owner/manager baska kullanici ekler.

-- ---------------------------------------------------------------------------
-- categories (public menu + dashboard)
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_select_public ON public.categories;
DROP POLICY IF EXISTS categories_member_all ON public.categories;
DROP POLICY IF EXISTS categories_member_select ON public.categories;
DROP POLICY IF EXISTS categories_member_insert ON public.categories;
DROP POLICY IF EXISTS categories_member_update ON public.categories;
DROP POLICY IF EXISTS categories_member_delete ON public.categories;

CREATE POLICY categories_select_public ON public.categories
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = categories.restaurant_id AND r.is_active = true
  )
);

-- Uye: tum kategori satirlari (pasif dahil). FOR ALL yerine ayri komutlar — INSERT RLS sorunlarini onler.
CREATE POLICY categories_member_select ON public.categories
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = categories.restaurant_id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
);

CREATE POLICY categories_member_insert ON public.categories
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = categories.restaurant_id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
);

CREATE POLICY categories_member_update ON public.categories
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = categories.restaurant_id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = categories.restaurant_id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
);

CREATE POLICY categories_member_delete ON public.categories
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = categories.restaurant_id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_select_public ON public.products;
DROP POLICY IF EXISTS products_member_all ON public.products;
DROP POLICY IF EXISTS products_member_select ON public.products;
DROP POLICY IF EXISTS products_member_insert ON public.products;
DROP POLICY IF EXISTS products_member_update ON public.products;
DROP POLICY IF EXISTS products_member_delete ON public.products;

CREATE POLICY products_select_public ON public.products
FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = products.restaurant_id AND r.is_active = true
  )
);

CREATE POLICY products_member_select ON public.products
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = products.restaurant_id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
);

CREATE POLICY products_member_insert ON public.products
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = products.restaurant_id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
);

CREATE POLICY products_member_update ON public.products
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = products.restaurant_id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = products.restaurant_id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
);

CREATE POLICY products_member_delete ON public.products
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = products.restaurant_id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_select_members ON public.orders;
DROP POLICY IF EXISTS orders_insert_checkout ON public.orders;
DROP POLICY IF EXISTS orders_update_members ON public.orders;

CREATE POLICY orders_select_members ON public.orders
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = orders.restaurant_id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
);

-- Misafir siparis
CREATE POLICY orders_insert_checkout ON public.orders
FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = orders.restaurant_id AND r.is_active = true
  )
);

CREATE POLICY orders_update_members ON public.orders
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = orders.restaurant_id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = orders.restaurant_id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
);

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_items_select_members ON public.order_items;
DROP POLICY IF EXISTS order_items_insert_checkout ON public.order_items;

CREATE POLICY order_items_select_members ON public.order_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_members rm
    WHERE rm.restaurant_id = order_items.restaurant_id
      AND rm.user_id = auth.uid()
      AND rm.is_active = true
  )
);

CREATE POLICY order_items_insert_checkout ON public.order_items
FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = order_items.restaurant_id AND r.is_active = true
  )
);
