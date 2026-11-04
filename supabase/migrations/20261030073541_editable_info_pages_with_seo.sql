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
