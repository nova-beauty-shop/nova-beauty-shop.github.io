/*
# Product price history

## Plain-English summary
Records every change of a product's price so the product page can draw a real price-history chart.
Nothing is invented: history starts from the price each product has when this migration runs.

## New objects
- `product_price_history`: one row per recorded price (product, price, reference price, time).
- `record_product_price()`: trigger function that adds a row on insert and whenever the price changes.

## Security
- Anyone may read the history (prices are public). Nobody can write it from the client; only the trigger does.
- The trigger function cannot be executed directly by clients.
*/

CREATE TABLE IF NOT EXISTS public.product_price_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price_toman bigint NOT NULL CHECK (price_toman >= 0),
  compare_at_toman bigint,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_price_history_product_idx
  ON public.product_price_history (product_id, recorded_at);

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_price_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.product_price_history TO anon, authenticated;

DROP POLICY IF EXISTS "price_history_public_read" ON public.product_price_history;
CREATE POLICY "price_history_public_read" ON public.product_price_history
  FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.record_product_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.price_toman IS DISTINCT FROM OLD.price_toman THEN
    INSERT INTO public.product_price_history (product_id, price_toman, compare_at_toman)
    VALUES (NEW.id, NEW.price_toman, NEW.compare_at_toman);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_product_price() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS product_price_history_trigger ON public.products;
CREATE TRIGGER product_price_history_trigger
  AFTER INSERT OR UPDATE OF price_toman ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.record_product_price();

INSERT INTO public.product_price_history (product_id, price_toman, compare_at_toman)
SELECT p.id, p.price_toman, p.compare_at_toman
FROM public.products p
WHERE NOT EXISTS (SELECT 1 FROM public.product_price_history h WHERE h.product_id = p.id);
