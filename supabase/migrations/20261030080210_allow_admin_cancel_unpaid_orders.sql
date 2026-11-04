/*
# Allow admins to cancel unpaid orders

1. Plain-English summary
- Admins can now cancel orders that are still awaiting payment or pending receipt review.
- Cancelling returns the reserved stock to the products, as cancelling any other active order already does.
- Any open card receipt on a cancelled order is rejected so it cannot later mark the order paid.

2. Changes
- Replaces admin_update_order_status with the same signature and checks, extending only the transition map and the receipt handling.

3. Security
- Still owner or manager only, fixed search path, EXECUTE revoked from PUBLIC and anon.
*/

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
    WHEN 'awaiting_payment' THEN ARRAY['cancelled']::text[]
    WHEN 'pending_review' THEN ARRAY['cancelled']::text[]
    WHEN 'paid' THEN ARRAY['processing', 'cancelled', 'refunded']
    WHEN 'processing' THEN ARRAY['preparing', 'cancelled', 'refunded']
    WHEN 'preparing' THEN ARRAY['shipped', 'cancelled', 'refunded']
    WHEN 'shipped' THEN ARRAY['delivered', 'refunded']
    WHEN 'delivered' THEN ARRAY['refunded']
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

  IF p_new_status = 'cancelled' AND v_order.status = 'pending_review' THEN
    UPDATE payment_receipts
    SET status = 'rejected',
        review_note = 'سفارش توسط مدیر لغو شد',
        reviewed_at = now(),
        reviewed_by = v_uid
    WHERE order_id = p_order_id AND status = 'pending';
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
