# Initial administrator setup

The first administrator cannot be granted through the management page because no administrator exists yet. Use `INITIAL_ADMIN_SETUP.sql` once to establish that account.

## Safe procedure

1. Apply migrations `001` through `005` and enable the authentication hook described in `AUTH_SETUP.md`.
2. Ask the selected administrator to request a sign-in link from `admin.html` once. The profile-creation trigger will create a viewer profile.
3. Open `INITIAL_ADMIN_SETUP.sql`, copy it into the Supabase SQL editor, and replace `REPLACE_WITH_INITIAL_ADMIN_EMAIL@sjtu.edu.cn` in the SQL editor only.
4. Run the statement and confirm the final result contains exactly the intended email with role `admin`.
5. Return to `admin.html`, sign out if necessary, and sign in again. The complete administrator workspace should appear.

Do not save or commit the real administrator email in this repository. The statement deliberately stops if the placeholder is unchanged, the email is outside the permitted SJTU domains, no matching profile exists, or a different administrator already exists. All later role changes should be made from the management page.
