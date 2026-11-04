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
