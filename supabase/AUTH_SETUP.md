# Authentication setup

The local login page and authentication migration are ready, but they remain intentionally disconnected until a Supabase project exists.

## Apply in this order

1. Run `migrations/001_initial_schema.sql` in the Supabase SQL editor.
2. Run `migrations/002_authentication_foundation.sql`.
3. Run `migrations/003_authorization_policies.sql`.
4. Run `migrations/004_legacy_content_import.sql` to prepare the one-time importer.
5. Run `migrations/005_recycle_bin_purge.sql` and later schedule `public.purge_expired_content()` once per day from a trusted server-side scheduler.
6. Run `migrations/006_rename_science_association_category.sql` to apply the current bilingual legend label.
7. Run `migrations/007_add_event_organization_categories.sql` to add the current student-organization legend categories.
8. Run `migrations/008_editor_access_requests.sql` to enable private editor-access applications.
9. In Supabase Authentication settings, enable the **Before User Created** Postgres hook and select `public.hook_restrict_signup_by_email_domain`.
10. Set the GitHub Pages site URL and add the final `admin.html` address to the allowed redirect URLs.
11. Copy the project URL and browser-safe publishable key into `js/config.js`.
12. Deploy the `translate` Edge Function and configure its provider secrets as described in `TRANSLATION_SETUP.md`.
13. Request a login link from `admin.html` and verify that the new profile has the `viewer` role.
14. After the chosen initial administrator signs in once, follow `INITIAL_ADMIN_SETUP.md` to grant the first administrator role safely.

The domain rule accepts `@sjtu.edu.cn` and any subdomain such as `@mail.sjtu.edu.cn`. All other domains are rejected by the registration hook, and the profile-creation trigger repeats the check as a fallback.

The real initial-administrator email is deliberately not stored in the repository. `INITIAL_ADMIN_SETUP.sql` is a guarded one-time template: replace its placeholder only in the Supabase SQL editor after that person has signed in once.

Never copy a Supabase secret/service-role key into `js/config.js`. The login page only needs the browser-safe publishable key.
