# Supabase database foundation

The database work is split into ordered migrations:

- `migrations/001_initial_schema.sql` defines the first database structure.
- `migrations/002_authentication_foundation.sql` restricts registration to SJTU email domains, creates viewer profiles for new users, and allows signed-in users to read only their own role.
- `migrations/003_authorization_policies.sql` grants public reads, owner-scoped editor writes, administrator access, soft deletion, and audit logging.
- `migrations/004_legacy_content_import.sql` prepares the existing activities, resource links, draft placeholders, and translation terms for a one-time administrator-owned import.
- `migrations/005_recycle_bin_purge.sql` provides a server-only 30-day permanent-deletion task for the recycle bin.

It includes:

- SJTU email-domain configuration (`sjtu.edu.cn` and its subdomains)
- user profiles and the `viewer`, `editor`, and `admin` roles
- bilingual event and resource records
- bilingual categories and a translation glossary
- ownership, soft-deletion metadata, and audit logs
- indexes for the public calendar, resource list, ownership, and recycle bin
- an authenticated, provider-independent Edge Function for bilingual translation

The initial migration deliberately enables Row Level Security and grants no browser access. The authentication migration opens only the minimum profile access required by the login status page, and the authorization migration then adds public-read, owner-scoped update/soft-delete, and administrator policies.

The initial administrator email is not stored in the repository. After the address is provided and that user signs in once, the corresponding profile can be promoted with a one-time trusted setup statement.

Do not place translation-service secrets or Supabase secret/service-role keys in this repository. Only the browser-safe Supabase publishable key may be used by the public site later.

See `AUTH_SETUP.md` for the hosted-project configuration steps that cannot be completed until a Supabase project exists. See `PERMISSIONS.md` for the enforced role matrix, `LEGACY_IMPORT.md` for the existing-content migration procedure, `RECYCLE_BIN.md` for purge scheduling, and `TRANSLATION_SETUP.md` for translation-provider configuration.
