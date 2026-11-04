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
