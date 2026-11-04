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
