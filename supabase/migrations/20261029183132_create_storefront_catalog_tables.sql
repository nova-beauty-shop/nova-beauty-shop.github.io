/*
# Create storefront catalog tables

Plain-English summary: adds the tables that power the Nova Shop storefront, namely product categories, products, customer reviews, Instagram-style stories and promotional banners. Visitors can read published content. Nothing on the public site can change this data yet; admin write access will be added with the admin dashboard.

1. New Tables
- `categories`: shop categories (name, description, image, display order, visibility).
- `products`: full product records (names, brand, descriptions, ingredients, usage, toman prices, discount reference price, stock, rating, images, variant options, bestseller/new flags, visibility).
- `reviews`: customer reviews attached to a product (author, 1 to 5 rating, text, publish flag).
- `stories`: story circles on the home page (title, image or video, optional link, order, visibility).
- `banners`: hero and promotional banners (texts, button label and link, image, placement, order, visibility).

2. Security
- Row level security is enabled on every table.
- The public (anon and signed-in) roles can only SELECT rows that are marked active or published.
- No INSERT, UPDATE or DELETE grants are given to the public roles.

3. Important notes
- Prices are whole Iranian toman stored as bigint.
- `variants` is a JSON list of options with a toman price delta added to the base price.
- Indexes are added on foreign keys used for product and review lookups.
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  brand text NOT NULL DEFAULT '',
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  short_description text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  ingredients text NOT NULL DEFAULT '',
  usage_instructions text NOT NULL DEFAULT '',
  price_toman bigint NOT NULL CHECK (price_toman >= 0),
  compare_at_toman bigint CHECK (compare_at_toman IS NULL OR compare_at_toman >= price_toman),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  rating numeric(2,1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  images text[] NOT NULL DEFAULT '{}',
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_bestseller boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_category_id_idx ON products (category_id);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, author_name)
);

CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON reviews (product_id);

CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL UNIQUE,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  media_url text NOT NULL,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL UNIQUE,
  placement text NOT NULL DEFAULT 'promo' CHECK (placement IN ('hero', 'promo')),
  eyebrow text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  cta_label text NOT NULL DEFAULT '',
  cta_url text NOT NULL DEFAULT '/shop',
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON categories, products, reviews, stories, banners TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_active_categories" ON categories;
CREATE POLICY "public_read_active_categories" ON categories FOR SELECT
  TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "public_read_active_products" ON products;
CREATE POLICY "public_read_active_products" ON products FOR SELECT
  TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "public_read_published_reviews" ON reviews;
CREATE POLICY "public_read_published_reviews" ON reviews FOR SELECT
  TO anon, authenticated USING (is_published);

DROP POLICY IF EXISTS "public_read_active_stories" ON stories;
CREATE POLICY "public_read_active_stories" ON stories FOR SELECT
  TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "public_read_active_banners" ON banners;
CREATE POLICY "public_read_active_banners" ON banners FOR SELECT
  TO anon, authenticated USING (is_active);
