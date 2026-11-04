/*
# Enforce the card payment switch on receipt submission

1. Plain-English summary
- When the store turns off card-to-card payment in settings, the server now refuses new receipt uploads, not only the checkout screen.

2. Changes
- Replaces submit_card_receipt with the same signature and checks, adding one check against payment_settings.

3. Security
- Same owner check, fixed search path, and EXECUTE restricted to signed-in users.
*/

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

  IF NOT EXISTS (SELECT 1 FROM payment_settings WHERE id = 1 AND card_payment_enabled) THEN
    RAISE EXCEPTION 'card_payment_disabled';
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

  INSERT INTO order_status_events (order_id, from_status, to_status, note, changed_by)
  VALUES (p_order_id, 'awaiting_payment', 'pending_review', 'رسید کارت به کارت ارسال شد', v_uid);

  RETURN v_receipt_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_card_receipt(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_card_receipt(uuid, text) TO authenticated;
