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
