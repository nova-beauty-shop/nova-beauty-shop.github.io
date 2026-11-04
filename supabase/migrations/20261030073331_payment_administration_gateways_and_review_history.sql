/*
# Payment administration: gateway settings and receipt review history

1. New table
- `payment_gateways`: one row per online payment provider.
  - `provider` (text, primary key): lowercase identifier such as `online_gateway`.
  - `label` (text): name shown in the admin dashboard.
  - `mode` (text): `sandbox` (test) or `live`. Defaults to `sandbox`.
  - `updated_at` (timestamptz).
  - Secret keys are NOT stored here. They are kept as server-side secrets and are never readable from the browser.

2. Modified function
- `review_card_receipt`: approving or rejecting a receipt now also records a status history entry on the order (pending review to paid, or pending review to awaiting payment). Previously the history skipped this step.

3. New function (owner only)
- `admin_update_payment_gateway(p_provider, p_mode)`: changes the mode of a gateway. Validates the provider exists and the mode is allowed.

4. Security
- `payment_gateways`: RLS enabled. Only admins can read it. There are no direct write rights, so all changes go through the owner-only function.
- The new function is SECURITY DEFINER with a fixed search path, revoked from PUBLIC and anon, and granted to authenticated only. It checks the owner role first.
- No existing data is removed. The online gateway is seeded as disabled and is not used by checkout.
*/

CREATE TABLE IF NOT EXISTS payment_gateways (
  provider text PRIMARY KEY CHECK (provider ~ '^[a-z0-9_]{3,40}$'),
  label text NOT NULL CHECK (char_length(label) BETWEEN 2 AND 100),
  mode text NOT NULL DEFAULT 'sandbox' CHECK (mode IN ('sandbox', 'live')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON payment_gateways FROM anon;
GRANT SELECT ON payment_gateways TO authenticated;

DROP POLICY IF EXISTS "select_admin_gateways" ON payment_gateways;
CREATE POLICY "select_admin_gateways" ON payment_gateways FOR SELECT
  TO authenticated USING (is_admin());

INSERT INTO payment_gateways (provider, label, mode)
VALUES ('online_gateway', 'درگاه پرداخت آنلاین', 'sandbox')
ON CONFLICT (provider) DO NOTHING;

CREATE OR REPLACE FUNCTION admin_update_payment_gateway(p_provider text, p_mode text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_admin_role(), '') <> 'owner' THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_mode NOT IN ('sandbox', 'live') THEN
    RAISE EXCEPTION 'invalid_mode';
  END IF;

  UPDATE payment_gateways
  SET mode = p_mode, updated_at = now()
  WHERE provider = p_provider;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'gateway_not_found';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_update_payment_gateway(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_update_payment_gateway(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION review_card_receipt(p_receipt_id uuid, p_approve boolean, p_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_receipt payment_receipts%ROWTYPE;
  v_new_status text;
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

  v_new_status := CASE WHEN p_approve THEN 'paid' ELSE 'awaiting_payment' END;

  UPDATE orders
  SET status = v_new_status,
      updated_at = now()
  WHERE id = v_receipt.order_id AND status = 'pending_review';

  IF FOUND THEN
    INSERT INTO order_status_events (order_id, from_status, to_status, note, changed_by)
    VALUES (
      v_receipt.order_id,
      'pending_review',
      v_new_status,
      CASE WHEN p_approve THEN 'رسید کارت به کارت تأیید شد' ELSE 'رسید کارت به کارت رد شد' END,
      v_uid
    );
  END IF;
END;
$function$;
