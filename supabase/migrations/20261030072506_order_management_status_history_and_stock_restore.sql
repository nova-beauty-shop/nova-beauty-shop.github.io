/*
# Order management: statuses, tracking, history, and stock restore

1. Plain-English summary
- Orders can now move through preparing and refunded in addition to the existing statuses.
- Store staff can record a shipping tracking code and delivery notes on each order.
- Every status change is written to a history log with who changed it and when.
- Cancelling or refunding an order returns its reserved stock to the products.

2. Changes to orders
- The status list now includes `preparing` and `refunded`.
- New columns: `tracking_code` (text, optional), `delivery_note` (text, optional), `cancelled_at` and `refunded_at` (timestamps, optional).

3. New table
- `order_status_events`: one row per status change with the previous status, new status, note, and the admin who made the change.

4. New function
- `admin_update_order_status(order, new status, note, tracking code)`: owner or manager only. Validates the status and the transition, updates the order, writes a history row, and restores stock when moving into cancelled or refunded from an active status.

5. Security
- Row level security is enabled on the history table. Admins can read it; nobody can write to it directly.
- The status function is callable only by signed-in users and checks the admin role on every call.
- No data is removed. Existing orders keep their status and items.
*/

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'awaiting_payment', 'pending_review', 'paid', 'processing', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded'
));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code text CHECK (tracking_code IS NULL OR char_length(tracking_code) BETWEEN 3 AND 60);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_note text CHECK (delivery_note IS NULL OR char_length(delivery_note) <= 500);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

CREATE TABLE IF NOT EXISTS order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_status_events_order_idx ON order_status_events (order_id, created_at DESC);

ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON order_status_events FROM PUBLIC, anon;
GRANT SELECT ON order_status_events TO authenticated;

DROP POLICY IF EXISTS "select_admin_order_events" ON order_status_events;
CREATE POLICY "select_admin_order_events" ON order_status_events FOR SELECT
  TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_note text DEFAULT NULL,
  p_tracking_code text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order orders%ROWTYPE;
  v_note text := NULLIF(btrim(COALESCE(p_note, '')), '');
  v_tracking text := NULLIF(btrim(COALESCE(p_tracking_code, '')), '');
  v_restock boolean;
  v_item record;
  v_allowed text[];
BEGIN
  IF public.current_admin_role() IS NULL OR public.current_admin_role() NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_new_status NOT IN ('processing', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  IF v_note IS NOT NULL AND char_length(v_note) > 500 THEN
    RAISE EXCEPTION 'invalid_note';
  END IF;
  IF v_tracking IS NOT NULL AND (char_length(v_tracking) < 3 OR char_length(v_tracking) > 60) THEN
    RAISE EXCEPTION 'invalid_tracking_code';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  v_allowed := CASE v_order.status
    WHEN 'paid' THEN ARRAY['processing', 'cancelled', 'refunded']
    WHEN 'processing' THEN ARRAY['preparing', 'cancelled', 'refunded']
    WHEN 'preparing' THEN ARRAY['shipped', 'cancelled', 'refunded']
    WHEN 'shipped' THEN ARRAY['delivered', 'refunded']
    WHEN 'delivered' THEN ARRAY['refunded']
    WHEN 'cancelled' THEN ARRAY[]::text[]
    WHEN 'refunded' THEN ARRAY[]::text[]
    ELSE ARRAY[]::text[]
  END;

  IF NOT (p_new_status = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  IF p_new_status = 'shipped' AND v_tracking IS NULL AND v_order.tracking_code IS NULL THEN
    RAISE EXCEPTION 'tracking_code_required';
  END IF;

  v_restock := p_new_status IN ('cancelled', 'refunded') AND v_order.status NOT IN ('cancelled', 'refunded');

  IF v_restock THEN
    FOR v_item IN SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id AND product_id IS NOT NULL LOOP
      UPDATE products SET stock = stock + v_item.quantity WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  UPDATE orders
  SET status = p_new_status,
      tracking_code = COALESCE(v_tracking, tracking_code),
      delivery_note = COALESCE(v_note, delivery_note),
      cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN now() ELSE cancelled_at END,
      refunded_at = CASE WHEN p_new_status = 'refunded' THEN now() ELSE refunded_at END,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO order_status_events (order_id, from_status, to_status, note, changed_by)
  VALUES (p_order_id, v_order.status, p_new_status, v_note, v_uid);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text, text) TO authenticated;
