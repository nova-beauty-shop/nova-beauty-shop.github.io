/*
# Admin write access for storefront catalog content

1. Summary
- Lets signed-in admins create, edit, and delete products, categories, banners, stories, and reviews from the admin panel.
- Adds an image bucket for catalog media that only admins can upload to. Images are publicly readable so the storefront can show them.

2. Security
- Writes are gated by the existing is_admin() check, so customers and anonymous visitors still cannot change catalog content.
- Admins can read inactive and unpublished rows so they can manage them.
- Each table gets separate insert, update, and delete policies.
- Storage uploads and deletes in the catalog bucket are restricted to admins.

3. Notes
- Existing public read policies are unchanged.
- Nothing is dropped or altered; only policies, grants, and one storage bucket are added.
*/

GRANT INSERT, UPDATE, DELETE ON products, categories, banners, stories, reviews TO authenticated;
GRANT SELECT ON products, categories, banners, stories, reviews TO authenticated;

DROP POLICY IF EXISTS "admin_select_products" ON products;
CREATE POLICY "admin_select_products" ON products FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_products" ON products;
CREATE POLICY "admin_insert_products" ON products FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_products" ON products;
CREATE POLICY "admin_update_products" ON products FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_delete_products" ON products;
CREATE POLICY "admin_delete_products" ON products FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_select_categories" ON categories;
CREATE POLICY "admin_select_categories" ON categories FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_categories" ON categories;
CREATE POLICY "admin_insert_categories" ON categories FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_categories" ON categories;
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_select_banners" ON banners;
CREATE POLICY "admin_select_banners" ON banners FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_banners" ON banners;
CREATE POLICY "admin_insert_banners" ON banners FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_banners" ON banners;
CREATE POLICY "admin_update_banners" ON banners FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_delete_banners" ON banners;
CREATE POLICY "admin_delete_banners" ON banners FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_select_stories" ON stories;
CREATE POLICY "admin_select_stories" ON stories FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_stories" ON stories;
CREATE POLICY "admin_insert_stories" ON stories FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_stories" ON stories;
CREATE POLICY "admin_update_stories" ON stories FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_delete_stories" ON stories;
CREATE POLICY "admin_delete_stories" ON stories FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_select_reviews" ON reviews;
CREATE POLICY "admin_select_reviews" ON reviews FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_reviews" ON reviews;
CREATE POLICY "admin_insert_reviews" ON reviews FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_reviews" ON reviews;
CREATE POLICY "admin_update_reviews" ON reviews FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_delete_reviews" ON reviews;
CREATE POLICY "admin_delete_reviews" ON reviews FOR DELETE TO authenticated USING (is_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('catalog-media', 'catalog-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "admin_insert_catalog_media" ON storage.objects;
CREATE POLICY "admin_insert_catalog_media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'catalog-media' AND is_admin());
DROP POLICY IF EXISTS "admin_update_catalog_media" ON storage.objects;
CREATE POLICY "admin_update_catalog_media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'catalog-media' AND is_admin()) WITH CHECK (bucket_id = 'catalog-media' AND is_admin());
DROP POLICY IF EXISTS "admin_delete_catalog_media" ON storage.objects;
CREATE POLICY "admin_delete_catalog_media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'catalog-media' AND is_admin());
