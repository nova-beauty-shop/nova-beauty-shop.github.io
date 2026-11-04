/*
# Admin dashboard stats and private product cost prices

## Summary
Adds a private cost price for each product so the store can calculate net profit, and a single admin-only function that returns every number the dashboard needs in one request.

## 1. New tables
- `product_costs`: one row per product holding the purchase cost in toman. Not exposed to shoppers.
  - `product_id` (uuid, primary key, references products, deleted with the product)
  - `cost_price_toman` (bigint, 0 to 1,000,000,000)
  - `updated_at` (timestamp)

## 2. New functions
- `admin_dashboard_stats(p_days)`: returns a JSON object with sales, cost, net profit, order counts, pending shipments, pending payment receipts, low stock products, a daily sales series and the latest orders. Sales are counted for orders in the paid, processing, preparing, shipped or delivered state, using the goods subtotal (delivery fees excluded). The period is limited to 7 to 365 days and days are counted in Tehran time.

## 3. Security
- `product_costs` has row level security enabled. Only signed-in administrators (checked with `is_admin()`) can read or write it. Anonymous visitors and regular customers have no access.
- Separate select, insert, update and delete policies are used.
- `admin_dashboard_stats` checks `is_admin()` before reading anything, is revoked from PUBLIC and anon, and is executable only by signed-in users, who are rejected unless they are administrators.

## Important notes
1. Cost is read from the current cost of each product, not a snapshot at purchase time. Changing a cost changes past profit figures.
2. Products with no recorded cost count as zero cost and are reported separately so the dashboard can warn about them.
3. Nothing existing is dropped or changed.
*/

CREATE TABLE IF NOT EXISTS product_costs (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  cost_price_toman bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_costs_cost_price_range'
  ) THEN
    ALTER TABLE product_costs
      ADD CONSTRAINT product_costs_cost_price_range CHECK (cost_price_toman BETWEEN 0 AND 1000000000);
  END IF;
END $$;

ALTER TABLE product_costs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON product_costs TO authenticated;

DROP POLICY IF EXISTS "admin_select_product_costs" ON product_costs;
CREATE POLICY "admin_select_product_costs" ON product_costs FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_insert_product_costs" ON product_costs;
CREATE POLICY "admin_insert_product_costs" ON product_costs FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_product_costs" ON product_costs;
CREATE POLICY "admin_update_product_costs" ON product_costs FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_product_costs" ON product_costs;
CREATE POLICY "admin_delete_product_costs" ON product_costs FOR DELETE
  TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_days integer := LEAST(GREATEST(COALESCE(p_days, 30), 7), 365);
  v_today date := (now() AT TIME ZONE 'Asia/Tehran')::date;
  v_start date := v_today - (v_days - 1);
  v_since timestamptz := v_start::timestamp AT TIME ZONE 'Asia/Tehran';
  v_revenue_statuses text[] := ARRAY['paid', 'processing', 'preparing', 'shipped', 'delivered'];
  v_sales numeric;
  v_cost numeric;
  v_orders bigint;
  v_pending_shipments bigint;
  v_pending_receipts bigint;
  v_low_stock_count bigint;
  v_missing_cost_count bigint;
  v_low_stock jsonb;
  v_series jsonb;
  v_latest jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT COALESCE(SUM(o.subtotal_toman), 0), COUNT(*)
  INTO v_sales, v_orders
  FROM orders o
  WHERE o.status = ANY (v_revenue_statuses) AND o.created_at >= v_since;

  SELECT COALESCE(SUM(oi.quantity * COALESCE(pc.cost_price_toman, 0)), 0)
  INTO v_cost
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  LEFT JOIN product_costs pc ON pc.product_id = oi.product_id
  WHERE o.status = ANY (v_revenue_statuses) AND o.created_at >= v_since;

  SELECT COUNT(*) INTO v_pending_shipments
  FROM orders
  WHERE status IN ('paid', 'processing', 'preparing');

  SELECT COUNT(*) INTO v_pending_receipts
  FROM payment_receipts
  WHERE status = 'pending';

  SELECT COUNT(*) INTO v_low_stock_count
  FROM products
  WHERE is_active AND stock < 5;

  SELECT COUNT(*) INTO v_missing_cost_count
  FROM products p
  WHERE p.is_active AND NOT EXISTS (SELECT 1 FROM product_costs pc WHERE pc.product_id = p.id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'stock', s.stock) ORDER BY s.stock, s.name), '[]'::jsonb)
  INTO v_low_stock
  FROM (
    SELECT id, name, stock FROM products
    WHERE is_active AND stock < 5
    ORDER BY stock, name
    LIMIT 8
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'day', to_char(d.day, 'YYYY-MM-DD'),
    'sales', COALESCE(s.sales, 0),
    'orders', COALESCE(s.orders, 0)
  ) ORDER BY d.day), '[]'::jsonb)
  INTO v_series
  FROM (SELECT v_start + g AS day FROM generate_series(0, v_days - 1) AS g) d
  LEFT JOIN (
    SELECT (o.created_at AT TIME ZONE 'Asia/Tehran')::date AS day,
           SUM(o.subtotal_toman) AS sales,
           COUNT(*) AS orders
    FROM orders o
    WHERE o.status = ANY (v_revenue_statuses) AND o.created_at >= v_since
    GROUP BY 1
  ) s ON s.day = d.day;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'order_number', l.order_number,
    'recipient_name', l.recipient_name,
    'total_toman', l.total_toman,
    'status', l.status,
    'created_at', l.created_at
  ) ORDER BY l.created_at DESC), '[]'::jsonb)
  INTO v_latest
  FROM (
    SELECT id, order_number, recipient_name, total_toman, status, created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 6
  ) l;

  RETURN jsonb_build_object(
    'days', v_days,
    'sales_toman', v_sales,
    'cost_toman', v_cost,
    'net_profit_toman', v_sales - v_cost,
    'orders_count', v_orders,
    'pending_shipments', v_pending_shipments,
    'pending_receipts', v_pending_receipts,
    'low_stock_count', v_low_stock_count,
    'missing_cost_count', v_missing_cost_count,
    'low_stock', v_low_stock,
    'series', v_series,
    'latest_orders', v_latest
  );
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.admin_dashboard_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats(integer) TO authenticated;
