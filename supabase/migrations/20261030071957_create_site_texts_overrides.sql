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
