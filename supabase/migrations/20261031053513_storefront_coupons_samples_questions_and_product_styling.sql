/*
# Coupons, free samples, product questions, product card styling and order extras

## Summary
Adds the database foundation for discount codes, free sample offers, customer questions on products, product card styling with animations, amazing-offer timers, and delivery slot and promotion details on orders. Nothing existing is removed or changed in behaviour.

## 1. New tables
- `coupons`: discount codes. Each code has a type (percent or fixed amount), a value, an optional minimum subtotal, an optional usage limit, an optional start and end time, and an active switch. Codes are stored in upper case.
- `free_samples`: free sample offers that a customer can add to an order. Each has a title, description, image, minimum subtotal, active switch and sort order.
- `product_questions`: questions customers ask about a product. Admins answer them. Only published questions (with an answer) are visible to shoppers. Customer identities are never exposed.

## 2. Changes to existing tables
- `products`:
  - `card_bg_type` (color, preset or image; default color)
  - `card_bg_value` (the colour, preset name or image address)
  - `animation_type` (float, zoom, rotate3d or pulse-glow; empty means none)
  - `is_amazing_offer` (shows the amazing-offer countdown when true)
  - `offer_ends_at` (when the amazing offer ends)
  - The existing `variants` column is reused for colour and size options. No new column is added for it.
- `orders`:
  - `delivery_slot` (date and time window, for example 2026-11-02 09-12)
  - `free_sample_title` (the sample chosen for the order)
  - `coupon_code` (the discount code used)

## 3. Security
- `coupons` and `free_samples` writes and coupon reads are limited to content managers (checked with `is_content_manager()`). Shoppers cannot list coupon codes.
- `free_samples`: shoppers see only active samples. Anonymous visitors have read access to active samples only.
- `product_questions`:
  - Shoppers and anonymous visitors see only published questions, and the author identifier column is never granted to them.
  - Signed-in shoppers can ask a question only for themselves, only for active products, and cannot pre-fill an answer or publish it.
  - Only content managers can answer, publish or delete questions.
- Each table has row level security enabled, with separate select, insert, update and delete policies and explicit grants.

## 4. Important notes
1. Applying a coupon or claiming a free sample at checkout is not part of this migration. Order placement is unchanged for now.
2. Coupon usage counts are maintained by the checkout step when it is built.
3. Column constraints keep stored values within the allowed options, so bad data cannot be saved by mistake.
*/

