/*
# Customer management: block flag, internal notes, admin customer RPCs

1. Modified tables
- `profiles`
  - `is_blocked` (boolean, default false): when true the customer cannot place new orders.
  - `admin_note` (text, up to 1000 characters): internal note visible only to admins.

2. New functions (admin only)
- `admin_list_customers(p_search, p_offset, p_limit)`: paged customer list with email, order count and total spent (orders that were not cancelled or refunded).
- `admin_get_customer(p_customer_id)`: one customer with the same stats plus the internal note.
- `admin_update_customer(p_customer_id, p_blocked, p_note)`: owner or manager only. Updates the block flag and internal note.

3. Trigger
- `prevent_blocked_customer_orders` on `orders`: rejects inserts for a blocked customer with the error code `account_blocked`.

4. Security
- Customers keep their existing column-level update rights on `profiles` (full name and phone only), so they cannot change the block flag or note.
- The three admin functions check admin rights first, are SECURITY DEFINER with a fixed search path, are revoked from PUBLIC and anon, and are granted to authenticated only.

5. Notes
- Existing data is not changed. Both new columns start with safe defaults.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_note text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_admin_note_length' AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_admin_note_length CHECK (admin_note IS NULL OR char_length(admin_note) <= 1000);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION admin_list_customers(p_search text, p_offset integer, p_limit integer)
RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_blocked boolean,
  customer_created_at timestamptz,
  order_count bigint,
  total_spent bigint,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_term text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_term := replace(replace(replace(left(trim(coalesce(p_search, '')), 60), '\', '\\'), '%', '\%'), '_', '\_');

  RETURN QUERY
  WITH base AS (
    SELECT p.id, p.full_name, p.phone, u.email::text AS email, p.is_blocked, p.created_at
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE v_term = ''
      OR p.full_name ILIKE '%' || v_term || '%'
      OR p.phone ILIKE '%' || v_term || '%'
      OR u.email ILIKE '%' || v_term || '%'
  )
  SELECT
    b.id,
    b.full_name,
    b.phone,
    b.email,
    b.is_blocked,
    b.created_at,
    (SELECT count(*) FROM orders o WHERE o.user_id = b.id)::bigint,
    (SELECT coalesce(sum(o.total_toman), 0) FROM orders o WHERE o.user_id = b.id AND o.status NOT IN ('cancelled', 'refunded'))::bigint,
    count(*) OVER ()::bigint
  FROM base b
  ORDER BY b.created_at DESC
  OFFSET greatest(p_offset, 0)
  LIMIT least(greatest(p_limit, 1), 50);
END;
$$;

CREATE OR REPLACE FUNCTION admin_get_customer(p_customer_id uuid)
RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_blocked boolean,
  customer_note text,
  customer_created_at timestamptz,
  order_count bigint,
  total_spent bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.phone,
    u.email::text,
    p.is_blocked,
    p.admin_note,
    p.created_at,
    (SELECT count(*) FROM orders o WHERE o.user_id = p.id)::bigint,
    (SELECT coalesce(sum(o.total_toman), 0) FROM orders o WHERE o.user_id = p.id AND o.status NOT IN ('cancelled', 'refunded'))::bigint
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = p_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_customer(p_customer_id uuid, p_blocked boolean, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_note text;
BEGIN
  v_role := current_admin_role();
  IF v_role IS NULL OR v_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_note := nullif(trim(coalesce(p_note, '')), '');
  IF v_note IS NOT NULL AND char_length(v_note) > 1000 THEN
    RAISE EXCEPTION 'invalid_note';
  END IF;

  UPDATE profiles
  SET is_blocked = coalesce(p_blocked, false),
      admin_note = v_note,
      updated_at = now()
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer_not_found';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_list_customers(text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION admin_get_customer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION admin_update_customer(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_list_customers(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_customer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_customer(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION prevent_blocked_customer_orders()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.user_id AND is_blocked) THEN
    RAISE EXCEPTION 'account_blocked';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_blocked_customer_orders ON orders;
CREATE TRIGGER trg_prevent_blocked_customer_orders
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION prevent_blocked_customer_orders();
