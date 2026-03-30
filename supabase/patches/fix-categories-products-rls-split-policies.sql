-- =============================================================================
-- categories / products: FOR ALL -> ayri SELECT/INSERT/UPDATE/DELETE (authenticated)
-- "new row violates row-level security policy" (INSERT) duzeltmesi icin Supabase SQL'de calistirin.
-- =============================================================================

-- categories
DROP POLICY IF EXISTS categories_member_all ON public.categories;
DROP POLICY IF EXISTS categories_member_select ON public.categories;
DROP POLICY IF EXISTS categories_member_insert ON public.categories;
DROP POLICY IF EXISTS categories_member_update ON public.categories;
DROP POLICY IF EXISTS categories_member_delete ON public.categories;

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

-- products
DROP POLICY IF EXISTS products_member_all ON public.products;
DROP POLICY IF EXISTS products_member_select ON public.products;
DROP POLICY IF EXISTS products_member_insert ON public.products;
DROP POLICY IF EXISTS products_member_update ON public.products;
DROP POLICY IF EXISTS products_member_delete ON public.products;

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
