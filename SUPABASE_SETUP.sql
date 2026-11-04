-- Nova Shop database setup for a NEW Supabase project
-- Generated from the project's 27 migrations in chronological filename order.
-- Run this entire file once in Supabase Dashboard > SQL Editor > New query.
-- Do not run on a project that already has these tables/migrations.


-- =====================================================================
-- Migration: 20261029183132_create_storefront_catalog_tables.sql
-- =====================================================================
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


-- =====================================================================
-- Migration: 20261029183236_seed_storefront_sample_catalog.sql
-- =====================================================================
/*
# Seed Nova Shop sample catalog

Plain-English summary: fills the storefront with realistic sample content so the store looks complete before real products are entered. It adds 4 categories, 15 cosmetics products in Persian with toman prices, stock levels (including a few low-stock and one out-of-stock item), 30 customer reviews, 6 story circles and 3 banners (1 hero and 2 promotional).

1. Data added
- categories: skincare, makeup, fragrance, hair-and-body
- products: 15 items linked to categories
- reviews: 2 published reviews per product
- stories: 6 image stories with links to shop categories
- banners: 1 hero banner and 2 promotional banners

2. Safety
- Every insert uses ON CONFLICT DO NOTHING, so re-running this migration never duplicates rows or overwrites edits made later.
- No table structure or security settings are changed.

3. Notes
- Sample data should be edited or removed from the admin dashboard before launch.
*/