ALTER TABLE products ADD COLUMN IF NOT EXISTS card_bg_type text NOT NULL DEFAULT 'color';
ALTER TABLE products ADD COLUMN IF NOT EXISTS card_bg_value text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS animation_type text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_amazing_offer boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS offer_ends_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_card_bg_type_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_card_bg_type_check CHECK (card_bg_type IN ('color', 'preset', 'image'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_animation_type_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_animation_type_check CHECK (animation_type IS NULL OR animation_type IN ('float', 'zoom', 'rotate3d', 'pulse-glow'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_card_bg_value_length') THEN
    ALTER TABLE products ADD CONSTRAINT products_card_bg_value_length CHECK (card_bg_value IS NULL OR char_length(card_bg_value) <= 500);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  discount_type text NOT NULL,
  discount_value integer NOT NULL,
  min_subtotal_toman bigint NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_code_format CHECK (code ~ '^[A-Z0-9_-]{3,20}$'),
  CONSTRAINT coupons_discount_type_check CHECK (discount_type IN ('percent', 'amount')),
  CONSTRAINT coupons_discount_value_range CHECK (
    (discount_type = 'percent' AND discount_value BETWEEN 1 AND 100)
    OR (discount_type = 'amount' AND discount_value BETWEEN 1 AND 1000000000)
  ),
  CONSTRAINT coupons_min_subtotal_range CHECK (min_subtotal_toman BETWEEN 0 AND 1000000000),
  CONSTRAINT coupons_max_uses_positive CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT coupons_used_count_nonnegative CHECK (used_count >= 0),
  CONSTRAINT coupons_window_order CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_key ON coupons (code);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON coupons TO authenticated;

DROP POLICY IF EXISTS "content_select_coupons" ON coupons;
CREATE POLICY "content_select_coupons" ON coupons FOR SELECT
  TO authenticated USING (public.is_content_manager());

DROP POLICY IF EXISTS "content_insert_coupons" ON coupons;
CREATE POLICY "content_insert_coupons" ON coupons FOR INSERT
  TO authenticated WITH CHECK (public.is_content_manager());

DROP POLICY IF EXISTS "content_update_coupons" ON coupons;
CREATE POLICY "content_update_coupons" ON coupons FOR UPDATE
  TO authenticated USING (public.is_content_manager()) WITH CHECK (public.is_content_manager());

DROP POLICY IF EXISTS "content_delete_coupons" ON coupons;
CREATE POLICY "content_delete_coupons" ON coupons FOR DELETE
  TO authenticated USING (public.is_content_manager());

CREATE TABLE IF NOT EXISTS free_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  min_subtotal_toman bigint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT free_samples_title_length CHECK (char_length(title) BETWEEN 2 AND 120),
  CONSTRAINT free_samples_description_length CHECK (char_length(description) <= 300),
  CONSTRAINT free_samples_image_length CHECK (char_length(image_url) <= 500),
  CONSTRAINT free_samples_min_subtotal_range CHECK (min_subtotal_toman BETWEEN 0 AND 1000000000),
  CONSTRAINT free_samples_sort_order_range CHECK (sort_order BETWEEN 0 AND 10000)
);

CREATE INDEX IF NOT EXISTS free_samples_active_sort_idx ON free_samples (is_active, sort_order);

ALTER TABLE free_samples ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON free_samples TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON free_samples TO authenticated;

DROP POLICY IF EXISTS "public_select_active_free_samples" ON free_samples;
CREATE POLICY "public_select_active_free_samples" ON free_samples FOR SELECT
  TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "content_select_free_samples" ON free_samples;
CREATE POLICY "content_select_free_samples" ON free_samples FOR SELECT
  TO authenticated USING (public.is_content_manager());

DROP POLICY IF EXISTS "content_insert_free_samples" ON free_samples;
CREATE POLICY "content_insert_free_samples" ON free_samples FOR INSERT
  TO authenticated WITH CHECK (public.is_content_manager());

DROP POLICY IF EXISTS "content_update_free_samples" ON free_samples;
CREATE POLICY "content_update_free_samples" ON free_samples FOR UPDATE
  TO authenticated USING (public.is_content_manager()) WITH CHECK (public.is_content_manager());

DROP POLICY IF EXISTS "content_delete_free_samples" ON free_samples;
CREATE POLICY "content_delete_free_samples" ON free_samples FOR DELETE
  TO authenticated USING (public.is_content_manager());

CREATE TABLE IF NOT EXISTS product_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text,
  answered_at timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_questions_question_length CHECK (char_length(question) BETWEEN 5 AND 500),
  CONSTRAINT product_questions_answer_length CHECK (answer IS NULL OR char_length(answer) BETWEEN 1 AND 2000),
  CONSTRAINT product_questions_published_requires_answer CHECK (NOT is_published OR answer IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS product_questions_product_idx ON product_questions (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS product_questions_user_idx ON product_questions (user_id);

ALTER TABLE product_questions ENABLE ROW LEVEL SECURITY;

GRANT SELECT (id, product_id, question, answer, answered_at, is_published, created_at) ON product_questions TO anon, authenticated;
GRANT INSERT (product_id, user_id, question) ON product_questions TO authenticated;
GRANT UPDATE (answer, answered_at, is_published) ON product_questions TO authenticated;
GRANT DELETE ON product_questions TO authenticated;

DROP POLICY IF EXISTS "public_select_published_questions" ON product_questions;
CREATE POLICY "public_select_published_questions" ON product_questions FOR SELECT
  TO anon, authenticated USING (is_published);

DROP POLICY IF EXISTS "content_select_questions" ON product_questions;
CREATE POLICY "content_select_questions" ON product_questions FOR SELECT
  TO authenticated USING (public.is_content_manager());

DROP POLICY IF EXISTS "owner_insert_questions" ON product_questions;
CREATE POLICY "owner_insert_questions" ON product_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND answer IS NULL
    AND is_published = false
    AND EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.is_active)
  );

DROP POLICY IF EXISTS "content_update_questions" ON product_questions;
CREATE POLICY "content_update_questions" ON product_questions FOR UPDATE
  TO authenticated USING (public.is_content_manager()) WITH CHECK (public.is_content_manager());

DROP POLICY IF EXISTS "content_delete_questions" ON product_questions;
CREATE POLICY "content_delete_questions" ON product_questions FOR DELETE
  TO authenticated USING (public.is_content_manager());

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS free_sample_title text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_slot_format') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_delivery_slot_format
      CHECK (delivery_slot IS NULL OR delivery_slot ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} (09-12|12-15|15-18|18-21)$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_free_sample_title_length') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_free_sample_title_length CHECK (free_sample_title IS NULL OR char_length(free_sample_title) <= 120);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_coupon_code_format') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_coupon_code_format CHECK (coupon_code IS NULL OR coupon_code ~ '^[A-Z0-9_-]{3,20}$');
  END IF;
END $$;
