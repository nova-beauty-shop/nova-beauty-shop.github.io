ALTER TABLE orders
  ADD COLUMN payment_provider text NULL,
  ADD COLUMN payment_installments smallint NULL,
  ADD COLUMN payment_reference text NULL,
  ADD COLUMN paid_at timestamptz NULL,
  ADD CONSTRAINT orders_payment_provider_check CHECK (payment_provider IS NULL OR payment_provider ~ '^[a-z0-9_]{3,40}$'),
  ADD CONSTRAINT orders_payment_installments_check CHECK (payment_installments IS NULL OR payment_installments IN (1, 4)),
  ADD CONSTRAINT orders_payment_reference_check CHECK (payment_reference IS NULL OR char_length(payment_reference) <= 100);

ALTER TABLE payment_receipts
  ADD COLUMN payer_name text NULL,
  ADD COLUMN card_last4 text NULL,
  ADD COLUMN bank_name text NULL,
  ADD COLUMN tracking_code text NULL,
  ADD CONSTRAINT payment_receipts_payer_name_check CHECK (payer_name IS NULL OR char_length(payer_name) BETWEEN 2 AND 100),
  ADD CONSTRAINT payment_receipts_card_last4_check CHECK (card_last4 IS NULL OR card_last4 ~ '^[0-9]{4}$'),
  ADD CONSTRAINT payment_receipts_bank_name_check CHECK (bank_name IS NULL OR char_length(bank_name) <= 100),
  ADD CONSTRAINT payment_receipts_tracking_code_check CHECK (tracking_code IS NULL OR char_length(tracking_code) BETWEEN 3 AND 60);

INSERT INTO payment_gateways (provider, label, mode) VALUES
  ('zarinpal', 'زرین‌پال', 'sandbox'),
  ('sep', 'بانک سامان (SEP)', 'sandbox'),
  ('mellat', 'به‌پرداخت ملت', 'sandbox'),
  ('snapppay', 'اسنپ‌پی (خرید اقساطی)', 'sandbox')
ON CONFLICT (provider) DO NOTHING;

DROP FUNCTION IF EXISTS public.submit_card_receipt(uuid, text);

CREATE FUNCTION public.submit_card_receipt(
  p_order_id uuid,
  p_storage_path text,
  p_payer_name text,
  p_card_last4 text,
  p_bank_name text,
  p_tracking_code text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
v_uid uuid := auth.uid();
v_order orders%ROWTYPE;
v_receipt_id uuid;
v_payer text := NULLIF(trim(COALESCE(p_payer_name, '')), '');
v_bank text := NULLIF(trim(COALESCE(p_bank_name, '')), '');
v_tracking text := NULLIF(trim(COALESCE(p_tracking_code, '')), '');
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

IF v_payer IS NULL OR char_length(v_payer) > 100 OR v_tracking IS NULL OR char_length(v_tracking) > 60
  OR char_length(COALESCE(v_bank, '')) > 100 OR p_card_last4 IS NULL OR p_card_last4 !~ '^[0-9]{4}$' THEN
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

IF v_order.status <> 'awaiting_payment' OR v_order.payment_provider IS NOT NULL THEN
RAISE EXCEPTION 'order_not_payable';
END IF;

IF EXISTS (SELECT 1 FROM payment_receipts WHERE order_id = p_order_id AND status = 'pending') THEN
RAISE EXCEPTION 'receipt_already_submitted';
END IF;

INSERT INTO payment_receipts (order_id, user_id, storage_path, amount_toman, payer_name, card_last4, bank_name, tracking_code)
VALUES (p_order_id, v_uid, p_storage_path, v_order.total_toman, v_payer, p_card_last4, v_bank, v_tracking)
RETURNING id INTO v_receipt_id;

UPDATE orders SET status = 'pending_review', updated_at = now() WHERE id = p_order_id;

INSERT INTO order_status_events (order_id, from_status, to_status, note, changed_by)
VALUES (p_order_id, 'awaiting_payment', 'pending_review', 'رسید کارت به کارت ارسال شد', v_uid);

RETURN v_receipt_id;
END;
$function$;

CREATE FUNCTION public.start_online_payment(p_order_id uuid, p_provider text, p_installments smallint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
v_uid uuid := auth.uid();
v_order orders%ROWTYPE;
BEGIN
IF v_uid IS NULL THEN
RAISE EXCEPTION 'not_authenticated';
END IF;

IF NOT EXISTS (SELECT 1 FROM payment_gateways WHERE provider = p_provider) THEN
RAISE EXCEPTION 'gateway_not_found';
END IF;

IF p_installments NOT IN (1, 4) OR (p_installments = 4 AND p_provider <> 'snapppay') THEN
RAISE EXCEPTION 'invalid_request';
END IF;

SELECT * INTO v_order FROM orders WHERE id = p_order_id AND user_id = v_uid FOR UPDATE;
IF NOT FOUND THEN
RAISE EXCEPTION 'order_not_found';
END IF;

IF v_order.status <> 'awaiting_payment' THEN
RAISE EXCEPTION 'order_not_payable';
END IF;

UPDATE orders
SET payment_provider = p_provider, payment_installments = p_installments, updated_at = now()
WHERE id = p_order_id;
END;
$function$;

CREATE FUNCTION public.complete_online_payment(p_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
v_uid uuid := auth.uid();
v_order orders%ROWTYPE;
v_mode text;
v_reference text;
BEGIN
IF v_uid IS NULL THEN
RAISE EXCEPTION 'not_authenticated';
END IF;

SELECT * INTO v_order FROM orders WHERE id = p_order_id AND user_id = v_uid FOR UPDATE;
IF NOT FOUND THEN
RAISE EXCEPTION 'order_not_found';
END IF;

IF v_order.status <> 'awaiting_payment' OR v_order.payment_provider IS NULL THEN
RAISE EXCEPTION 'order_not_payable';
END IF;

SELECT mode INTO v_mode FROM payment_gateways WHERE provider = v_order.payment_provider;
IF v_mode IS DISTINCT FROM 'sandbox' THEN
RAISE EXCEPTION 'gateway_not_available';
END IF;

v_reference := 'SIM' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));

UPDATE orders
SET status = 'paid', payment_reference = v_reference, paid_at = now(), updated_at = now()
WHERE id = p_order_id;

INSERT INTO order_status_events (order_id, from_status, to_status, note, changed_by)
VALUES (p_order_id, 'awaiting_payment', 'paid', 'پرداخت آنلاین موفق - کد پیگیری ' || v_reference, v_uid);

RETURN v_reference;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.submit_card_receipt(uuid, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_online_payment(uuid, text, smallint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_online_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_card_receipt(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_online_payment(uuid, text, smallint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_online_payment(uuid) TO authenticated;
