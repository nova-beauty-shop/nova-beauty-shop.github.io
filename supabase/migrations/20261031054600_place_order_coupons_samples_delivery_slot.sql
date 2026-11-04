/*
# Coupons, free samples and delivery slots at checkout

## Summary
Order placement now accepts a coupon code, a free sample choice and a courier delivery time slot. All rules are enforced on the server, so prices and discounts can not be changed by the browser.

## 1. New functions
- `validate_coupon(code, subtotal)`: lets the cart preview a discount before checkout. Returns the coupon code and the discount amount in toman, or an error if the code is not usable.
- `coupon_discount_toman(coupon, subtotal)`: internal helper that checks whether a coupon can be used (active, within dates, usage limit not reached, minimum order met) and calculates the discount. Not callable by shoppers.

## 2. Changed tables
- `orders.discount_amount`: the discount applied to the order (zero by default, never negative).

## 3. Changed order placement
- Accepts optional `delivery slot`, `coupon code` and `free sample id`.
- Courier orders require a delivery slot on a date that is today or later (Tehran time). Post orders must not have one.
- A coupon is checked and locked while the order is placed, and its usage count increases by one.
- The chosen free sample must be active and the order subtotal must meet its minimum. The sample title is stored on the order. Samples are not charged.
- Total = subtotal - discount + delivery fee.

## 4. Security
- Both new functions run with the owner's rights and only check inputs the shopper provides.
- Coupon internals are not granted to shoppers, so the full list of coupon rules is never exposed.
- Order placement is still limited to signed-in shoppers.

## 5. Notes
1. The delivery fee still uses the subtotal before discount, matching the price shown on the cart.
2. Coupon usage is counted when the order is placed, not when it is paid.
*/

ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount bigint NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_discount_amount_nonnegative') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_discount_amount_nonnegative CHECK (discount_amount >= 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.coupon_discount_toman(p_coupon coupons, p_subtotal bigint)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT p_coupon.is_active
    OR (p_coupon.starts_at IS NOT NULL AND p_coupon.starts_at > now())
    OR (p_coupon.ends_at IS NOT NULL AND p_coupon.ends_at < now()) THEN
    RAISE EXCEPTION 'coupon_invalid';
  END IF;
  IF p_coupon.max_uses IS NOT NULL AND p_coupon.used_count >= p_coupon.max_uses THEN
    RAISE EXCEPTION 'coupon_exhausted';
  END IF;
  IF p_subtotal < p_coupon.min_subtotal_toman THEN
    RAISE EXCEPTION 'coupon_min_subtotal';
  END IF;
  IF p_coupon.discount_type = 'percent' THEN
    RETURN floor(p_subtotal * p_coupon.discount_value / 100);
  END IF;
  RETURN LEAST(p_coupon.discount_value, p_subtotal);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.coupon_discount_toman(coupons, bigint) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_subtotal bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_coupon coupons%ROWTYPE;
BEGIN
  IF p_code IS NULL OR p_subtotal IS NULL OR p_subtotal < 0 THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;
  SELECT * INTO v_coupon FROM coupons WHERE code = upper(trim(p_code));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'coupon_invalid';
  END IF;
  RETURN jsonb_build_object(
    'code', v_coupon.code,
    'discount_toman', public.coupon_discount_toman(v_coupon, p_subtotal)
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, bigint) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.place_order(uuid, text, jsonb, text);

CREATE OR REPLACE FUNCTION public.place_order(
  p_address_id uuid,
  p_delivery_method text,
  p_items jsonb,
  p_idempotency_key text,
  p_delivery_slot text DEFAULT NULL,
  p_coupon_code text DEFAULT NULL,
  p_free_sample_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
v_uid uuid := auth.uid();
v_existing uuid;
v_address addresses%ROWTYPE;
v_order_id uuid;
v_product products%ROWTYPE;
v_item record;
v_label text;
v_delta bigint;
v_unit bigint;
v_line bigint;
v_subtotal bigint := 0;
v_fee bigint;
v_discount bigint := 0;
v_coupon coupons%ROWTYPE;
v_coupon_code text;
v_sample free_samples%ROWTYPE;
v_sample_title text;
v_store store_settings%ROWTYPE;
BEGIN
IF v_uid IS NULL THEN
RAISE EXCEPTION 'not_authenticated';
END IF;

IF p_idempotency_key IS NULL OR char_length(p_idempotency_key) NOT BETWEEN 8 AND 100 THEN
RAISE EXCEPTION 'invalid_request';
END IF;

SELECT id INTO v_existing FROM orders WHERE user_id = v_uid AND idempotency_key = p_idempotency_key;
IF v_existing IS NOT NULL THEN
RETURN v_existing;
END IF;

IF NOT (SELECT card_payment_enabled FROM payment_settings WHERE id = 1) THEN
RAISE EXCEPTION 'payments_disabled';
END IF;

IF p_delivery_method NOT IN ('courier', 'post') THEN
RAISE EXCEPTION 'invalid_request';
END IF;

IF p_delivery_method = 'courier' THEN
IF p_delivery_slot IS NULL
OR p_delivery_slot !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} (09-12|12-15|15-18|18-21)$'
OR left(p_delivery_slot, 10)::date < (now() AT TIME ZONE 'Asia/Tehran')::date THEN
RAISE EXCEPTION 'invalid_slot';
END IF;
ELSIF p_delivery_slot IS NOT NULL THEN
RAISE EXCEPTION 'invalid_slot';
END IF;

IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 30 THEN
RAISE EXCEPTION 'invalid_request';
END IF;

SELECT * INTO v_address FROM addresses WHERE id = p_address_id AND user_id = v_uid;
IF NOT FOUND THEN
RAISE EXCEPTION 'address_not_found';
END IF;

SELECT * INTO v_store FROM store_settings WHERE id = 1;

INSERT INTO orders (
user_id, idempotency_key, delivery_method, delivery_slot,
recipient_name, phone, province, city, street, postal_code
) VALUES (
v_uid, p_idempotency_key, p_delivery_method, p_delivery_slot,
v_address.recipient_name, v_address.phone, v_address.province, v_address.city, v_address.street, v_address.postal_code
)
RETURNING id INTO v_order_id;

FOR v_item IN
SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, variant_id text, quantity integer)
LOOP
IF v_item.product_id IS NULL OR v_item.variant_id IS NULL
OR v_item.quantity IS NULL OR v_item.quantity NOT BETWEEN 1 AND 20 THEN
RAISE EXCEPTION 'invalid_request';
END IF;

IF EXISTS (
SELECT 1 FROM order_items
WHERE order_id = v_order_id AND product_id = v_item.product_id AND variant_id = v_item.variant_id
) THEN
RAISE EXCEPTION 'invalid_request';
END IF;

SELECT * INTO v_product FROM products WHERE id = v_item.product_id AND is_active FOR UPDATE;
IF NOT FOUND THEN
RAISE EXCEPTION 'product_unavailable';
END IF;

v_label := NULL;
v_delta := 0;
IF jsonb_array_length(COALESCE(v_product.variants, '[]'::jsonb)) = 0 THEN
IF v_item.variant_id <> 'default' THEN
RAISE EXCEPTION 'invalid_variant';
END IF;
ELSE
SELECT elem->>'label', COALESCE((elem->>'price_delta')::bigint, 0)
INTO v_label, v_delta
FROM jsonb_array_elements(v_product.variants) AS elem
WHERE elem->>'id' = v_item.variant_id
LIMIT 1;
IF NOT FOUND THEN
RAISE EXCEPTION 'invalid_variant';
END IF;
END IF;

IF v_product.stock < v_item.quantity THEN
RAISE EXCEPTION 'out_of_stock';
END IF;

UPDATE products SET stock = stock - v_item.quantity WHERE id = v_product.id;

v_unit := v_product.price_toman + v_delta;
v_line := v_unit * v_item.quantity;
v_subtotal := v_subtotal + v_line;

INSERT INTO order_items (
order_id, product_id, product_name, brand, variant_id, variant_label,
unit_price_toman, quantity, line_total_toman
) VALUES (
v_order_id, v_product.id, v_product.name, v_product.brand, v_item.variant_id, v_label,
v_unit, v_item.quantity, v_line
);
END LOOP;

IF p_free_sample_id IS NOT NULL THEN
SELECT * INTO v_sample FROM free_samples WHERE id = p_free_sample_id AND is_active;
IF NOT FOUND OR v_subtotal < v_sample.min_subtotal_toman THEN
RAISE EXCEPTION 'sample_unavailable';
END IF;
v_sample_title := v_sample.title;
END IF;

IF p_coupon_code IS NOT NULL AND btrim(p_coupon_code) <> '' THEN
SELECT * INTO v_coupon FROM coupons WHERE code = upper(btrim(p_coupon_code)) FOR UPDATE;
IF NOT FOUND THEN
RAISE EXCEPTION 'coupon_invalid';
END IF;
v_discount := public.coupon_discount_toman(v_coupon, v_subtotal);
UPDATE coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
v_coupon_code := v_coupon.code;
END IF;

IF p_delivery_method = 'courier' THEN
v_fee := CASE WHEN v_subtotal >= v_store.courier_free_threshold_toman THEN 0 ELSE v_store.courier_fee_toman END;
ELSE
v_fee := v_store.post_fee_toman;
END IF;

UPDATE orders
SET subtotal_toman = v_subtotal,
discount_amount = v_discount,
coupon_code = v_coupon_code,
free_sample_title = v_sample_title,
delivery_fee_toman = v_fee,
total_toman = v_subtotal - v_discount + v_fee,
updated_at = now()
WHERE id = v_order_id;

RETURN v_order_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.place_order(uuid, text, jsonb, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, text, jsonb, text, text, text, uuid) TO authenticated;
