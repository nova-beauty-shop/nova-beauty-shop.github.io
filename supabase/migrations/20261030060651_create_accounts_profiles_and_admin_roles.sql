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
