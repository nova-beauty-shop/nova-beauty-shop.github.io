-- Least-privilege table grants: remove TRUNCATE/REFERENCES/TRIGGER and any
-- write grants that no policy or client path uses. Writes go through
-- SECURITY DEFINER RPCs, which run as the table owner.

REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON products, categories, banners, stories, reviews, store_settings, payment_settings, payment_receipts, orders, order_items FROM anon, authenticated;

REVOKE UPDATE ON addresses FROM authenticated;
