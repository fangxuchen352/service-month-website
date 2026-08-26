# Authorization matrix

The policies in `migrations/003_authorization_policies.sql` enforce the following behavior in PostgreSQL, independently of which buttons are visible in the browser.

| Operation | Anonymous | Viewer | Editor | Administrator |
|---|---:|---:|---:|---:|
| Read published content | Yes | Yes | Yes | Yes |
| Read own drafts and recycled content | No | No | Yes | Yes |
| Create events and resources | No | No | Yes, as self | Yes, as self |
| Update active content | No | No | Own only | All |
| Move content to recycle bin | No | No | Own only | All |
| Restore recycled content | No | No | No | Yes |
| Permanently delete content | No | No | No | No browser access |
| Read own profile role | No | Yes | Yes | Yes |
| Read or change other user roles | No | No | No | Yes |
| Manage categories and glossary | No | No | No | Yes |
| Read audit history | No | No | No | Yes |
| Request automatic translation | No | No | Yes | Yes |

Additional safeguards:

- `created_by` cannot be changed after creation.
- Soft-delete timestamps and actors are normalized by a database trigger.
- Editors cannot update a row after moving it to the recycle bin, which prevents self-restoration.
- The final remaining administrator cannot demote their own account.
- Role changes, content creation, updates, soft deletion, and restoration are recorded in `audit_logs`.
- There is intentionally no browser `DELETE` permission. Migration 005 prepares permanent 30-day cleanup as a server-side scheduled task.
- The translation Edge Function repeats session and editor/administrator role checks before contacting the configured provider.
- Translation-provider keys and glossary access remain server-side; generated text is returned for human review and is never published by the function.

These policies still need live integration tests after the migrations are applied to a Supabase project. The repository cannot simulate Supabase identities until that project exists.
