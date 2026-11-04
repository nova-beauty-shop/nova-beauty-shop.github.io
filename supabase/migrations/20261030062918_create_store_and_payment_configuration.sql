/*
# Store, payment, and admin role configuration

1. Plain-English summary
- The store owner can now set business details, delivery fees, and card-to-card payment details from the admin dashboard.
- Card payment stays off until the owner enables it, and it can only be enabled after the bank card details are complete.
- Admin accounts now have a username and a role: owner, manager, or reviewer.

2. Tables
- `store_settings` (one row): store name, support phone, support email, address, courier fee, courier free-shipping threshold, post fee.
- `payment_settings` (one row, extended): adds account number, IBAN, customer notice, and the card payment on/off switch. Existing bank name, card number, cardholder, and instructions are kept.
- `admin_users` (extended): adds username and role.

3. Functions
- `current_admin_role()`: returns the caller's admin role, or nothing if the caller is not an admin.
- `admin_update_store_settings`, `admin_update_payment_settings`, `admin_update_bank_card`: owner or manager only. Every value is validated on the server.
- `place_order` and `submit_card_receipt`: now read fees from store settings and refuse card payments while they are switched off.

4. Security
- No client can write to the settings tables directly; changes go through the functions above.
- Store settings are public business information and are readable by anyone.
- Payment details are readable by signed-in users only.
- Admins can read order items so they can review transaction details.

5. Notes
- Defaults keep the previous fees (80,000 courier, free courier above 2,000,000, 50,000 post) so existing behaviour is unchanged.
*/

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS username text CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,30}$');
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'reviewer' CHECK (role IN ('owner', 'manager', 'reviewer'));
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_username_key ON admin_users (username) WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS store_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name text NOT NULL DEFAULT 'نُوا شاپ' CHECK (char_length(store_name) BETWEEN 2 AND 80),
  support_phone text NOT NULL DEFAULT '' CHECK (char_length(support_phone) <= 20),
  support_email text NOT NULL DEFAULT '' CHECK (char_length(support_email) <= 120),
  address text NOT NULL DEFAULT '' CHECK (char_length(address) <= 300),
  courier_fee_toman bigint NOT NULL DEFAULT 80000 CHECK (courier_fee_toman BETWEEN 0 AND 100000000),
  courier_free_threshold_toman bigint NOT NULL DEFAULT 2000000 CHECK (courier_free_threshold_toman BETWEEN 0 AND 1000000000),
  post_fee_toman bigint NOT NULL DEFAULT 50000 CHECK (post_fee_toman BETWEEN 0 AND 100000000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS account_number text NOT NULL DEFAULT '' CHECK (char_length(account_number) <= 30);
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS iban text NOT NULL DEFAULT '' CHECK (char_length(iban) <= 34);
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS payment_notice text NOT NULL DEFAULT '' CHECK (char_length(payment_notice) <= 500);
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS card_payment_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON store_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON store_settings TO anon, authenticated;

DROP POLICY IF EXISTS "select_store_settings" ON store_settings;
CREATE POLICY "select_store_settings" ON store_settings FOR SELECT
  TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.current_admin_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.admin_users WHERE user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.current_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_admin_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_store_settings(
  p_store_name text,
  p_support_phone text,
  p_support_email text,
  p_address text,
  p_courier_fee_toman bigint,
  p_courier_free_threshold_toman bigint,
  p_post_fee_toman bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := btrim(COALESCE(p_store_name, ''));
  v_phone text := btrim(COALESCE(p_support_phone, ''));
  v_email text := lower(btrim(COALESCE(p_support_email, '')));
  v_address text := btrim(COALESCE(p_address, ''));
BEGIN
  IF public.current_admin_role() IS NULL OR public.current_admin_role() NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF char_length(v_name) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION 'invalid_store_name';
  END IF;
  IF v_phone <> '' AND v_phone !~ '^[0-9+() -]{5,20}$' THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;
  IF v_email <> '' AND (char_length(v_email) > 120 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF char_length(v_address) > 300 THEN
    RAISE EXCEPTION 'invalid_address';
  END IF;
  IF p_courier_fee_toman IS NULL OR p_courier_fee_toman NOT BETWEEN 0 AND 100000000 THEN
    RAISE EXCEPTION 'invalid_fee';
  END IF;
  IF p_courier_free_threshold_toman IS NULL OR p_courier_free_threshold_toman NOT BETWEEN 0 AND 1000000000 THEN
    RAISE EXCEPTION 'invalid_fee';
  END IF;
  IF p_post_fee_toman IS NULL OR p_post_fee_toman NOT BETWEEN 0 AND 100000000 THEN
    RAISE EXCEPTION 'invalid_fee';
  END IF;

  UPDATE store_settings
  SET store_name = v_name,
      support_phone = v_phone,
      support_email = v_email,
      address = v_address,
      courier_fee_toman = p_courier_fee_toman,
      courier_free_threshold_toman = p_courier_free_threshold_toman,
      post_fee_toman = p_post_fee_toman,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_bank_card(
  p_bank_name text,
  p_card_number text,
  p_account_holder text,
  p_account_number text,
  p_iban text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank text := btrim(COALESCE(p_bank_name, ''));
  v_card text := regexp_replace(COALESCE(p_card_number, ''), '[\s-]', '', 'g');
  v_holder text := btrim(COALESCE(p_account_holder, ''));
  v_account text := regexp_replace(COALESCE(p_account_number, ''), '[\s-]', '', 'g');
  v_iban text := upper(regexp_replace(COALESCE(p_iban, ''), '\s', '', 'g'));
BEGIN
  IF public.current_admin_role() IS NULL OR public.current_admin_role() NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF char_length(v_bank) NOT BETWEEN 2 AND 60 THEN
    RAISE EXCEPTION 'invalid_bank_name';
  END IF;
  IF v_card !~ '^[0-9]{16}$' THEN
    RAISE EXCEPTION 'invalid_card_number';
  END IF;
  IF char_length(v_holder) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'invalid_account_holder';
  END IF;
  IF v_account <> '' AND v_account !~ '^[0-9]{5,30}$' THEN
    RAISE EXCEPTION 'invalid_account_number';
  END IF;
  IF v_iban <> '' AND v_iban !~ '^IR[0-9]{24}$' THEN
    RAISE EXCEPTION 'invalid_iban';
  END IF;

  UPDATE payment_settings
  SET bank_name = v_bank,
      card_number = v_card,
      account_holder = v_holder,
      account_number = v_account,
      iban = v_iban,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_payment_settings(
  p_enabled boolean,
  p_instructions text,
  p_notice text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instructions text := btrim(COALESCE(p_instructions, ''));
  v_notice text := btrim(COALESCE(p_notice, ''));
  v_current payment_settings%ROWTYPE;
BEGIN
  IF public.current_admin_role() IS NULL OR public.current_admin_role() NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_enabled IS NULL THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;
  IF char_length(v_instructions) > 1000 THEN
    RAISE EXCEPTION 'invalid_instructions';
  END IF;
  IF char_length(v_notice) > 500 THEN
    RAISE EXCEPTION 'invalid_notice';
  END IF;

  SELECT * INTO v_current FROM payment_settings WHERE id = 1;
  IF p_enabled AND (v_current.bank_name = '' OR v_current.card_number = '' OR v_current.account_holder = '') THEN
    RAISE EXCEPTION 'bank_card_incomplete';
  END IF;

  UPDATE payment_settings
  SET card_payment_enabled = p_enabled,
      instructions = v_instructions,
      payment_notice = v_notice,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_store_settings(text, text, text, text, bigint, bigint, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_store_settings(text, text, text, text, bigint, bigint, bigint) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_bank_card(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_bank_card(text, text, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_payment_settings(boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_settings(boolean, text, text) TO authenticated;

DROP POLICY IF EXISTS "select_admin_order_items" ON order_items;
CREATE POLICY "select_admin_order_items" ON order_items FOR SELECT
  TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.place_order(
  p_address_id uuid,
  p_delivery_method text,
  p_items jsonb,
  p_idempotency_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;

  SELECT * INTO v_address FROM addresses WHERE id = p_address_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'address_not_found';
  END IF;

  SELECT * INTO v_store FROM store_settings WHERE id = 1;

  INSERT INTO orders (
    user_id, idempotency_key, delivery_method,
    recipient_name, phone, province, city, street, postal_code
  ) VALUES (
    v_uid, p_idempotency_key, p_delivery_method,
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

  IF p_delivery_method = 'courier' THEN
    v_fee := CASE WHEN v_subtotal >= v_store.courier_free_threshold_toman THEN 0 ELSE v_store.courier_fee_toman END;
  ELSE
    v_fee := v_store.post_fee_toman;
  END IF;

  UPDATE orders
  SET subtotal_toman = v_subtotal,
      delivery_fee_toman = v_fee,
      total_toman = v_subtotal + v_fee,
      updated_at = now()
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_card_receipt(p_order_id uuid, p_storage_path text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order orders%ROWTYPE;
  v_receipt_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT (SELECT card_payment_enabled FROM payment_settings WHERE id = 1) THEN
    RAISE EXCEPTION 'payments_disabled';
  END IF;

  IF p_storage_path IS NULL OR split_part(p_storage_path, '/', 1) <> v_uid::text THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects WHERE bucket_id = 'payment-receipts' AND name = p_storage_path
  ) THEN
    RAISE EXCEPTION 'receipt_not_uploaded';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.status <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'order_not_payable';
  END IF;

  IF EXISTS (SELECT 1 FROM payment_receipts WHERE order_id = p_order_id AND status = 'pending') THEN
    RAISE EXCEPTION 'receipt_already_submitted';
  END IF;

  INSERT INTO payment_receipts (order_id, user_id, storage_path, amount_toman)
  VALUES (p_order_id, v_uid, p_storage_path, v_order.total_toman)
  RETURNING id INTO v_receipt_id;

  UPDATE orders SET status = 'pending_review', updated_at = now() WHERE id = p_order_id;

  RETURN v_receipt_id;
END;
$$;