INSERT INTO categories (slug, name, description, image_url, sort_order) VALUES
('skincare', 'مراقبت از پوست', 'سرم‌ها، کرم‌ها و ژل‌هایی که پوستی درخشان و آرام برای هر روز شما می‌سازند.', 'https://images.pexels.com/photos/7670764/pexels-photo-7670764.jpeg?auto=compress&cs=tinysrgb&w=900', 1),
('makeup', 'آرایش', 'رژ لب‌ها، هایلایتر و رنگ‌هایی با بافتی مخملی و لایه‌ای ظریف.', 'https://images.pexels.com/photos/12606876/pexels-photo-12606876.jpeg?auto=compress&cs=tinysrgb&w=900', 2),
('fragrance', 'عطر و ادکلن', 'عطرهایی با نت‌های گل سرخ، عود و کهربا برای امضای شخصی شما.', 'https://images.pexels.com/photos/7814956/pexels-photo-7814956.jpeg?auto=compress&cs=tinysrgb&w=900', 3),
('hair-and-body', 'مو و بدن', 'روغن‌ها و سرم‌های گیاهی برای موهای براق و بدنی لطیف.', 'https://images.pexels.com/photos/17307533/pexels-photo-17307533.jpeg?auto=compress&cs=tinysrgb&w=900', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (slug, name, brand, category_id, short_description, description, ingredients, usage_instructions, price_toman, compare_at_toman, stock, rating, review_count, images, variants, is_bestseller, is_new) VALUES
('vitamin-c-brightening-serum', 'سرم ویتامین سی روشن‌کننده', 'ماه‌پوست', (SELECT id FROM categories WHERE slug='skincare'),
 'سرم سبک با ویتامین سی پایدار برای درخشش و یکنواختی رنگ پوست.',
 'سرم ویتامین سی ماه‌پوست با فرمول پایدار و غلظت متعادل، لک‌های کم‌رنگ را کم‌رنگ‌تر کرده و به پوست جلوه‌ای شفاف و تازه می‌دهد. بافت سبک آن به سرعت جذب می‌شود و زیر کرم روزانه نیز مناسب است.',
 'آب، ویتامین سی پایدار، اسید هیالورونیک، عصاره گل همیشه‌بهار، گلیسیرین، توکوفرول',
 'صبح‌ها پس از شستشو، ۲ تا ۳ قطره روی پوست تمیز بزنید و با حرکات ملایم به صورت بمالید. پیش از کاربرد کرم ضدآفتاب استفاده کنید.',
 2450000, 2800000, 24, 4.8, 186,
 ARRAY['https://images.pexels.com/photos/7797735/pexels-photo-7797735.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/7797453/pexels-photo-7797453.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/7797102/pexels-photo-7797102.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"30ml","label":"۳۰ میلی‌لیتر","price_delta":0},{"id":"50ml","label":"۵۰ میلی‌لیتر","price_delta":1000000}]'::jsonb,
 true, false),
('hyaluronic-hydrating-serum', 'سرم هیالورونیک آبرسان', 'ماه‌پوست', (SELECT id FROM categories WHERE slug='skincare'),
 'آبرسانی عمیق با اسید هیالورونیک چندوزنه برای پوستی نرم و کشسان.',
 'این سرم با سه وزن مولکولی متفاوت اسید هیالورونیک، رطوبت را در لایه‌های مختلف پوست نگه می‌دارد. پس از استفاده، پوست لطیف و صاف می‌شود و خط خطوط ریز ظاهری کم‌رنگ‌تر به نظر می‌رسند.',
 'آب، اسید هیالورونیک، پانتنول، آلوئه‌ورا، عصاره خیار، گلیسیرین',
 'صبح و شب پس از شستشو و پیش از کرم، چند قطره روی صورت و گردن بزنید.',
 1980000, NULL, 40, 4.7, 142,
 ARRAY['https://images.pexels.com/photos/6800938/pexels-photo-6800938.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/7797735/pexels-photo-7797735.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/7795661/pexels-photo-7795661.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"30ml","label":"۳۰ میلی‌لیتر","price_delta":0}]'::jsonb,
 false, true),
('rose-night-cream', 'کرم شب گل سرخ', 'گل‌آرا', (SELECT id FROM categories WHERE slug='skincare'),
 'کرم احیاکننده شبانه با عصاره گل محمدی و روغن ارگان.',
 'کرم شب گل‌آرا با عصاره گل محمدی کاشان و روغن ارگان، طی شب پوست را بازسازی می‌کند. بافت غنی آن در صبح پوستی نرم، تغذیه‌شده و با فروغی طبیعی به شما می‌دهد.',
 'گل محمدی، روغن ارگان، کره شیا، ویتامین E، شیا بوتر، روغن جوجوبا',
 'شب‌ها پس از سرم، مقدار کمی از کرم را روی صورت و گردن ماساژ دهید.',
 2790000, 3200000, 5, 4.9, 98,
 ARRAY['https://images.pexels.com/photos/19808300/pexels-photo-19808300.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/7038196/pexels-photo-7038196.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/8128067/pexels-photo-8128067.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"50ml","label":"۵۰ میلی‌لیتر","price_delta":0},{"id":"100ml","label":"۱۰۰ میلی‌لیتر","price_delta":1400000}]'::jsonb,
 true, false),
('daily-hydrating-cream', 'کرم آبرسان روزانه', 'نُوا', (SELECT id FROM categories WHERE slug='skincare'),
 'کرم سبک و غیرچرب با محافظت ۲۴ ساعته از رطوبت پوست.',
 'کرم آبرسان روزانه نوا با بافتی سبک، پوست را از صبح تا شب مرطوب و آرام نگه می‌دارد. مناسب انواع پوست و بدون روغن معدنی است.',
 'آب، گلیسیرین، شی‌بوتر، اسکوالان، پروپاندیول، عصاره چای سبز',
 'هر صبح و شب پس از سرم روی صورت و گردن پخش کنید.',
 1290000, NULL, 60, 4.6, 214,
 ARRAY['https://images.pexels.com/photos/7038196/pexels-photo-7038196.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/8015482/pexels-photo-8015482.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/7670764/pexels-photo-7670764.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"50ml","label":"۵۰ میلی‌لیتر","price_delta":0}]'::jsonb,
 false, false),
('gentle-foaming-cleanser', 'ژل شستشوی ملایم', 'نُوا', (SELECT id FROM categories WHERE slug='skincare'),
 'ژل شوینده بدون صابون برای پاکسازی لطیف و بدون خشکی.',
 'ژل شستشوی نوا آرایش و چربی اضافی را بدون ایجاد کشیدگی پوست پاک می‌کند. ترکیب ملایم آن برای پوست حساس نیز مناسب است.',
 'آب، لوریل گلوکوزید، آلوئه‌ورا، اسید لاکتیک، عصاره بابونه',
 'صبح و شب با آب ولرم روی صورت مرطوب بمالید و سپس آبکشی کنید.',
 890000, NULL, 0, 4.5, 77,
 ARRAY['https://images.pexels.com/photos/8128063/pexels-photo-8128063.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/4202328/pexels-photo-4202328.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/8128064/pexels-photo-8128064.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"150ml","label":"۱۵۰ میلی‌لیتر","price_delta":0}]'::jsonb,
 false, false),
('ginseng-botanical-toner', 'تونر گیاهی گاوزبان', 'ماه‌پوست', (SELECT id FROM categories WHERE slug='skincare'),
 'تونر تازه‌کننده با عصاره گاوزبان و گل همیشه‌بهار.',
 'این تونر گیاهی، تعادل pH پوست را پس از شستشو بازمی‌گرداند و آن را برای جذب بهتر سرم آماده می‌کند. رایحه‌ای ملایم و گیاهی دارد.',
 'آب گل سرخ، عصاره گاوزبان، گل همیشه‌بهار، پروپیلن گلیکول، گلیسیرین',
 'پس از شستشو، با کمک پنبه یا با دست روی صورت بزنید.',
 1150000, 1350000, 3, 4.4, 56,
 ARRAY['https://images.pexels.com/photos/7797102/pexels-photo-7797102.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/8128064/pexels-photo-8128064.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/4202326/pexels-photo-4202326.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"200ml","label":"۲۰۰ میلی‌لیتر","price_delta":0}]'::jsonb,
 false, true),
('velvet-matte-lipstick', 'رژ لب مخملی مات', 'لوموس', (SELECT id FROM categories WHERE slug='makeup'),
 'رنگی ماندگار با پایانی مخملی که تا ۸ ساعت دوام می‌آورد.',
 'رژ لب مخملی لوموس با رنگدانه‌های غلیظ، لبانی نرم و یکدست ایجاد می‌کند. فرمول آن بدون خشکی است و با یک کرم لب سبک، ماندگاری بیشتری دارد.',
 'روغن کاستور، پودر ابریشم، ویتامین E، رنگدانه‌های معدنی، روغن جوجوبا',
 'از گوشه لب شروع کنید و با حرکات نرم رنگ را به مرکز لب بیاورید. برای ماندگاری بیشتر یک لایه نازک پودر روی آن بزنید.',
 1390000, NULL, 35, 4.8, 302,
 ARRAY['https://images.pexels.com/photos/850801/pexels-photo-850801.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/4889718/pexels-photo-4889718.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/90269/pexels-photo-90269.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"01","label":"شماره ۰۱ - گلی ملایم","price_delta":0},{"id":"04","label":"شماره ۰۴ - قرمز آتشین","price_delta":0},{"id":"07","label":"شماره ۰۷ - قهوه‌ای رزی","price_delta":0}]'::jsonb,
 true, false),
('satin-gold-lipstick', 'رژ لب ساتن طلایی', 'لوموس', (SELECT id FROM categories WHERE slug='makeup'),
 'رژ لب ساتن با ذرات ظریف طلایی و تابشی گرم.',
 'رژ لب ساتن لوموس با ذرات ریز طلایی، تابشی ملایم و زنده روی لب ایجاد می‌کند. بافت کرمی آن راحت پخش می‌شود و لب را آبدار نگه می‌دارد.',
 'روغن هندوانه، موم کاندلیلا، ذرات طلایی معدنی، ویتامین E، روغن آووکادو',
 'مستقیم از روی لب یا با قلم لب روی لب پخش کنید.',
 1690000, 1900000, 18, 4.7, 121,
 ARRAY['https://images.pexels.com/photos/90269/pexels-photo-90269.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/28968483/pexels-photo-28968483.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/26927323/pexels-photo-26927323.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"rose","label":"گل رز طلایی","price_delta":0},{"id":"nude","label":"نود طلایی","price_delta":0}]'::jsonb,
 false, true),
('shimmer-highlighter', 'هایلایتر شیمری', 'لوموس', (SELECT id FROM categories WHERE slug='makeup'),
 'پودر هایلایتر با درخشش ملایم و طبیعی روی گونه و استخوان گونه.',
 'این هایلایتر با ذرات بسیار ریز، درخششی نرم و بدون ظاهر چرب ایجاد می‌کند. قابل استفاده برای آرایش روزانه و مجلسی است.',
 'تالک، میکای معدنی، پودر مروارید، ویتامین E، دی‌متیکون',
 'با قلم پهن پودر را روی برجستگی گونه‌ها و روی بینی بزنید.',
 1540000, NULL, 14, 4.6, 88,
 ARRAY['https://images.pexels.com/photos/4938498/pexels-photo-4938498.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/12606876/pexels-photo-12606876.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/4889718/pexels-photo-4889718.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"pearl","label":"مروارید","price_delta":0},{"id":"champagne","label":"شامپاین","price_delta":0}]'::jsonb,
 false, true),
('rose-eau-de-parfum', 'ادو پرفیوم گل سرخ', 'عطرخانه آتلیه', (SELECT id FROM categories WHERE slug='fragrance'),
 'عطری گلی و لطیف با نت‌های گل سرخ دمشقی و پاچولی.',
 'ادو پرفیوم گل سرخ آتلیه با آغازی تازه از گل سرخ دمشقی آغاز می‌شود و در پایان با پاچولی و مشک گرم، ماندگاری طولانی دارد. مناسب روز و شب.',
 'الکل، آب، عطر گل سرخ دمشقی، پاچولی، مشک، ونیل (غلظت ادوپرفیوم)',
 'روی نقاط نبض مانند گردن و مچ دست اسپری کنید. از مالیدن مچ‌ها به هم خودداری کنید.',
 4890000, 5500000, 12, 4.9, 167,
 ARRAY['https://images.pexels.com/photos/4735908/pexels-photo-4735908.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/29611647/pexels-photo-29611647.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/4736027/pexels-photo-4736027.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"50ml","label":"۵۰ میلی‌لیتر","price_delta":0},{"id":"100ml","label":"۱۰۰ میلی‌لیتر","price_delta":2100000}]'::jsonb,
 true, false),
('oud-amber-parfum', 'عطر عود و کهربا', 'عطرخانه آتلیه', (SELECT id FROM categories WHERE slug='fragrance'),
 'عطری شرقی و گرم با عود، کهربا و بخور خوش‌عطر.',
 'این عطر با نت‌های عود آسامی و کهربای گرم، حضوری پرقدرت و آرام دارد. مناسب فصل‌های سرد و مهمانی‌های شبانه است.',
 'الکل، آب، عود آسامی، کهربا، بخور، وتیور، ونیل',
 'ترجیحاً روی لباس یا نقاط نبض اسپری کنید تا عطر بهتر پخش شود.',
 5690000, NULL, 6, 4.8, 74,
 ARRAY['https://images.pexels.com/photos/7814959/pexels-photo-7814959.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/7814961/pexels-photo-7814961.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/7814956/pexels-photo-7814956.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"50ml","label":"۵۰ میلی‌لیتر","price_delta":0}]'::jsonb,
 true, false),
('white-musk-body-mist', 'عطر بدن مشک سفید', 'عطرخانه آتلیه', (SELECT id FROM categories WHERE slug='fragrance'),
 'اسپری بدن سبک با رایحه مشک سفید و یاس.',
 'اسپری بدن مشک سفید با رایحه‌ای تمیز و سبک، برای استفاده روزانه مناسب است. رایحه آن پوست را با ملایمت معطر می‌کند.',
 'آب، الکل، مشک سفید، یاس، گلابی، گلیسیرین',
 'از فاصله ۲۰ سانتی‌متری روی بدن اسپری کنید.',
 1290000, NULL, 30, 4.5, 39,
 ARRAY['https://images.pexels.com/photos/8691537/pexels-photo-8691537.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/4736027/pexels-photo-4736027.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/7814956/pexels-photo-7814956.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"100ml","label":"۱۰۰ میلی‌لیتر","price_delta":0}]'::jsonb,
 false, true),
('argan-hair-oil', 'روغن مو آرگان', 'گیسو', (SELECT id FROM categories WHERE slug='hair-and-body'),
 'روغن سبک آرگان برای درخشش و نرمی موهای خشک و آسیب‌دیده.',
 'روغن آرگان گیسو با استخراج سرد از دانه‌های آرگان، موها را نرم و براق می‌کند بدون آنکه آن‌ها را سنگین کند. برای انواع موی فر و صاف مناسب است.',
 'روغن آرگان، روغن جوجوبا، ویتامین E، روغن بادام شیرین',
 'چند قطره روی کف دست بریزید و از نیمه طول مو تا نوک آن بمالید.',
 1490000, NULL, 26, 4.7, 133,
 ARRAY['https://images.pexels.com/photos/4408447/pexels-photo-4408447.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/31401740/pexels-photo-31401740.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/12146904/pexels-photo-12146904.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"50ml","label":"۵۰ میلی‌لیتر","price_delta":0},{"id":"100ml","label":"۱۰۰ میلی‌لیتر","price_delta":800000}]'::jsonb,
 true, false),
('scalp-growth-serum', 'سرم تقویت‌کننده مو و پوست سر', 'گیسو', (SELECT id FROM categories WHERE slug='hair-and-body'),
 'سرم گیاهی برای تقویت ریشه مو و کاهش ریزش.',
 'این سرم با عصاره‌های گیاهی و کافئین، ریشه موها را تقویت می‌کند و پوست سر را آرام نگه می‌دارد. پس از چند هفته استفاده منظم، حجم ظاهری مو بیشتر به نظر می‌رسد.',
 'آب، کافئین، عصاره پیاز، روغن کرچک، پانتنول، عصاره رزماری',
 'شب‌ها روی پوست سر را با نوک انگشتان ماساژ دهید. نیازی به شستشو نیست.',
 2150000, 2400000, 15, 4.5, 64,
 ARRAY['https://images.pexels.com/photos/17307533/pexels-photo-17307533.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/7796587/pexels-photo-7796587.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/31401740/pexels-photo-31401740.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"90ml","label":"۹۰ میلی‌لیتر","price_delta":0}]'::jsonb,
 false, true),
('nourishing-body-oil', 'روغن بدن مغذی', 'نُوا', (SELECT id FROM categories WHERE slug='hair-and-body'),
 'روغن بدن با عصاره اکالیپتوس برای پوستی نرم و معطر.',
 'روغن بدن نوا با ترکیب روغن‌های گیاهی، پوست را پس از حمام نرم و لطیف می‌کند. رایحه گیاهی و تازه آن را به تجربه‌ای آرامش‌بخش تبدیل می‌کند.',
 'روغن هسته انگور، روغن اکالیپتوس، روغن بادام، ویتامین E',
 'پس از دوش، روی پوست نمناک بمالید تا بهتر جذب شود.',
 1250000, NULL, 20, 4.6, 49,
 ARRAY['https://images.pexels.com/photos/7796587/pexels-photo-7796587.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/12146904/pexels-photo-12146904.jpeg?auto=compress&cs=tinysrgb&w=1200','https://images.pexels.com/photos/4202325/pexels-photo-4202325.jpeg?auto=compress&cs=tinysrgb&w=1200'],
 '[{"id":"200ml","label":"۲۰۰ میلی‌لیتر","price_delta":0}]'::jsonb,
 false, false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO reviews (product_id, author_name, rating, body) VALUES
((SELECT id FROM products WHERE slug='vitamin-c-brightening-serum'), 'نیلوفر ا.', 5, 'بعد از دو هفته پوستم درخشان‌تر شده. بافتش خیلی سبک است و زیر آرایش هم خوب می‌نشیند.'),
((SELECT id FROM products WHERE slug='vitamin-c-brightening-serum'), 'مریم ح.', 5, 'بسته‌بندی شیک و کیفیت عالی. لکه‌های روی گونه‌ام کم‌رنگ شده.'),
((SELECT id FROM products WHERE slug='hyaluronic-hydrating-serum'), 'سارا م.', 5, 'پوست خشک من با این سرم خیلی بهتر شده. بعد از استفاده حس کشیدگی نمی‌دهد.'),
((SELECT id FROM products WHERE slug='hyaluronic-hydrating-serum'), 'پریسا ک.', 4, 'آبرسانی عالی دارد، فقط کمی زودتر از انتظار تمام می‌شود.'),
((SELECT id FROM products WHERE slug='rose-night-cream'), 'آتوسا ر.', 5, 'بوی گل محمدی فوق‌العاده است و صبح‌ها پوستم نرم و تغذیه‌شده است.'),
((SELECT id FROM products WHERE slug='rose-night-cream'), 'یلدا ف.', 5, 'بهترین کرم شبی که تا حالا امتحان کرده‌ام. ارزش هزینه را دارد.'),
((SELECT id FROM products WHERE slug='daily-hydrating-cream'), 'مهسا ب.', 5, 'سبک است و زیرِ آرایش هم خوب پخش می‌شود. برای پوست مختلط عالی است.'),
((SELECT id FROM products WHERE slug='daily-hydrating-cream'), 'رها ج.', 4, 'آبرسانی خوبی دارد و غیرچرب است. قیمتش هم مناسب است.'),
((SELECT id FROM products WHERE slug='gentle-foaming-cleanser'), 'شیدا ن.', 5, 'پوست حساسم با این ژل هیچ قرمزی نگرفت. بوی ملایمی دارد.'),
((SELECT id FROM products WHERE slug='gentle-foaming-cleanser'), 'گلناز پ.', 4, 'کف خوبی دارد و آرایش را کامل پاک می‌کند.'),
((SELECT id FROM products WHERE slug='ginseng-botanical-toner'), 'ترانه ی.', 4, 'تونر تازه‌کننده‌ای است و رایحه گیاهی دلنشینی دارد.'),
((SELECT id FROM products WHERE slug='ginseng-botanical-toner'), 'الهام ص.', 5, 'بعد از شستشو پوست متعادل‌تر می‌شود. دوستش دارم.'),
((SELECT id FROM products WHERE slug='velvet-matte-lipstick'), 'فریبا ع.', 5, 'رنگ قرمز آتشین واقعاً ماندگار است و لب‌ها خشک نمی‌شوند.'),
((SELECT id FROM products WHERE slug='velvet-matte-lipstick'), 'نگار د.', 5, 'پایان مخملی بی‌نظیری دارد. بسته‌بندی هم خیلی لوکس است.'),
((SELECT id FROM products WHERE slug='satin-gold-lipstick'), 'کیمیا ه.', 5, 'درخشش طلایی ظریفی دارد که روی هر لباسی جواب می‌دهد.'),
((SELECT id FROM products WHERE slug='satin-gold-lipstick'), 'ناهید ر.', 4, 'بافتش کرمی و آبدار است. فقط یک لایه کافی است.'),
((SELECT id FROM products WHERE slug='shimmer-highlighter'), 'ستاره ف.', 5, 'درخشش نرمی دارد و خیلی طبیعی به نظر می‌رسد.'),
((SELECT id FROM products WHERE slug='shimmer-highlighter'), 'سمانه ط.', 4, 'رنگ شامپاین برای پوست گندمی من عالی است.'),
((SELECT id FROM products WHERE slug='rose-eau-de-parfum'), 'هستی ل.', 5, 'ماندگاری حیرت‌انگیزی دارد و رایحه گل سرخ آن لطیف و عمیق است.'),
((SELECT id FROM products WHERE slug='rose-eau-de-parfum'), 'پگاه ز.', 5, 'بهترین عطری که تا امروز داشته‌ام. همه تعریفش را می‌کنند.'),
((SELECT id FROM products WHERE slug='oud-amber-parfum'), 'امیر ح.', 5, 'عود و کهربا با هم هماهنگ‌اند. برای شب‌های سرد عالی است.'),
((SELECT id FROM products WHERE slug='oud-amber-parfum'), 'کامران ش.', 4, 'قدرتش زیاد است و ماندگاری خوبی دارد. برای مجالس مناسب است.'),
((SELECT id FROM products WHERE slug='white-musk-body-mist'), 'آوا ت.', 4, 'سبک و تازه است و برای روزهای گرم عالی است.'),
((SELECT id FROM products WHERE slug='white-musk-body-mist'), 'ملیکا ب.', 5, 'رایحه یاس آن خیلی دلنشین است و قیمتش مناسب.'),
((SELECT id FROM products WHERE slug='argan-hair-oil'), 'لیلا ا.', 5, 'موهای خشکم بعد از یک ماه نرم و براق شده‌اند.'),
((SELECT id FROM products WHERE slug='argan-hair-oil'), 'نسرین ق.', 4, 'سبک است و موها را سنگین نمی‌کند. بوی خوبی دارد.'),
((SELECT id FROM products WHERE slug='scalp-growth-serum'), 'فاطمه م.', 4, 'بعد از چند هفته ریزش کمتری دارم و پوست سرم آرام‌تر شده.'),
((SELECT id FROM products WHERE slug='scalp-growth-serum'), 'حدیث ر.', 5, 'ماساژ شبانه‌اش را دوست دارم و نتیجه‌اش را هم دیده‌ام.'),
((SELECT id FROM products WHERE slug='nourishing-body-oil'), 'زهرا ک.', 5, 'بعد از دوش پوستم فوق‌العاده نرم است. رایحه اکالیپتوس آرامش‌بخش است.'),
((SELECT id FROM products WHERE slug='nourishing-body-oil'), 'شقایق ی.', 4, 'جذبش خوب است و چرب نمی‌کند.')
ON CONFLICT (product_id, author_name) DO NOTHING;

INSERT INTO stories (title, media_type, media_url, link_url, sort_order) VALUES
('جدیدترین‌ها', 'image', 'https://images.pexels.com/photos/3762756/pexels-photo-3762756.jpeg?auto=compress&cs=tinysrgb&w=900', '/shop?sort=newest', 1),
('رژ لب فصل', 'image', 'https://images.pexels.com/photos/2823975/pexels-photo-2823975.jpeg?auto=compress&cs=tinysrgb&w=900', '/shop?category=makeup', 2),
('مراقبت از پوست', 'image', 'https://images.pexels.com/photos/6681391/pexels-photo-6681391.jpeg?auto=compress&cs=tinysrgb&w=900', '/shop?category=skincare', 3),
('عطر پاییزی', 'image', 'https://images.pexels.com/photos/3764479/pexels-photo-3764479.jpeg?auto=compress&cs=tinysrgb&w=900', '/shop?category=fragrance', 4),
('مو و بدن', 'image', 'https://images.pexels.com/photos/10648949/pexels-photo-10648949.jpeg?auto=compress&cs=tinysrgb&w=900', '/shop?category=hair-and-body', 5),
('پیشنهاد ویژه', 'image', 'https://images.pexels.com/photos/6706877/pexels-photo-6706877.jpeg?auto=compress&cs=tinysrgb&w=900', '/shop?sort=bestselling', 6)
ON CONFLICT (title) DO NOTHING;

INSERT INTO banners (title, placement, eyebrow, subtitle, cta_label, cta_url, image_url, sort_order) VALUES
('مجموعه پاییز ۱۴۰۵', 'hero', 'مجموعه فصلی', 'زیبایی را با درخششی گرم و طلایی به فصل پاییز بیاورید. گل سرخ، عود و رژ لب‌های مخملی، همه در یک مجموعه گردآوری شده‌اند.', 'کشف مجموعه', '/shop?sort=newest', 'https://images.pexels.com/photos/3762756/pexels-photo-3762756.jpeg?auto=compress&cs=tinysrgb&w=1600', 1),
('فروش ویژه عطرها', 'promo', 'تا ۲۰ درصد تخفیف', 'عطرهای منتخب آتلیه را با قیمتی ویژه تجربه کنید.', 'خرید عطرها', '/shop?category=fragrance', 'https://images.pexels.com/photos/4202326/pexels-photo-4202326.jpeg?auto=compress&cs=tinysrgb&w=1200', 2),
('مراقبت روزانه پوست', 'promo', 'سرم و کرم منتخب', 'سرم‌های آبرسان و کرم‌های سبک را برای پوستی شفاف و آرام انتخاب کنید.', 'مشاهده مراقبت پوست', '/shop?category=skincare', 'https://images.pexels.com/photos/6800938/pexels-photo-6800938.jpeg?auto=compress&cs=tinysrgb&w=1200', 3)
ON CONFLICT (title) DO NOTHING;


-- =====================================================================
-- Migration: 20261030060651_create_accounts_profiles_and_admin_roles.sql
-- =====================================================================
/*
# Accounts, profiles, and admin roles

1. Plain-English summary
- Every new customer account automatically gets a profile row that stores their name and phone number.
- Admin accounts are listed in a separate table that customers cannot edit, so nobody can promote themselves.

2. New tables
- `profiles`: one row per account. Columns: `id` (same as the sign-in account id), `full_name`, `phone`, `created_at`, `updated_at`.
- `admin_users`: list of account ids that have admin access. Only managed directly in the database.

3. New functions
- `handle_new_user()`: runs after a sign-up and creates the matching profile row.
- `is_admin()`: returns true when the signed-in account is listed in `admin_users`.

4. Security
- Row-level security is enabled on both tables.
- Customers can read only their own profile and can update only `full_name` and `phone`.
- Customers cannot insert or delete profiles directly; the sign-up trigger creates them.
- `admin_users` has no grants for customers and no policies, so the client cannot read or change it.
- The two functions set a fixed search path and are not callable by anonymous visitors.

5. Notes
- Creating the profile row happens inside the sign-up process, so a profile always exists for a new account.
- Email confirmation is not changed by this migration and must remain off in the authentication settings.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '' CHECK (char_length(full_name) <= 100),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON profiles FROM PUBLIC, anon;
REVOKE ALL ON admin_users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (full_name, phone, updated_at) ON profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 100))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- =====================================================================
-- Migration: 20261030061048_create_addresses_and_orders.sql
-- =====================================================================
/*
# Saved addresses, orders, and server-side order placement

1. Plain-English summary
- Customers can save delivery addresses to their account.
- Placing an order happens in one server function. It reads prices and stock from the product records, never from the browser, so the total cannot be changed by a visitor.
- Repeated submissions with the same key return the existing order instead of charging twice.
- Each order keeps a copy of its address and item details, so later edits to products or addresses do not change past orders.

2. New tables
- `addresses`: saved delivery addresses per customer (recipient, phone, province, city, street, postal code).
- `orders`: one row per order with status, delivery method, fee, subtotal, total, and a copy of the delivery address.
- `order_items`: the products in each order with a copy of name, variant, unit price, and quantity.

3. New function
- `place_order(address, delivery method, items, idempotency key)`: validates the address, locks each product, checks stock, recalculates prices and delivery fee, decreases stock, and creates the order. It runs as one transaction, so any failure leaves nothing behind.

4. Security
- Row-level security is enabled on all three tables.
- Customers can read and add their own addresses, and delete their own addresses. They cannot edit addresses; the ownership column is filled by the database.
- Customers can read only their own orders and their items. They cannot insert, update, or delete orders directly.
- `place_order` is callable only by signed-in customers.

5. Notes
- Delivery fee rules used here: courier is free from 2,000,000 toman subtotal and 80,000 toman otherwise; post is a flat 50,000 toman. These values are placeholders to confirm.
- Stock is reserved when an order is placed. Cancelling an order later must return stock.
*/

CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name text NOT NULL CHECK (char_length(recipient_name) BETWEEN 2 AND 100),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 5 AND 20),
  province text NOT NULL CHECK (char_length(province) BETWEEN 2 AND 60),
  city text NOT NULL CHECK (char_length(city) BETWEEN 2 AND 60),
  street text NOT NULL CHECK (char_length(street) BETWEEN 5 AND 300),
  postal_code text NOT NULL CHECK (postal_code ~ '^[0-9]{10}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON addresses (user_id);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT 'NV-' || to_char(now() AT TIME ZONE 'UTC', 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 100),
  status text NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN ('awaiting_payment', 'pending_review', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
  delivery_method text NOT NULL CHECK (delivery_method IN ('courier', 'post')),
  recipient_name text NOT NULL,
  phone text NOT NULL,
  province text NOT NULL,
  city text NOT NULL,
  street text NOT NULL,
  postal_code text NOT NULL,
  subtotal_toman bigint NOT NULL DEFAULT 0 CHECK (subtotal_toman >= 0),
  delivery_fee_toman bigint NOT NULL DEFAULT 0 CHECK (delivery_fee_toman >= 0),
  total_toman bigint NOT NULL DEFAULT 0 CHECK (total_toman >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS orders_user_id_created_idx ON orders (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  brand text NOT NULL DEFAULT '',
  variant_id text NOT NULL,
  variant_label text,
  unit_price_toman bigint NOT NULL CHECK (unit_price_toman >= 0),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  line_total_toman bigint NOT NULL CHECK (line_total_toman >= 0)
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON addresses, orders, order_items FROM PUBLIC, anon;

GRANT SELECT, DELETE ON addresses TO authenticated;
GRANT INSERT (recipient_name, phone, province, city, street, postal_code) ON addresses TO authenticated;
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON order_items TO authenticated;

DROP POLICY IF EXISTS "select_own_addresses" ON addresses;
CREATE POLICY "select_own_addresses" ON addresses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_addresses" ON addresses;
CREATE POLICY "insert_own_addresses" ON addresses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_addresses" ON addresses;
CREATE POLICY "delete_own_addresses" ON addresses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_own_orders" ON orders;
CREATE POLICY "select_own_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_own_order_items" ON order_items;
CREATE POLICY "select_own_order_items" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.place_order(
  p_address_id uuid,
  p_delivery_method text,
  p_items jsonb,
  p_idempotency_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing uuid;
  v_address addresses%ROWTYPE;
  v_order_id uuid;
  v_product products%ROWTYPE;
  v_item record;
  v_label text;
  v_delta bigint;
  v_unit bigint;
  v_line bigint;
  v_subtotal bigint := 0;
  v_fee bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_idempotency_key IS NULL OR char_length(p_idempotency_key) NOT BETWEEN 8 AND 100 THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;

  SELECT id INTO v_existing FROM orders WHERE user_id = v_uid AND idempotency_key = p_idempotency_key;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  IF p_delivery_method NOT IN ('courier', 'post') THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;

  SELECT * INTO v_address FROM addresses WHERE id = p_address_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'address_not_found';
  END IF;

  INSERT INTO orders (
    user_id, idempotency_key, delivery_method,
    recipient_name, phone, province, city, street, postal_code
  ) VALUES (
    v_uid, p_idempotency_key, p_delivery_method,
    v_address.recipient_name, v_address.phone, v_address.province, v_address.city, v_address.street, v_address.postal_code
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, variant_id text, quantity integer)
  LOOP
    IF v_item.product_id IS NULL OR v_item.variant_id IS NULL
      OR v_item.quantity IS NULL OR v_item.quantity NOT BETWEEN 1 AND 20 THEN
      RAISE EXCEPTION 'invalid_request';
    END IF;

    IF EXISTS (
      SELECT 1 FROM order_items
      WHERE order_id = v_order_id AND product_id = v_item.product_id AND variant_id = v_item.variant_id
    ) THEN
      RAISE EXCEPTION 'invalid_request';
    END IF;

    SELECT * INTO v_product FROM products WHERE id = v_item.product_id AND is_active FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'product_unavailable';
    END IF;

    v_label := NULL;
    v_delta := 0;
    IF jsonb_array_length(COALESCE(v_product.variants, '[]'::jsonb)) = 0 THEN
      IF v_item.variant_id <> 'default' THEN
        RAISE EXCEPTION 'invalid_variant';
      END IF;
    ELSE
      SELECT elem->>'label', COALESCE((elem->>'price_delta')::bigint, 0)
      INTO v_label, v_delta
      FROM jsonb_array_elements(v_product.variants) AS elem
      WHERE elem->>'id' = v_item.variant_id
      LIMIT 1;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'invalid_variant';
      END IF;
    END IF;

    IF v_product.stock < v_item.quantity THEN
      RAISE EXCEPTION 'out_of_stock';
    END IF;

    UPDATE products SET stock = stock - v_item.quantity WHERE id = v_product.id;

    v_unit := v_product.price_toman + v_delta;
    v_line := v_unit * v_item.quantity;
    v_subtotal := v_subtotal + v_line;

    INSERT INTO order_items (
      order_id, product_id, product_name, brand, variant_id, variant_label,
      unit_price_toman, quantity, line_total_toman
    ) VALUES (
      v_order_id, v_product.id, v_product.name, v_product.brand, v_item.variant_id, v_label,
      v_unit, v_item.quantity, v_line
    );
  END LOOP;

  IF p_delivery_method = 'courier' THEN
    v_fee := CASE WHEN v_subtotal >= 2000000 THEN 0 ELSE 80000 END;
  ELSE
    v_fee := 50000;
  END IF;

  UPDATE orders
  SET subtotal_toman = v_subtotal,
      delivery_fee_toman = v_fee,
      total_toman = v_subtotal + v_fee,
      updated_at = now()
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.place_order(uuid, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, text, jsonb, text) TO authenticated;


-- =====================================================================
-- Migration: 20261030062138_create_card_payment_receipts.sql
-- =====================================================================
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


-- =====================================================================
-- Migration: 20261030062918_create_store_and_payment_configuration.sql
-- =====================================================================
/*
# Store, payment, and admin role configuration

1. Plain-English summary
- The store owner can now set business details, delivery fees, and card-to-card payment details from the admin dashboard.
- Card payment stays off until the owner enables it, and it can only be enabled after the bank card details are complete.
- Admin accounts now have a username and a role: owner, manager, or reviewer.

2. Tables
- `store_settings` (one row): store name, support phone, support email, address, courier fee, courier free-shipping threshold, post fee.
- `payment_settings` (one row, extended): adds account number, IBAN, customer notice, and the card payment on/off switch. Existing bank name, card number, cardholder, and instructions are kept.
- `admin_users` (extended): adds username and role.

3. Functions
- `current_admin_role()`: returns the caller's admin role, or nothing if the caller is not an admin.
- `admin_update_store_settings`, `admin_update_payment_settings`, `admin_update_bank_card`: owner or manager only. Every value is validated on the server.
- `place_order` and `submit_card_receipt`: now read fees from store settings and refuse card payments while they are switched off.

4. Security
- No client can write to the settings tables directly; changes go through the functions above.
- Store settings are public business information and are readable by anyone.
- Payment details are readable by signed-in users only.
- Admins can read order items so they can review transaction details.

5. Notes
- Defaults keep the previous fees (80,000 courier, free courier above 2,000,000, 50,000 post) so existing behaviour is unchanged.
*/

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS username text CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,30}$');
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'reviewer' CHECK (role IN ('owner', 'manager', 'reviewer'));
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_username_key ON admin_users (username) WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS store_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name text NOT NULL DEFAULT 'نُوا شاپ' CHECK (char_length(store_name) BETWEEN 2 AND 80),
  support_phone text NOT NULL DEFAULT '' CHECK (char_length(support_phone) <= 20),
  support_email text NOT NULL DEFAULT '' CHECK (char_length(support_email) <= 120),
  address text NOT NULL DEFAULT '' CHECK (char_length(address) <= 300),
  courier_fee_toman bigint NOT NULL DEFAULT 80000 CHECK (courier_fee_toman BETWEEN 0 AND 100000000),
  courier_free_threshold_toman bigint NOT NULL DEFAULT 2000000 CHECK (courier_free_threshold_toman BETWEEN 0 AND 1000000000),
  post_fee_toman bigint NOT NULL DEFAULT 50000 CHECK (post_fee_toman BETWEEN 0 AND 100000000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS account_number text NOT NULL DEFAULT '' CHECK (char_length(account_number) <= 30);
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS iban text NOT NULL DEFAULT '' CHECK (char_length(iban) <= 34);
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS payment_notice text NOT NULL DEFAULT '' CHECK (char_length(payment_notice) <= 500);
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS card_payment_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON store_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON store_settings TO anon, authenticated;

DROP POLICY IF EXISTS "select_store_settings" ON store_settings;
CREATE POLICY "select_store_settings" ON store_settings FOR SELECT
  TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.current_admin_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.admin_users WHERE user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.current_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_admin_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_store_settings(
  p_store_name text,
  p_support_phone text,
  p_support_email text,
  p_address text,
  p_courier_fee_toman bigint,
  p_courier_free_threshold_toman bigint,
  p_post_fee_toman bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := btrim(COALESCE(p_store_name, ''));
  v_phone text := btrim(COALESCE(p_support_phone, ''));
  v_email text := lower(btrim(COALESCE(p_support_email, '')));
  v_address text := btrim(COALESCE(p_address, ''));
BEGIN
  IF public.current_admin_role() IS NULL OR public.current_admin_role() NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF char_length(v_name) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION 'invalid_store_name';
  END IF;
  IF v_phone <> '' AND v_phone !~ '^[0-9+() -]{5,20}$' THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;
  IF v_email <> '' AND (char_length(v_email) > 120 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF char_length(v_address) > 300 THEN
    RAISE EXCEPTION 'invalid_address';
  END IF;
  IF p_courier_fee_toman IS NULL OR p_courier_fee_toman NOT BETWEEN 0 AND 100000000 THEN
    RAISE EXCEPTION 'invalid_fee';
  END IF;
  IF p_courier_free_threshold_toman IS NULL OR p_courier_free_threshold_toman NOT BETWEEN 0 AND 1000000000 THEN
    RAISE EXCEPTION 'invalid_fee';
  END IF;
  IF p_post_fee_toman IS NULL OR p_post_fee_toman NOT BETWEEN 0 AND 100000000 THEN
    RAISE EXCEPTION 'invalid_fee';
  END IF;

  UPDATE store_settings
  SET store_name = v_name,
      support_phone = v_phone,
      support_email = v_email,
      address = v_address,
      courier_fee_toman = p_courier_fee_toman,
      courier_free_threshold_toman = p_courier_free_threshold_toman,
      post_fee_toman = p_post_fee_toman,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_bank_card(
  p_bank_name text,
  p_card_number text,
  p_account_holder text,
  p_account_number text,
  p_iban text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank text := btrim(COALESCE(p_bank_name, ''));
  v_card text := regexp_replace(COALESCE(p_card_number, ''), '[\s-]', '', 'g');
  v_holder text := btrim(COALESCE(p_account_holder, ''));
  v_account text := regexp_replace(COALESCE(p_account_number, ''), '[\s-]', '', 'g');
  v_iban text := upper(regexp_replace(COALESCE(p_iban, ''), '\s', '', 'g'));
BEGIN
  IF public.current_admin_role() IS NULL OR public.current_admin_role() NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF char_length(v_bank) NOT BETWEEN 2 AND 60 THEN
    RAISE EXCEPTION 'invalid_bank_name';
  END IF;
  IF v_card !~ '^[0-9]{16}$' THEN
    RAISE EXCEPTION 'invalid_card_number';
  END IF;
  IF char_length(v_holder) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'invalid_account_holder';
  END IF;
  IF v_account <> '' AND v_account !~ '^[0-9]{5,30}$' THEN
    RAISE EXCEPTION 'invalid_account_number';
  END IF;
  IF v_iban <> '' AND v_iban !~ '^IR[0-9]{24}$' THEN
    RAISE EXCEPTION 'invalid_iban';
  END IF;

  UPDATE payment_settings
  SET bank_name = v_bank,
      card_number = v_card,
      account_holder = v_holder,
      account_number = v_account,
      iban = v_iban,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_payment_settings(
  p_enabled boolean,
  p_instructions text,
  p_notice text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instructions text := btrim(COALESCE(p_instructions, ''));
  v_notice text := btrim(COALESCE(p_notice, ''));
  v_current payment_settings%ROWTYPE;
BEGIN
  IF public.current_admin_role() IS NULL OR public.current_admin_role() NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_enabled IS NULL THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;
  IF char_length(v_instructions) > 1000 THEN
    RAISE EXCEPTION 'invalid_instructions';
  END IF;
  IF char_length(v_notice) > 500 THEN
    RAISE EXCEPTION 'invalid_notice';
  END IF;

  SELECT * INTO v_current FROM payment_settings WHERE id = 1;
  IF p_enabled AND (v_current.bank_name = '' OR v_current.card_number = '' OR v_current.account_holder = '') THEN
    RAISE EXCEPTION 'bank_card_incomplete';
  END IF;

  UPDATE payment_settings
  SET card_payment_enabled = p_enabled,
      instructions = v_instructions,
      payment_notice = v_notice,
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_store_settings(text, text, text, text, bigint, bigint, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_store_settings(text, text, text, text, bigint, bigint, bigint) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_bank_card(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_bank_card(text, text, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_payment_settings(boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_settings(boolean, text, text) TO authenticated;

DROP POLICY IF EXISTS "select_admin_order_items" ON order_items;
CREATE POLICY "select_admin_order_items" ON order_items FOR SELECT
  TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.place_order(
  p_address_id uuid,
  p_delivery_method text,
  p_items jsonb,
  p_idempotency_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing uuid;
  v_address addresses%ROWTYPE;
  v_order_id uuid;
  v_product products%ROWTYPE;
  v_item record;
  v_label text;
  v_delta bigint;
  v_unit bigint;
  v_line bigint;
  v_subtotal bigint := 0;
  v_fee bigint;
  v_store store_settings%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_idempotency_key IS NULL OR char_length(p_idempotency_key) NOT BETWEEN 8 AND 100 THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;

  SELECT id INTO v_existing FROM orders WHERE user_id = v_uid AND idempotency_key = p_idempotency_key;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  IF NOT (SELECT card_payment_enabled FROM payment_settings WHERE id = 1) THEN
    RAISE EXCEPTION 'payments_disabled';
  END IF;

  IF p_delivery_method NOT IN ('courier', 'post') THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;

  SELECT * INTO v_address FROM addresses WHERE id = p_address_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'address_not_found';
  END IF;

  SELECT * INTO v_store FROM store_settings WHERE id = 1;

  INSERT INTO orders (
    user_id, idempotency_key, delivery_method,
    recipient_name, phone, province, city, street, postal_code
  ) VALUES (
    v_uid, p_idempotency_key, p_delivery_method,
    v_address.recipient_name, v_address.phone, v_address.province, v_address.city, v_address.street, v_address.postal_code
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, variant_id text, quantity integer)
  LOOP
    IF v_item.product_id IS NULL OR v_item.variant_id IS NULL
      OR v_item.quantity IS NULL OR v_item.quantity NOT BETWEEN 1 AND 20 THEN
      RAISE EXCEPTION 'invalid_request';
    END IF;

    IF EXISTS (
      SELECT 1 FROM order_items
      WHERE order_id = v_order_id AND product_id = v_item.product_id AND variant_id = v_item.variant_id
    ) THEN
      RAISE EXCEPTION 'invalid_request';
    END IF;

    SELECT * INTO v_product FROM products WHERE id = v_item.product_id AND is_active FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'product_unavailable';
    END IF;

    v_label := NULL;
    v_delta := 0;
    IF jsonb_array_length(COALESCE(v_product.variants, '[]'::jsonb)) = 0 THEN
      IF v_item.variant_id <> 'default' THEN
        RAISE EXCEPTION 'invalid_variant';
      END IF;
    ELSE
      SELECT elem->>'label', COALESCE((elem->>'price_delta')::bigint, 0)
      INTO v_label, v_delta
      FROM jsonb_array_elements(v_product.variants) AS elem
      WHERE elem->>'id' = v_item.variant_id
      LIMIT 1;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'invalid_variant';
      END IF;
    END IF;

    IF v_product.stock < v_item.quantity THEN
      RAISE EXCEPTION 'out_of_stock';
    END IF;

    UPDATE products SET stock = stock - v_item.quantity WHERE id = v_product.id;

    v_unit := v_product.price_toman + v_delta;
    v_line := v_unit * v_item.quantity;
    v_subtotal := v_subtotal + v_line;

    INSERT INTO order_items (
      order_id, product_id, product_name, brand, variant_id, variant_label,
      unit_price_toman, quantity, line_total_toman
    ) VALUES (
      v_order_id, v_product.id, v_product.name, v_product.brand, v_item.variant_id, v_label,
      v_unit, v_item.quantity, v_line
    );
  END LOOP;

  IF p_delivery_method = 'courier' THEN
    v_fee := CASE WHEN v_subtotal >= v_store.courier_free_threshold_toman THEN 0 ELSE v_store.courier_fee_toman END;
  ELSE
    v_fee := v_store.post_fee_toman;
  END IF;

  UPDATE orders
  SET subtotal_toman = v_subtotal,
      delivery_fee_toman = v_fee,
      total_toman = v_subtotal + v_fee,
      updated_at = now()
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;

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

  IF NOT (SELECT card_payment_enabled FROM payment_settings WHERE id = 1) THEN
    RAISE EXCEPTION 'payments_disabled';
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


-- =====================================================================
-- Migration: 20261030062938_create_admin_account_management.sql
-- =====================================================================
/*
# Administrator account management

1. Plain-English summary
- The first person to sign up and claim the dashboard becomes the owner. After that, the claim option disappears.
- Owners can add administrators by the email of an existing account, set their username and role, change roles, and remove them.
- Roles: owner (everything), manager (store, payment, and bank settings plus payment reviews), reviewer (payment reviews only).
- Passwords stay with the sign-in system. Admins change their own password from the dashboard, and owners can send a reset email to other admins.

2. New functions
- `admin_bootstrap_status()`: tells the dashboard whether any admin exists yet.
- `claim_first_owner(username)`: creates the first owner. Refuses once any admin exists.
- `admin_me()`: returns the caller's role and username.
- `admin_list_admins()`: lists administrators with their email and role. Any admin can view it.
- `admin_add_admin`, `admin_update_admin`, `admin_remove_admin`: owner only.

3. Security
- Every function checks the caller's role on the server before doing anything.
- Owners cannot remove or demote the last remaining owner, and cannot remove themselves.
- Usernames are lowercase letters, digits, and underscores, 3 to 30 characters, and unique.
- The admin list stays hidden from customers; only these functions return it.
*/

CREATE OR REPLACE FUNCTION public.admin_bootstrap_status()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users);
$$;

CREATE OR REPLACE FUNCTION public.claim_first_owner(p_username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_username text := lower(btrim(COALESCE(p_username, '')));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_username !~ '^[a-z0-9_]{3,30}$' THEN
    RAISE EXCEPTION 'invalid_username';
  END IF;

  LOCK TABLE public.admin_users IN EXCLUSIVE MODE;

  IF EXISTS (SELECT 1 FROM public.admin_users) THEN
    RAISE EXCEPTION 'owner_exists';
  END IF;

  BEGIN
    INSERT INTO public.admin_users (user_id, username, role) VALUES (v_uid, v_username, 'owner');
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'username_taken';
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_me()
RETURNS TABLE (admin_role text, admin_username text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.role, a.username FROM public.admin_users a WHERE a.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.admin_list_admins()
RETURNS TABLE (
  admin_user_id uuid,
  admin_email text,
  admin_username text,
  admin_role text,
  admin_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_admin_role() IS NULL THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
    SELECT a.user_id, u.email::text, a.username, a.role, a.created_at
    FROM public.admin_users a
    JOIN auth.users u ON u.id = a.user_id
    ORDER BY a.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_admin(p_email text, p_username text, p_role text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(COALESCE(p_email, '')));
  v_username text := lower(btrim(COALESCE(p_username, '')));
  v_target uuid;
BEGIN
  IF public.current_admin_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF char_length(v_email) > 254 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF v_username !~ '^[a-z0-9_]{3,30}$' THEN
    RAISE EXCEPTION 'invalid_username';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('owner', 'manager', 'reviewer') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  SELECT id INTO v_target FROM auth.users WHERE lower(email) = v_email LIMIT 1;
  IF v_target IS NULL THEN
    RAISE EXCEPTION 'account_not_found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = v_target) THEN
    RAISE EXCEPTION 'already_admin';
  END IF;

  BEGIN
    INSERT INTO public.admin_users (user_id, username, role) VALUES (v_target, v_username, p_role);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'username_taken';
  END;

  RETURN v_target;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_admin(p_user_id uuid, p_username text, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text := lower(btrim(COALESCE(p_username, '')));
  v_current text;
BEGIN
  IF public.current_admin_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_username !~ '^[a-z0-9_]{3,30}$' THEN
    RAISE EXCEPTION 'invalid_username';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('owner', 'manager', 'reviewer') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  SELECT role INTO v_current FROM public.admin_users WHERE user_id = p_user_id FOR UPDATE;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'admin_not_found';
  END IF;

  IF v_current = 'owner' AND p_role <> 'owner'
    AND (SELECT count(*) FROM public.admin_users WHERE role = 'owner') <= 1 THEN
    RAISE EXCEPTION 'last_owner';
  END IF;

  BEGIN
    UPDATE public.admin_users SET username = v_username, role = p_role WHERE user_id = p_user_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'username_taken';
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_admin(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current text;
BEGIN
  IF public.current_admin_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_remove_self';
  END IF;

  SELECT role INTO v_current FROM public.admin_users WHERE user_id = p_user_id FOR UPDATE;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'admin_not_found';
  END IF;

  IF v_current = 'owner' AND (SELECT count(*) FROM public.admin_users WHERE role = 'owner') <= 1 THEN
    RAISE EXCEPTION 'last_owner';
  END IF;

  DELETE FROM public.admin_users WHERE user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_bootstrap_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_bootstrap_status() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_first_owner(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_owner(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_me() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_list_admins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_admins() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_add_admin(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_admin(text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_admin(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_admin(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_remove_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_admin(uuid) TO authenticated;


-- =====================================================================
-- Migration: 20261030070750_harden_table_privileges.sql
-- =====================================================================
-- Least-privilege table grants: remove TRUNCATE/REFERENCES/TRIGGER and any
-- write grants that no policy or client path uses. Writes go through
-- SECURITY DEFINER RPCs, which run as the table owner.

REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON products, categories, banners, stories, reviews, store_settings, payment_settings, payment_receipts, orders, order_items FROM anon, authenticated;

REVOKE UPDATE ON addresses FROM authenticated;


-- =====================================================================
-- Migration: 20261030071418_admin_catalog_content_write_access.sql
-- =====================================================================
/*
# Admin write access for storefront catalog content

1. Summary
- Lets signed-in admins create, edit, and delete products, categories, banners, stories, and reviews from the admin panel.
- Adds an image bucket for catalog media that only admins can upload to. Images are publicly readable so the storefront can show them.

2. Security
- Writes are gated by the existing is_admin() check, so customers and anonymous visitors still cannot change catalog content.
- Admins can read inactive and unpublished rows so they can manage them.
- Each table gets separate insert, update, and delete policies.
- Storage uploads and deletes in the catalog bucket are restricted to admins.

3. Notes
- Existing public read policies are unchanged.
- Nothing is dropped or altered; only policies, grants, and one storage bucket are added.
*/

GRANT INSERT, UPDATE, DELETE ON products, categories, banners, stories, reviews TO authenticated;
GRANT SELECT ON products, categories, banners, stories, reviews TO authenticated;

DROP POLICY IF EXISTS "admin_select_products" ON products;
CREATE POLICY "admin_select_products" ON products FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_products" ON products;
CREATE POLICY "admin_insert_products" ON products FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_products" ON products;
CREATE POLICY "admin_update_products" ON products FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_delete_products" ON products;
CREATE POLICY "admin_delete_products" ON products FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_select_categories" ON categories;
CREATE POLICY "admin_select_categories" ON categories FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_categories" ON categories;
CREATE POLICY "admin_insert_categories" ON categories FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_categories" ON categories;
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_select_banners" ON banners;
CREATE POLICY "admin_select_banners" ON banners FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_banners" ON banners;
CREATE POLICY "admin_insert_banners" ON banners FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_banners" ON banners;
CREATE POLICY "admin_update_banners" ON banners FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_delete_banners" ON banners;
CREATE POLICY "admin_delete_banners" ON banners FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_select_stories" ON stories;
CREATE POLICY "admin_select_stories" ON stories FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_stories" ON stories;
CREATE POLICY "admin_insert_stories" ON stories FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_stories" ON stories;
CREATE POLICY "admin_update_stories" ON stories FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_delete_stories" ON stories;
CREATE POLICY "admin_delete_stories" ON stories FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "admin_select_reviews" ON reviews;
CREATE POLICY "admin_select_reviews" ON reviews FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_reviews" ON reviews;
CREATE POLICY "admin_insert_reviews" ON reviews FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_reviews" ON reviews;
CREATE POLICY "admin_update_reviews" ON reviews FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_delete_reviews" ON reviews;
CREATE POLICY "admin_delete_reviews" ON reviews FOR DELETE TO authenticated USING (is_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('catalog-media', 'catalog-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "admin_insert_catalog_media" ON storage.objects;
CREATE POLICY "admin_insert_catalog_media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'catalog-media' AND is_admin());
DROP POLICY IF EXISTS "admin_update_catalog_media" ON storage.objects;
CREATE POLICY "admin_update_catalog_media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'catalog-media' AND is_admin()) WITH CHECK (bucket_id = 'catalog-media' AND is_admin());
DROP POLICY IF EXISTS "admin_delete_catalog_media" ON storage.objects;
CREATE POLICY "admin_delete_catalog_media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'catalog-media' AND is_admin());


-- =====================================================================
-- Migration: 20261030071539_restrict_catalog_writes_to_content_managers.sql
-- =====================================================================
/*
# Restrict catalog content writes to owners and managers

1. Summary
- Catalog content (products, categories, banners, stories, reviews, and catalog images) can now be changed only by owners and managers.
- Reviewers can still sign in to the admin area, but they cannot change catalog content.

2. Security
- Adds a helper function that checks the caller's role in the admin roles table.
- Replaces the write policies created earlier so they use this helper instead of the general admin check.
- Admins can still read all catalog rows, including inactive ones.

3. Notes
- Nothing is dropped; only functions and policies are replaced.
*/

CREATE OR REPLACE FUNCTION public.is_content_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_content_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_content_manager() TO authenticated;

DROP POLICY IF EXISTS "admin_insert_products" ON products;
CREATE POLICY "admin_insert_products" ON products FOR INSERT TO authenticated WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_update_products" ON products;
CREATE POLICY "admin_update_products" ON products FOR UPDATE TO authenticated USING (is_content_manager()) WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_delete_products" ON products;
CREATE POLICY "admin_delete_products" ON products FOR DELETE TO authenticated USING (is_content_manager());

DROP POLICY IF EXISTS "admin_insert_categories" ON categories;
CREATE POLICY "admin_insert_categories" ON categories FOR INSERT TO authenticated WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_update_categories" ON categories;
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE TO authenticated USING (is_content_manager()) WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE TO authenticated USING (is_content_manager());

DROP POLICY IF EXISTS "admin_insert_banners" ON banners;
CREATE POLICY "admin_insert_banners" ON banners FOR INSERT TO authenticated WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_update_banners" ON banners;
CREATE POLICY "admin_update_banners" ON banners FOR UPDATE TO authenticated USING (is_content_manager()) WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_delete_banners" ON banners;
CREATE POLICY "admin_delete_banners" ON banners FOR DELETE TO authenticated USING (is_content_manager());

DROP POLICY IF EXISTS "admin_insert_stories" ON stories;
CREATE POLICY "admin_insert_stories" ON stories FOR INSERT TO authenticated WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_update_stories" ON stories;
CREATE POLICY "admin_update_stories" ON stories FOR UPDATE TO authenticated USING (is_content_manager()) WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_delete_stories" ON stories;
CREATE POLICY "admin_delete_stories" ON stories FOR DELETE TO authenticated USING (is_content_manager());

DROP POLICY IF EXISTS "admin_insert_reviews" ON reviews;
CREATE POLICY "admin_insert_reviews" ON reviews FOR INSERT TO authenticated WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_update_reviews" ON reviews;
CREATE POLICY "admin_update_reviews" ON reviews FOR UPDATE TO authenticated USING (is_content_manager()) WITH CHECK (is_content_manager());
DROP POLICY IF EXISTS "admin_delete_reviews" ON reviews;
CREATE POLICY "admin_delete_reviews" ON reviews FOR DELETE TO authenticated USING (is_content_manager());

DROP POLICY IF EXISTS "admin_insert_catalog_media" ON storage.objects;
CREATE POLICY "admin_insert_catalog_media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'catalog-media' AND is_content_manager());
DROP POLICY IF EXISTS "admin_update_catalog_media" ON storage.objects;
CREATE POLICY "admin_update_catalog_media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'catalog-media' AND is_content_manager()) WITH CHECK (bucket_id = 'catalog-media' AND is_content_manager());
DROP POLICY IF EXISTS "admin_delete_catalog_media" ON storage.objects;
CREATE POLICY "admin_delete_catalog_media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'catalog-media' AND is_content_manager());


-- =====================================================================
-- Migration: 20261030071957_create_site_texts_overrides.sql
-- =====================================================================
/*
# Editable site text overrides

1. New Table
- `site_texts`: stores only the text the owner has changed from the built-in wording.
  - `key` (text, primary key): stable identifier such as `home_bestsellers_title`.
  - `value` (text, not null, max 1000 characters): the replacement text.
  - `updated_at` (timestamptz): last time the text was changed.

2. Security
- Row level security is enabled.
- Anyone (anon and signed-in users) can read rows so the storefront shows the saved text.
- Only owners and managers (checked with is_content_manager) can insert, update, or delete rows.
- Grants are limited to SELECT for anon and authenticated, and INSERT, UPDATE, DELETE for authenticated.

3. Notes
- No default rows are inserted. When a key has no row, the storefront shows the built-in wording.
- Deleting a row restores the built-in wording for that key.
*/

CREATE TABLE IF NOT EXISTS site_texts (
  key text PRIMARY KEY CHECK (key ~ '^[a-z0-9_]{3,60}$'),
  value text NOT NULL CHECK (char_length(value) BETWEEN 1 AND 1000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_texts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON site_texts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON site_texts TO authenticated;

DROP POLICY IF EXISTS "public_select_site_texts" ON site_texts;
CREATE POLICY "public_select_site_texts" ON site_texts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "content_insert_site_texts" ON site_texts;
CREATE POLICY "content_insert_site_texts" ON site_texts FOR INSERT
  TO authenticated WITH CHECK (is_content_manager());

DROP POLICY IF EXISTS "content_update_site_texts" ON site_texts;
CREATE POLICY "content_update_site_texts" ON site_texts FOR UPDATE
  TO authenticated USING (is_content_manager()) WITH CHECK (is_content_manager());

DROP POLICY IF EXISTS "content_delete_site_texts" ON site_texts;
CREATE POLICY "content_delete_site_texts" ON site_texts FOR DELETE
  TO authenticated USING (is_content_manager());


-- =====================================================================
-- Migration: 20261030072506_order_management_status_history_and_stock_restore.sql
-- =====================================================================
/*
# Order management: statuses, tracking, history, and stock restore

1. Plain-English summary
- Orders can now move through preparing and refunded in addition to the existing statuses.
- Store staff can record a shipping tracking code and delivery notes on each order.
- Every status change is written to a history log with who changed it and when.
- Cancelling or refunding an order returns its reserved stock to the products.

2. Changes to orders
- The status list now includes `preparing` and `refunded`.
- New columns: `tracking_code` (text, optional), `delivery_note` (text, optional), `cancelled_at` and `refunded_at` (timestamps, optional).

3. New table
- `order_status_events`: one row per status change with the previous status, new status, note, and the admin who made the change.

4. New function
- `admin_update_order_status(order, new status, note, tracking code)`: owner or manager only. Validates the status and the transition, updates the order, writes a history row, and restores stock when moving into cancelled or refunded from an active status.

5. Security
- Row level security is enabled on the history table. Admins can read it; nobody can write to it directly.
- The status function is callable only by signed-in users and checks the admin role on every call.
- No data is removed. Existing orders keep their status and items.
*/

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'awaiting_payment', 'pending_review', 'paid', 'processing', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded'
));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code text CHECK (tracking_code IS NULL OR char_length(tracking_code) BETWEEN 3 AND 60);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_note text CHECK (delivery_note IS NULL OR char_length(delivery_note) <= 500);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

CREATE TABLE IF NOT EXISTS order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_status_events_order_idx ON order_status_events (order_id, created_at DESC);

ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON order_status_events FROM PUBLIC, anon;
GRANT SELECT ON order_status_events TO authenticated;

DROP POLICY IF EXISTS "select_admin_order_events" ON order_status_events;
CREATE POLICY "select_admin_order_events" ON order_status_events FOR SELECT
  TO authenticated USING (public.is_admin());

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
    WHEN 'paid' THEN ARRAY['processing', 'cancelled', 'refunded']
    WHEN 'processing' THEN ARRAY['preparing', 'cancelled', 'refunded']
    WHEN 'preparing' THEN ARRAY['shipped', 'cancelled', 'refunded']
    WHEN 'shipped' THEN ARRAY['delivered', 'refunded']
    WHEN 'delivered' THEN ARRAY['refunded']
    WHEN 'cancelled' THEN ARRAY[]::text[]
    WHEN 'refunded' THEN ARRAY[]::text[]
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


-- =====================================================================
-- Migration: 20261030073115_customer_management_admin_rpcs.sql
-- =====================================================================
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


-- =====================================================================
-- Migration: 20261030073331_payment_administration_gateways_and_review_history.sql
-- =====================================================================
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


-- =====================================================================
-- Migration: 20261030073541_editable_info_pages_with_seo.sql
-- =====================================================================
/*
# Editable info pages with SEO fields

1. New table
- `info_pages`: one row per info page (`faq`, `shipping`, `returns`, `contact`, `privacy`, `terms`).
  - `slug` (primary key, restricted to those six values).
  - `title`, `lead`: visible heading and intro text.
  - `sections` (jsonb): list of sections in the same shape as the built-in pages (heading, paragraphs, and optional bullets, questions and cards).
  - `seo_title`, `seo_description`: search engine title and description.
  - `status`: `draft` or `published`. Only published rows are shown to visitors.
  - `updated_at`.
- Pages with no row keep showing the built-in content, so nothing disappears.

2. Security
- RLS enabled.
- Visitors (anon and signed-in) can read published rows only.
- Admins can read every row, including drafts.
- No direct write access. Changes go through `admin_upsert_info_page`, which requires content-manager rights (owner or manager) and validates every field.
- The function is SECURITY DEFINER with a fixed search path, revoked from PUBLIC and anon, and granted to authenticated.

3. Notes
- Length limits: title 120, lead 500, SEO title 70, SEO description 200, up to 30 sections, each heading up to 120 characters.
*/

CREATE TABLE IF NOT EXISTS info_pages (
  slug text PRIMARY KEY CHECK (slug IN ('faq', 'shipping', 'returns', 'contact', 'privacy', 'terms')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  lead text NOT NULL DEFAULT '' CHECK (char_length(lead) <= 500),
  sections jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sections) = 'array'),
  seo_title text NOT NULL DEFAULT '' CHECK (char_length(seo_title) <= 70),
  seo_description text NOT NULL DEFAULT '' CHECK (char_length(seo_description) <= 200),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE info_pages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON info_pages FROM anon, authenticated;
GRANT SELECT ON info_pages TO anon, authenticated;

DROP POLICY IF EXISTS "select_published_info_pages" ON info_pages;
CREATE POLICY "select_published_info_pages" ON info_pages FOR SELECT
  TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS "select_admin_info_pages" ON info_pages;
CREATE POLICY "select_admin_info_pages" ON info_pages FOR SELECT
  TO authenticated USING (is_admin());

CREATE OR REPLACE FUNCTION admin_upsert_info_page(
  p_slug text,
  p_title text,
  p_lead text,
  p_sections jsonb,
  p_seo_title text,
  p_seo_description text,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_section jsonb;
  v_count integer;
BEGIN
  IF NOT is_content_manager() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_slug NOT IN ('faq', 'shipping', 'returns', 'contact', 'privacy', 'terms') THEN
    RAISE EXCEPTION 'invalid_page';
  END IF;

  IF char_length(trim(coalesce(p_title, ''))) NOT BETWEEN 1 AND 120
     OR char_length(coalesce(p_lead, '')) > 500
     OR char_length(coalesce(p_seo_title, '')) > 70
     OR char_length(coalesce(p_seo_description, '')) > 200
     OR p_status NOT IN ('draft', 'published') THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;

  IF p_sections IS NULL OR jsonb_typeof(p_sections) <> 'array' THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;

  v_count := jsonb_array_length(p_sections);
  IF v_count > 30 THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;

  FOR v_section IN SELECT value FROM jsonb_array_elements(p_sections) LOOP
    IF jsonb_typeof(v_section) <> 'object'
       OR char_length(trim(coalesce(v_section->>'heading', ''))) NOT BETWEEN 1 AND 120 THEN
      RAISE EXCEPTION 'invalid_request';
    END IF;
  END LOOP;

  INSERT INTO info_pages (slug, title, lead, sections, seo_title, seo_description, status, updated_at)
  VALUES (p_slug, trim(p_title), coalesce(p_lead, ''), p_sections, coalesce(p_seo_title, ''), coalesce(p_seo_description, ''), p_status, now())
  ON CONFLICT (slug) DO UPDATE
  SET title = EXCLUDED.title,
      lead = EXCLUDED.lead,
      sections = EXCLUDED.sections,
      seo_title = EXCLUDED.seo_title,
      seo_description = EXCLUDED.seo_description,
      status = EXCLUDED.status,
      updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_upsert_info_page(text, text, text, jsonb, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_upsert_info_page(text, text, text, jsonb, text, text, text) TO authenticated;


-- =====================================================================
-- Migration: 20261030080210_allow_admin_cancel_unpaid_orders.sql
-- =====================================================================
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


-- =====================================================================
-- Migration: 20261030080359_restrict_profile_columns_for_customers.sql
-- =====================================================================
/*
# Restrict customer writes on profiles to their own name and phone

1. Plain-English summary
- Customers can still read and edit their own full name and phone number.
- Customers can no longer change their account block status or read or write the internal admin note. Previously the table-wide grant let a blocked customer unblock themselves through the API.

2. Changes
- Removes all table-level privileges on profiles from the browser roles.
- Re-grants SELECT on the safe columns and UPDATE on full name, phone and the timestamp.
- Admin screens and the signup trigger run with elevated rights and are unaffected.

3. Security
- Existing row-level policies (own row only) are kept.
*/

REVOKE ALL ON profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, full_name, phone, created_at, updated_at) ON profiles TO authenticated;
GRANT UPDATE (full_name, phone, updated_at) ON profiles TO authenticated;


-- =====================================================================
-- Migration: 20261030080435_enforce_card_payment_switch_on_receipts.sql
-- =====================================================================
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


-- =====================================================================
-- Migration: 20261030080726_revoke_public_execute_on_order_trigger_function.sql
-- =====================================================================
/*
# Revoke API execute on the blocked-customer order trigger function

1. What changes
- `prevent_blocked_customer_orders` is a trigger function attached to `orders`.
- It was executable through the public API by anon and authenticated, which lets a caller invoke a trigger-only function directly.

2. Security
- REVOKE EXECUTE from PUBLIC, anon and authenticated.
- Triggers fire regardless of EXECUTE grants on the trigger function, so blocking still works for every order insert.

3. Data
- No tables, rows or policies are modified.
*/

REVOKE EXECUTE ON FUNCTION public.prevent_blocked_customer_orders() FROM PUBLIC, anon, authenticated;


-- =====================================================================
-- Migration: 20261030082837_secure_one_time_owner_bootstrap.sql
-- =====================================================================
/*
# Secure one-time owner bootstrap

## Plain-English summary
Before this migration, any signed-in customer could call a public function and make themselves the store owner while no admin existed. This migration removes that function and replaces it with a bootstrap that can only be run by the server, and only once.

## New objects
- `owner_bootstrap`: a single-row table that records whether the one-time owner setup has been used. It has no client access at all.
- `bootstrap_first_owner(p_user_id, p_username)`: creates the first owner. Only the server (service role) may execute it. It marks the bootstrap as used in the same transaction as the owner insert, so a failure leaves the bootstrap open and a success closes it permanently.

## Changed objects
- `admin_bootstrap_status()`: still returns a boolean (true means setup is closed). It now also returns true once the one-time bootstrap has been used.

## Removed objects
- `claim_first_owner(p_username)`: dropped. It was the vulnerability.

## Security
- RLS enabled on `owner_bootstrap` with no policies and no grants to anon or authenticated.
- `bootstrap_first_owner` is revoked from PUBLIC, anon and authenticated, and granted only to service_role.
- Concurrency: the bootstrap row is updated with a conditional UPDATE that locks the row. A second concurrent call waits, then finds the bootstrap already used and fails.
- Atomicity: the owner insert and the bootstrap completion are one transaction. If the insert fails (for example, a username conflict), the bootstrap stays open.

## Data
- No existing rows are changed or deleted. The admin table is not touched.
*/

CREATE TABLE IF NOT EXISTS public.owner_bootstrap (
  id smallint PRIMARY KEY CHECK (id = 1),
  completed_at timestamptz,
  completed_user_id uuid
);

INSERT INTO public.owner_bootstrap (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.owner_bootstrap ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.owner_bootstrap FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bootstrap_first_owner(p_user_id uuid, p_username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text := lower(btrim(COALESCE(p_username, '')));
  v_claimed integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_username !~ '^[a-z0-9_]{3,30}$' THEN
    RAISE EXCEPTION 'invalid_username';
  END IF;

  UPDATE public.owner_bootstrap
  SET completed_at = now(), completed_user_id = p_user_id
  WHERE id = 1 AND completed_at IS NULL;
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    RAISE EXCEPTION 'bootstrap_closed';
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_users) THEN
    RAISE EXCEPTION 'bootstrap_closed';
  END IF;

  BEGIN
    INSERT INTO public.admin_users (user_id, username, role)
    VALUES (p_user_id, v_username, 'owner');
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'username_taken';
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bootstrap_first_owner(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_owner(uuid, text) TO service_role;

DROP FUNCTION IF EXISTS public.claim_first_owner(text);

CREATE OR REPLACE FUNCTION public.admin_bootstrap_status()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT EXISTS (SELECT 1 FROM public.admin_users)
OR COALESCE((SELECT completed_at IS NOT NULL FROM public.owner_bootstrap WHERE id = 1), false);
$$;


-- =====================================================================
-- Migration: 20261031051251_payment_checkout_online_gateways_and_receipt_details.sql
-- =====================================================================
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


-- =====================================================================
-- Migration: 20261031052034_admin_dashboard_and_product_costs.sql
-- =====================================================================
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


-- =====================================================================
-- Migration: 20261031053513_storefront_coupons_samples_questions_and_product_styling.sql
-- =====================================================================
/*
# Coupons, free samples, product questions, product card styling and order extras

## Summary
Adds the database foundation for discount codes, free sample offers, customer questions on products, product card styling with animations, amazing-offer timers, and delivery slot and promotion details on orders. Nothing existing is removed or changed in behaviour.

## 1. New tables
- `coupons`: discount codes. Each code has a type (percent or fixed amount), a value, an optional minimum subtotal, an optional usage limit, an optional start and end time, and an active switch. Codes are stored in upper case.
- `free_samples`: free sample offers that a customer can add to an order. Each has a title, description, image, minimum subtotal, active switch and sort order.
- `product_questions`: questions customers ask about a product. Admins answer them. Only published questions (with an answer) are visible to shoppers. Customer identities are never exposed.

## 2. Changes to existing tables
- `products`:
  - `card_bg_type` (color, preset or image; default color)
  - `card_bg_value` (the colour, preset name or image address)
  - `animation_type` (float, zoom, rotate3d or pulse-glow; empty means none)
  - `is_amazing_offer` (shows the amazing-offer countdown when true)
  - `offer_ends_at` (when the amazing offer ends)
  - The existing `variants` column is reused for colour and size options. No new column is added for it.
- `orders`:
  - `delivery_slot` (date and time window, for example 2026-11-02 09-12)
  - `free_sample_title` (the sample chosen for the order)
  - `coupon_code` (the discount code used)

## 3. Security
- `coupons` and `free_samples` writes and coupon reads are limited to content managers (checked with `is_content_manager()`). Shoppers cannot list coupon codes.
- `free_samples`: shoppers see only active samples. Anonymous visitors have read access to active samples only.
- `product_questions`:
  - Shoppers and anonymous visitors see only published questions, and the author identifier column is never granted to them.
  - Signed-in shoppers can ask a question only for themselves, only for active products, and cannot pre-fill an answer or publish it.
  - Only content managers can answer, publish or delete questions.
- Each table has row level security enabled, with separate select, insert, update and delete policies and explicit grants.

## 4. Important notes
1. Applying a coupon or claiming a free sample at checkout is not part of this migration. Order placement is unchanged for now.
2. Coupon usage counts are maintained by the checkout step when it is built.
3. Column constraints keep stored values within the allowed options, so bad data cannot be saved by mistake.
*/

ALTER TABLE products ADD COLUMN IF NOT EXISTS card_bg_type text NOT NULL DEFAULT 'color';
ALTER TABLE products ADD COLUMN IF NOT EXISTS card_bg_value text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS animation_type text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_amazing_offer boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS offer_ends_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_card_bg_type_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_card_bg_type_check CHECK (card_bg_type IN ('color', 'preset', 'image'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_animation_type_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_animation_type_check CHECK (animation_type IS NULL OR animation_type IN ('float', 'zoom', 'rotate3d', 'pulse-glow'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_card_bg_value_length') THEN
    ALTER TABLE products ADD CONSTRAINT products_card_bg_value_length CHECK (card_bg_value IS NULL OR char_length(card_bg_value) <= 500);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  discount_type text NOT NULL,
  discount_value integer NOT NULL,
  min_subtotal_toman bigint NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_code_format CHECK (code ~ '^[A-Z0-9_-]{3,20}$'),
  CONSTRAINT coupons_discount_type_check CHECK (discount_type IN ('percent', 'amount')),
  CONSTRAINT coupons_discount_value_range CHECK (
    (discount_type = 'percent' AND discount_value BETWEEN 1 AND 100)
    OR (discount_type = 'amount' AND discount_value BETWEEN 1 AND 1000000000)
  ),
  CONSTRAINT coupons_min_subtotal_range CHECK (min_subtotal_toman BETWEEN 0 AND 1000000000),
  CONSTRAINT coupons_max_uses_positive CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT coupons_used_count_nonnegative CHECK (used_count >= 0),
  CONSTRAINT coupons_window_order CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_key ON coupons (code);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON coupons TO authenticated;

DROP POLICY IF EXISTS "content_select_coupons" ON coupons;
CREATE POLICY "content_select_coupons" ON coupons FOR SELECT
  TO authenticated USING (public.is_content_manager());

DROP POLICY IF EXISTS "content_insert_coupons" ON coupons;
CREATE POLICY "content_insert_coupons" ON coupons FOR INSERT
  TO authenticated WITH CHECK (public.is_content_manager());

DROP POLICY IF EXISTS "content_update_coupons" ON coupons;
CREATE POLICY "content_update_coupons" ON coupons FOR UPDATE
  TO authenticated USING (public.is_content_manager()) WITH CHECK (public.is_content_manager());

DROP POLICY IF EXISTS "content_delete_coupons" ON coupons;
CREATE POLICY "content_delete_coupons" ON coupons FOR DELETE
  TO authenticated USING (public.is_content_manager());

CREATE TABLE IF NOT EXISTS free_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  min_subtotal_toman bigint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT free_samples_title_length CHECK (char_length(title) BETWEEN 2 AND 120),
  CONSTRAINT free_samples_description_length CHECK (char_length(description) <= 300),
  CONSTRAINT free_samples_image_length CHECK (char_length(image_url) <= 500),
  CONSTRAINT free_samples_min_subtotal_range CHECK (min_subtotal_toman BETWEEN 0 AND 1000000000),
  CONSTRAINT free_samples_sort_order_range CHECK (sort_order BETWEEN 0 AND 10000)
);

CREATE INDEX IF NOT EXISTS free_samples_active_sort_idx ON free_samples (is_active, sort_order);

ALTER TABLE free_samples ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON free_samples TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON free_samples TO authenticated;

DROP POLICY IF EXISTS "public_select_active_free_samples" ON free_samples;
CREATE POLICY "public_select_active_free_samples" ON free_samples FOR SELECT
  TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "content_select_free_samples" ON free_samples;
CREATE POLICY "content_select_free_samples" ON free_samples FOR SELECT
  TO authenticated USING (public.is_content_manager());

DROP POLICY IF EXISTS "content_insert_free_samples" ON free_samples;
CREATE POLICY "content_insert_free_samples" ON free_samples FOR INSERT
  TO authenticated WITH CHECK (public.is_content_manager());

DROP POLICY IF EXISTS "content_update_free_samples" ON free_samples;
CREATE POLICY "content_update_free_samples" ON free_samples FOR UPDATE
  TO authenticated USING (public.is_content_manager()) WITH CHECK (public.is_content_manager());

DROP POLICY IF EXISTS "content_delete_free_samples" ON free_samples;
CREATE POLICY "content_delete_free_samples" ON free_samples FOR DELETE
  TO authenticated USING (public.is_content_manager());

CREATE TABLE IF NOT EXISTS product_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text,
  answered_at timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_questions_question_length CHECK (char_length(question) BETWEEN 5 AND 500),
  CONSTRAINT product_questions_answer_length CHECK (answer IS NULL OR char_length(answer) BETWEEN 1 AND 2000),
  CONSTRAINT product_questions_published_requires_answer CHECK (NOT is_published OR answer IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS product_questions_product_idx ON product_questions (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS product_questions_user_idx ON product_questions (user_id);

ALTER TABLE product_questions ENABLE ROW LEVEL SECURITY;

GRANT SELECT (id, product_id, question, answer, answered_at, is_published, created_at) ON product_questions TO anon, authenticated;
GRANT INSERT (product_id, user_id, question) ON product_questions TO authenticated;
GRANT UPDATE (answer, answered_at, is_published) ON product_questions TO authenticated;
GRANT DELETE ON product_questions TO authenticated;

DROP POLICY IF EXISTS "public_select_published_questions" ON product_questions;
CREATE POLICY "public_select_published_questions" ON product_questions FOR SELECT
  TO anon, authenticated USING (is_published);

DROP POLICY IF EXISTS "content_select_questions" ON product_questions;
CREATE POLICY "content_select_questions" ON product_questions FOR SELECT
  TO authenticated USING (public.is_content_manager());

DROP POLICY IF EXISTS "owner_insert_questions" ON product_questions;
CREATE POLICY "owner_insert_questions" ON product_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND answer IS NULL
    AND is_published = false
    AND EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.is_active)
  );

DROP POLICY IF EXISTS "content_update_questions" ON product_questions;
CREATE POLICY "content_update_questions" ON product_questions FOR UPDATE
  TO authenticated USING (public.is_content_manager()) WITH CHECK (public.is_content_manager());

DROP POLICY IF EXISTS "content_delete_questions" ON product_questions;
CREATE POLICY "content_delete_questions" ON product_questions FOR DELETE
  TO authenticated USING (public.is_content_manager());

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS free_sample_title text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_slot_format') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_delivery_slot_format
      CHECK (delivery_slot IS NULL OR delivery_slot ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} (09-12|12-15|15-18|18-21)$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_free_sample_title_length') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_free_sample_title_length CHECK (free_sample_title IS NULL OR char_length(free_sample_title) <= 120);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_coupon_code_format') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_coupon_code_format CHECK (coupon_code IS NULL OR coupon_code ~ '^[A-Z0-9_-]{3,20}$');
  END IF;
END $$;


-- =====================================================================
-- Migration: 20261031054600_place_order_coupons_samples_delivery_slot.sql
-- =====================================================================
/*
# Coupons, free samples and delivery slots at checkout

## Summary
Order placement now accepts a coupon code, a free sample choice and a courier delivery time slot. All rules are enforced on the server, so prices and discounts can not be changed by the browser.

## 1. New functions
- `validate_coupon(code, subtotal)`: lets the cart preview a discount before checkout. Returns the coupon code and the discount amount in toman, or an error if the code is not usable.
- `coupon_discount_toman(coupon, subtotal)`: internal helper that checks whether a coupon can be used (active, within dates, usage limit not reached, minimum order met) and calculates the discount. Not callable by shoppers.

## 2. Changed tables
- `orders.discount_amount`: the discount applied to the order (zero by default, never negative).

## 3. Changed order placement
- Accepts optional `delivery slot`, `coupon code` and `free sample id`.
- Courier orders require a delivery slot on a date that is today or later (Tehran time). Post orders must not have one.
- A coupon is checked and locked while the order is placed, and its usage count increases by one.
- The chosen free sample must be active and the order subtotal must meet its minimum. The sample title is stored on the order. Samples are not charged.
- Total = subtotal - discount + delivery fee.

## 4. Security
- Both new functions run with the owner's rights and only check inputs the shopper provides.
- Coupon internals are not granted to shoppers, so the full list of coupon rules is never exposed.
- Order placement is still limited to signed-in shoppers.

## 5. Notes
1. The delivery fee still uses the subtotal before discount, matching the price shown on the cart.
2. Coupon usage is counted when the order is placed, not when it is paid.
*/

ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount bigint NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_discount_amount_nonnegative') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_discount_amount_nonnegative CHECK (discount_amount >= 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.coupon_discount_toman(p_coupon coupons, p_subtotal bigint)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT p_coupon.is_active
    OR (p_coupon.starts_at IS NOT NULL AND p_coupon.starts_at > now())
    OR (p_coupon.ends_at IS NOT NULL AND p_coupon.ends_at < now()) THEN
    RAISE EXCEPTION 'coupon_invalid';
  END IF;
  IF p_coupon.max_uses IS NOT NULL AND p_coupon.used_count >= p_coupon.max_uses THEN
    RAISE EXCEPTION 'coupon_exhausted';
  END IF;
  IF p_subtotal < p_coupon.min_subtotal_toman THEN
    RAISE EXCEPTION 'coupon_min_subtotal';
  END IF;
  IF p_coupon.discount_type = 'percent' THEN
    RETURN floor(p_subtotal * p_coupon.discount_value / 100);
  END IF;
  RETURN LEAST(p_coupon.discount_value, p_subtotal);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.coupon_discount_toman(coupons, bigint) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_subtotal bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_coupon coupons%ROWTYPE;
BEGIN
  IF p_code IS NULL OR p_subtotal IS NULL OR p_subtotal < 0 THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;
  SELECT * INTO v_coupon FROM coupons WHERE code = upper(trim(p_code));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'coupon_invalid';
  END IF;
  RETURN jsonb_build_object(
    'code', v_coupon.code,
    'discount_toman', public.coupon_discount_toman(v_coupon, p_subtotal)
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, bigint) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.place_order(uuid, text, jsonb, text);

CREATE OR REPLACE FUNCTION public.place_order(
  p_address_id uuid,
  p_delivery_method text,
  p_items jsonb,
  p_idempotency_key text,
  p_delivery_slot text DEFAULT NULL,
  p_coupon_code text DEFAULT NULL,
  p_free_sample_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
v_uid uuid := auth.uid();
v_existing uuid;
v_address addresses%ROWTYPE;
v_order_id uuid;
v_product products%ROWTYPE;
v_item record;
v_label text;
v_delta bigint;
v_unit bigint;
v_line bigint;
v_subtotal bigint := 0;
v_fee bigint;
v_discount bigint := 0;
v_coupon coupons%ROWTYPE;
v_coupon_code text;
v_sample free_samples%ROWTYPE;
v_sample_title text;
v_store store_settings%ROWTYPE;
BEGIN
IF v_uid IS NULL THEN
RAISE EXCEPTION 'not_authenticated';
END IF;

IF p_idempotency_key IS NULL OR char_length(p_idempotency_key) NOT BETWEEN 8 AND 100 THEN
RAISE EXCEPTION 'invalid_request';
END IF;

SELECT id INTO v_existing FROM orders WHERE user_id = v_uid AND idempotency_key = p_idempotency_key;
IF v_existing IS NOT NULL THEN
RETURN v_existing;
END IF;

IF NOT (SELECT card_payment_enabled FROM payment_settings WHERE id = 1) THEN
RAISE EXCEPTION 'payments_disabled';
END IF;

IF p_delivery_method NOT IN ('courier', 'post') THEN
RAISE EXCEPTION 'invalid_request';
END IF;

IF p_delivery_method = 'courier' THEN
IF p_delivery_slot IS NULL
OR p_delivery_slot !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} (09-12|12-15|15-18|18-21)$'
OR left(p_delivery_slot, 10)::date < (now() AT TIME ZONE 'Asia/Tehran')::date THEN
RAISE EXCEPTION 'invalid_slot';
END IF;
ELSIF p_delivery_slot IS NOT NULL THEN
RAISE EXCEPTION 'invalid_slot';
END IF;

IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 30 THEN
RAISE EXCEPTION 'invalid_request';
END IF;

SELECT * INTO v_address FROM addresses WHERE id = p_address_id AND user_id = v_uid;
IF NOT FOUND THEN
RAISE EXCEPTION 'address_not_found';
END IF;

SELECT * INTO v_store FROM store_settings WHERE id = 1;

INSERT INTO orders (
user_id, idempotency_key, delivery_method, delivery_slot,
recipient_name, phone, province, city, street, postal_code
) VALUES (
v_uid, p_idempotency_key, p_delivery_method, p_delivery_slot,
v_address.recipient_name, v_address.phone, v_address.province, v_address.city, v_address.street, v_address.postal_code
)
RETURNING id INTO v_order_id;

FOR v_item IN
SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, variant_id text, quantity integer)
LOOP
IF v_item.product_id IS NULL OR v_item.variant_id IS NULL
OR v_item.quantity IS NULL OR v_item.quantity NOT BETWEEN 1 AND 20 THEN
RAISE EXCEPTION 'invalid_request';
END IF;

IF EXISTS (
SELECT 1 FROM order_items
WHERE order_id = v_order_id AND product_id = v_item.product_id AND variant_id = v_item.variant_id
) THEN
RAISE EXCEPTION 'invalid_request';
END IF;

SELECT * INTO v_product FROM products WHERE id = v_item.product_id AND is_active FOR UPDATE;
IF NOT FOUND THEN
RAISE EXCEPTION 'product_unavailable';
END IF;

v_label := NULL;
v_delta := 0;
IF jsonb_array_length(COALESCE(v_product.variants, '[]'::jsonb)) = 0 THEN
IF v_item.variant_id <> 'default' THEN
RAISE EXCEPTION 'invalid_variant';
END IF;
ELSE
SELECT elem->>'label', COALESCE((elem->>'price_delta')::bigint, 0)
INTO v_label, v_delta
FROM jsonb_array_elements(v_product.variants) AS elem
WHERE elem->>'id' = v_item.variant_id
LIMIT 1;
IF NOT FOUND THEN
RAISE EXCEPTION 'invalid_variant';
END IF;
END IF;

IF v_product.stock < v_item.quantity THEN
RAISE EXCEPTION 'out_of_stock';
END IF;

UPDATE products SET stock = stock - v_item.quantity WHERE id = v_product.id;

v_unit := v_product.price_toman + v_delta;
v_line := v_unit * v_item.quantity;
v_subtotal := v_subtotal + v_line;

INSERT INTO order_items (
order_id, product_id, product_name, brand, variant_id, variant_label,
unit_price_toman, quantity, line_total_toman
) VALUES (
v_order_id, v_product.id, v_product.name, v_product.brand, v_item.variant_id, v_label,
v_unit, v_item.quantity, v_line
);
END LOOP;

IF p_free_sample_id IS NOT NULL THEN
SELECT * INTO v_sample FROM free_samples WHERE id = p_free_sample_id AND is_active;
IF NOT FOUND OR v_subtotal < v_sample.min_subtotal_toman THEN
RAISE EXCEPTION 'sample_unavailable';
END IF;
v_sample_title := v_sample.title;
END IF;

IF p_coupon_code IS NOT NULL AND btrim(p_coupon_code) <> '' THEN
SELECT * INTO v_coupon FROM coupons WHERE code = upper(btrim(p_coupon_code)) FOR UPDATE;
IF NOT FOUND THEN
RAISE EXCEPTION 'coupon_invalid';
END IF;
v_discount := public.coupon_discount_toman(v_coupon, v_subtotal);
UPDATE coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
v_coupon_code := v_coupon.code;
END IF;

IF p_delivery_method = 'courier' THEN
v_fee := CASE WHEN v_subtotal >= v_store.courier_free_threshold_toman THEN 0 ELSE v_store.courier_fee_toman END;
ELSE
v_fee := v_store.post_fee_toman;
END IF;

UPDATE orders
SET subtotal_toman = v_subtotal,
discount_amount = v_discount,
coupon_code = v_coupon_code,
free_sample_title = v_sample_title,
delivery_fee_toman = v_fee,
total_toman = v_subtotal - v_discount + v_fee,
updated_at = now()
WHERE id = v_order_id;

RETURN v_order_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.place_order(uuid, text, jsonb, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, text, jsonb, text, text, text, uuid) TO authenticated;


-- =====================================================================
-- Migration: 20261031060000_product_image_display_and_review_pros_cons.sql
-- =====================================================================
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


-- =====================================================================
-- Migration: 20261101100000_claim_initial_owner_one_click.sql
-- =====================================================================
/*
# One-click, one-time owner claim

## Plain-English summary
Lets the first signed-in account become the store owner with a single click, without any server secret.
The claim works exactly once: as soon as an owner exists (or the one-time bootstrap is marked as used),
the function refuses every further call, permanently.

## New objects
- `claim_initial_owner(desired_username text default null)`: SECURITY DEFINER function, callable only by
  signed-in users. Inserts `auth.uid()` into `admin_users` with role `owner` and closes `owner_bootstrap`
  in the same transaction.

## Notes
- This project stores roles in `admin_users` (there is no role column on `profiles`).
- The secret-protected `bootstrap_first_owner` (service role) is left untouched.
- No existing rows are changed or deleted.

## Security
- EXECUTE revoked from PUBLIC and anon; granted to authenticated only.
- The conditional UPDATE on `owner_bootstrap` locks the row, so two simultaneous calls cannot both succeed.
- Fails with `bootstrap_closed` once any admin exists or the bootstrap was already used.
*/

CREATE OR REPLACE FUNCTION public.claim_initial_owner(desired_username text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_base text;
  v_username text;
  v_claimed integer;
  v_try integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Serialize concurrent claims and close the one-time bootstrap atomically.
  UPDATE public.owner_bootstrap
  SET completed_at = now(), completed_user_id = v_uid
  WHERE id = 1 AND completed_at IS NULL;
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    RAISE EXCEPTION 'bootstrap_closed';
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_users) THEN
    RAISE EXCEPTION 'bootstrap_closed';
  END IF;

  IF desired_username IS NOT NULL AND btrim(desired_username) <> '' THEN
    v_username := lower(btrim(desired_username));
    IF v_username !~ '^[a-z0-9_]{3,30}$' THEN
      RAISE EXCEPTION 'invalid_username';
    END IF;
  ELSE
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
    v_base := regexp_replace(lower(split_part(COALESCE(v_email, ''), '@', 1)), '[^a-z0-9_]', '', 'g');
    IF char_length(v_base) < 3 THEN
      v_base := 'owner';
    END IF;
    v_username := left(v_base, 30);
  END IF;

  LOOP
    BEGIN
      INSERT INTO public.admin_users (user_id, username, role)
      VALUES (v_uid, v_username, 'owner');
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF desired_username IS NOT NULL AND btrim(desired_username) <> '' THEN
        RAISE EXCEPTION 'username_taken';
      END IF;
      v_try := v_try + 1;
      IF v_try > 5 THEN
        RAISE EXCEPTION 'username_taken';
      END IF;
      v_username := left(v_base, 26) || '_' || substr(md5(random()::text), 1, 3);
    END;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_initial_owner(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_initial_owner(text) TO authenticated;


-- =====================================================================
-- Migration: 20261101100100_product_price_history.sql
-- =====================================================================
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

