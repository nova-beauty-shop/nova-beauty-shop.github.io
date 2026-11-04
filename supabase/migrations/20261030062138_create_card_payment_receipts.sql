/*
# Card-to-card payments with receipt review

1. Plain-English summary
- The store has one bank card that customers transfer money to.
- After placing an order, the customer uploads a photo or scan of the transfer receipt.
- The order moves to "pending review". Only an admin can approve it (order becomes paid) or reject it (customer is asked to upload again).
- Receipt images are stored in a private bucket. Only the customer who uploaded it and admins can view them.

2. New tables
- `payment_settings`: single row with the bank name, card number, account holder, and instructions shown at checkout. Starts empty and must be filled in by the store owner.
- `payment_receipts`: one row per uploaded receipt, linked to an order, with status pending, approved, or rejected, plus review note and reviewer.

3. New storage
- Private bucket `payment-receipts`: JPEG, PNG, or WebP only, 5 MB maximum per file.

4. New functions
- `submit_card_receipt(order, storage path)`: checks the caller owns the order, the order is awaiting payment, the file exists in the caller's own folder, and no receipt is already pending. Creates the receipt and moves the order to pending review.
- `review_card_receipt(receipt, approve, note)`: admin only. Approving marks the order paid; rejecting returns it to awaiting payment.

5. Security
- Row-level security is enabled on every new table.
- Customers can read only their own receipts; admins can read all receipts and all orders.
- Customers cannot write receipts or change order status directly; only the functions above can.
- Receipt files can be read only by their uploader or an admin.
- Both functions have a fixed search path and are not callable by anonymous visitors.

6. Notes
- Payment settings are readable by signed-in customers only.
- Admin accounts are still managed in the admin_users table.
*/

CREATE TABLE IF NOT EXISTS payment_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bank_name text NOT NULL DEFAULT '',
  card_number text NOT NULL DEFAULT '',
  account_holder text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO payment_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL CHECK (char_length(storage_path) BETWEEN 3 AND 300),
  amount_toman bigint NOT NULL CHECK (amount_toman >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS payment_receipts_order_idx ON payment_receipts (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_receipts_pending_idx ON payment_receipts (created_at) WHERE status = 'pending';

ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON payment_settings, payment_receipts FROM PUBLIC, anon;
GRANT SELECT ON payment_settings TO authenticated;
GRANT SELECT ON payment_receipts TO authenticated;

DROP POLICY IF EXISTS "select_payment_settings" ON payment_settings;
CREATE POLICY "select_payment_settings" ON payment_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "select_own_receipts" ON payment_receipts;
CREATE POLICY "select_own_receipts" ON payment_receipts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_admin_receipts" ON payment_receipts;
CREATE POLICY "select_admin_receipts" ON payment_receipts FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "select_admin_orders" ON orders;
CREATE POLICY "select_admin_orders" ON orders FOR SELECT
  TO authenticated USING (public.is_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-receipts', 'payment-receipts', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "receipts_insert_own_folder" ON storage.objects;
CREATE POLICY "receipts_insert_own_folder" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "receipts_select_own_or_admin" ON storage.objects;
CREATE POLICY "receipts_select_own_or_admin" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

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

CREATE OR REPLACE FUNCTION public.review_card_receipt(p_receipt_id uuid, p_approve boolean, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_receipt payment_receipts%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_note IS NOT NULL AND char_length(p_note) > 500 THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;

  SELECT * INTO v_receipt FROM payment_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'receipt_not_found';
  END IF;

  IF v_receipt.status <> 'pending' THEN
    RAISE EXCEPTION 'receipt_already_reviewed';
  END IF;

  UPDATE payment_receipts
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      review_note = NULLIF(trim(COALESCE(p_note, '')), ''),
      reviewed_at = now(),
      reviewed_by = v_uid
  WHERE id = p_receipt_id;

  UPDATE orders
  SET status = CASE WHEN p_approve THEN 'paid' ELSE 'awaiting_payment' END,
      updated_at = now()
  WHERE id = v_receipt.order_id AND status = 'pending_review';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_card_receipt(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_card_receipt(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.review_card_receipt(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_card_receipt(uuid, boolean, text) TO authenticated;
