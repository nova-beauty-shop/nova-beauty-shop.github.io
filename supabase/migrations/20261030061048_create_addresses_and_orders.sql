/*
# Saved addresses, orders, and server-side order placement

1. Plain-English summary
- Customers can save delivery addresses to their account.
- Placing an order happens in one server function. It reads prices and stock from the product records, never from the browser, so the total cannot be changed by a visitor.
- Repeated submissions with the same key return the existing order instead of charging twice.
- Each order keeps a copy of its address and item details, so later edits to products or addresses do not change past orders.

2. New tables
- `addresses`: saved delivery addresses per customer (recipient, phone, province, city, street, postal code).
- `orders`: one row per order with status, delivery method, fee, subtotal, total, and a copy of the delivery address.
- `order_items`: the products in each order with a copy of name, variant, unit price, and quantity.

3. New function
- `place_order(address, delivery method, items, idempotency key)`: validates the address, locks each product, checks stock, recalculates prices and delivery fee, decreases stock, and creates the order. It runs as one transaction, so any failure leaves nothing behind.

4. Security
- Row-level security is enabled on all three tables.
- Customers can read and add their own addresses, and delete their own addresses. They cannot edit addresses; the ownership column is filled by the database.
- Customers can read only their own orders and their items. They cannot insert, update, or delete orders directly.
- `place_order` is callable only by signed-in customers.

5. Notes
- Delivery fee rules used here: courier is free from 2,000,000 toman subtotal and 80,000 toman otherwise; post is a flat 50,000 toman. These values are placeholders to confirm.
- Stock is reserved when an order is placed. Cancelling an order later must return stock.
*/

CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name text NOT NULL CHECK (char_length(recipient_name) BETWEEN 2 AND 100),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 5 AND 20),
  province text NOT NULL CHECK (char_length(province) BETWEEN 2 AND 60),
  city text NOT NULL CHECK (char_length(city) BETWEEN 2 AND 60),
  street text NOT NULL CHECK (char_length(street) BETWEEN 5 AND 300),
  postal_code text NOT NULL CHECK (postal_code ~ '^[0-9]{10}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON addresses (user_id);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT 'NV-' || to_char(now() AT TIME ZONE 'UTC', 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 100),
  status text NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN ('awaiting_payment', 'pending_review', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
  delivery_method text NOT NULL CHECK (delivery_method IN ('courier', 'post')),
  recipient_name text NOT NULL,
  phone text NOT NULL,
  province text NOT NULL,
  city text NOT NULL,
  street text NOT NULL,
  postal_code text NOT NULL,
  subtotal_toman bigint NOT NULL DEFAULT 0 CHECK (subtotal_toman >= 0),
  delivery_fee_toman bigint NOT NULL DEFAULT 0 CHECK (delivery_fee_toman >= 0),
  total_toman bigint NOT NULL DEFAULT 0 CHECK (total_toman >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS orders_user_id_created_idx ON orders (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  brand text NOT NULL DEFAULT '',
  variant_id text NOT NULL,
  variant_label text,
  unit_price_toman bigint NOT NULL CHECK (unit_price_toman >= 0),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  line_total_toman bigint NOT NULL CHECK (line_total_toman >= 0)
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON addresses, orders, order_items FROM PUBLIC, anon;

GRANT SELECT, DELETE ON addresses TO authenticated;
GRANT INSERT (recipient_name, phone, province, city, street, postal_code) ON addresses TO authenticated;
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON order_items TO authenticated;

DROP POLICY IF EXISTS "select_own_addresses" ON addresses;
CREATE POLICY "select_own_addresses" ON addresses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_addresses" ON addresses;
CREATE POLICY "insert_own_addresses" ON addresses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_addresses" ON addresses;
CREATE POLICY "delete_own_addresses" ON addresses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_own_orders" ON orders;
CREATE POLICY "select_own_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_own_order_items" ON order_items;
CREATE POLICY "select_own_order_items" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

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
    v_fee := CASE WHEN v_subtotal >= 2000000 THEN 0 ELSE 80000 END;
  ELSE
    v_fee := 50000;
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

REVOKE EXECUTE ON FUNCTION public.place_order(uuid, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, text, jsonb, text) TO authenticated;
