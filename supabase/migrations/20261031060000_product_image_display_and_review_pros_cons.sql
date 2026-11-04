/*
# Product image display controls and review strengths/weaknesses

## Summary
Adds the remaining storefront styling columns used by the product card and the product page.
Nothing existing is removed or changed in behaviour; every new column has a safe default.

## 1. Changes to existing tables
- `products`:
  - `image_fit` (`cover` fills the frame, `contain` shows the whole picture; default `cover`)
  - `image_scale` (picture zoom in percent, 50 to 150; default 100)
  - `image_angle` (picture tilt in degrees, -45 to 45; default 0)
- `reviews`:
  - `pros` (list of short strengths the reviewer mentioned)
  - `cons` (list of short weaknesses the reviewer mentioned)

## 2. Security
- No policy or grant changes are needed: both tables already have table level grants and row level
  security, so the new columns follow the existing rules (shoppers read, content managers write).

## 3. Important notes
1. The `variants` column keeps its shape. Colour and size options add two optional keys inside each
   option (`kind` and `color_hex`); order placement only reads `id`, `label` and `price_delta`, so it
   is not affected.
2. Column constraints keep stored values inside the allowed range so bad data cannot be saved.
*/

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_fit text NOT NULL DEFAULT 'cover';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_scale integer NOT NULL DEFAULT 100;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_angle integer NOT NULL DEFAULT 0;

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS pros text[] NOT NULL DEFAULT '{}';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS cons text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_image_fit_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_image_fit_check CHECK (image_fit IN ('cover', 'contain'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_image_scale_range') THEN
    ALTER TABLE products ADD CONSTRAINT products_image_scale_range CHECK (image_scale BETWEEN 50 AND 150);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_image_angle_range') THEN
    ALTER TABLE products ADD CONSTRAINT products_image_angle_range CHECK (image_angle BETWEEN -45 AND 45);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_pros_size') THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_pros_size
      CHECK (cardinality(pros) <= 6 AND char_length(array_to_string(pros, '')) <= 600);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_cons_size') THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_cons_size
      CHECK (cardinality(cons) <= 6 AND char_length(array_to_string(cons, '')) <= 600);
  END IF;
END $$;
