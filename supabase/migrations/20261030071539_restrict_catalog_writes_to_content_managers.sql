/*
# Restrict catalog content writes to owners and managers

1. Summary
- Catalog content (products, categories, banners, stories, reviews, and catalog images) can now be changed only by owners and managers.
- Reviewers can still sign in to the admin area, but they cannot change catalog content.

2. Security
- Adds a helper function that checks the caller's role in the admin roles table.
- Replaces the write policies created earlier so they use this helper instead of the general admin check.
- Admins can still read all catalog rows, including inactive ones.

3. Notes
- Nothing is dropped; only functions and policies are replaced.
*/

CREATE OR REPLACE FUNCTION public.is_content_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_content_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_content_manager() TO authenticated;

DROP POLICY IF EXISTS "admin_insert_products" ON products;
CREATE POLICY "admin_insert_products" ON products FOR INSERT TO authenticated WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_update_products" ON products;
CREATE POLICY "admin_update_products" ON products FOR UPDATE TO authenticated USING (is_content_manager()) WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_delete_products" ON products;
CREATE POLICY "admin_delete_products" ON products FOR DELETE TO authenticated USING (is_content_manager());

DROP POLICY IF EXISTS "admin_insert_categories" ON categories;
CREATE POLICY "admin_insert_categories" ON categories FOR INSERT TO authenticated WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_update_categories" ON categories;
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE TO authenticated USING (is_content_manager()) WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE TO authenticated USING (is_content_manager());

DROP POLICY IF EXISTS "admin_insert_banners" ON banners;
CREATE POLICY "admin_insert_banners" ON banners FOR INSERT TO authenticated WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_update_banners" ON banners;
CREATE POLICY "admin_update_banners" ON banners FOR UPDATE TO authenticated USING (is_content_manager()) WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_delete_banners" ON banners;
CREATE POLICY "admin_delete_banners" ON banners FOR DELETE TO authenticated USING (is_content_manager());

DROP POLICY IF EXISTS "admin_insert_stories" ON stories;
CREATE POLICY "admin_insert_stories" ON stories FOR INSERT TO authenticated WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_update_stories" ON stories;
CREATE POLICY "admin_update_stories" ON stories FOR UPDATE TO authenticated USING (is_content_manager()) WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_delete_stories" ON stories;
CREATE POLICY "admin_delete_stories" ON stories FOR DELETE TO authenticated USING (is_content_manager());

DROP POLICY IF EXISTS "admin_insert_reviews" ON reviews;
CREATE POLICY "admin_insert_reviews" ON reviews FOR INSERT TO authenticated WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_update_reviews" ON reviews;
CREATE POLICY "admin_update_reviews" ON reviews FOR UPDATE TO authenticated USING (is_content_manager()) WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_delete_reviews" ON reviews;
CREATE POLICY "admin_delete_reviews" ON reviews FOR DELETE TO authenticated USING (is_content_manager());

DROP POLICY IF EXISTS "admin_insert_catalog_media" ON storage.objects;
CREATE POLICY "admin_insert_catalog_media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'catalog-media' AND is_content_manager());
DROP POLICY IF EXISTS "admin_update_catalog_media" ON storage.objects;
CREATE POLICY "admin_update_catalog_media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'catalog-media' AND is_content_manager()) WITH CHECK (bucket_id = 'catalog-media' AND is_content_manager());
DROP POLICY IF EXISTS "admin_delete_catalog_media" ON storage.objects;
CREATE POLICY "admin_delete_catalog_media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'catalog-media' AND is_content_manager());
