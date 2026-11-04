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
