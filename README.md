# GCinfo

GCinfo is a bilingual-ready student activity calendar and resource portal for the University of Michigan–Shanghai Jiao Tong University Joint Institute community.

## Current website

The site can remain hosted on GitHub Pages while Supabase supplies authentication and dynamic content. The public page loads published events and event categories from Supabase, presents them as an activity calendar and legend, and supports a complete Chinese/English switch. Resource links remain available in the management workspace but are not shown on the public homepage. If Supabase has not been configured or is temporarily unavailable, the page safely falls back to the bundled bilingual legacy content.

## Project structure

```text
index.html                  Public page structure
admin.html                  Sign-in, content workspace, trash, and access UI
css/style.css               Shared page styles
css/admin.css               Management sign-in page styles
js/content-data.js          Bilingual fallback content for setup/offline use
js/supabase-client.js       Shared browser-safe Supabase connection
js/data-service.js          Public database queries and local fallback
js/i18n.js                  Public-page language state and fixed translations
js/calendar.js              Dynamic bilingual calendar and event details
js/app.js                   Public-page loading and rendering coordinator
js/config.js                Browser-safe Supabase configuration placeholder
js/auth.js                  Authentication client and SJTU email validation
js/admin-login.js           Login and account-status interface
js/admin-data.js            Owner-scoped management database operations
js/admin-dashboard.js       Content forms, lists, trash, and user roles
js/translation-service.js   Authenticated translation-function client
supabase/migrations/        Database migrations
supabase/functions/         Protected translation gateway and shared contract
supabase/README.md          Database notes and security boundary
supabase/PERMISSIONS.md     Enforced role and operation matrix
supabase/LEGACY_IMPORT.md   Existing bilingual content import notes
supabase/RECYCLE_BIN.md     30-day permanent-deletion scheduling notes
supabase/TRANSLATION_SETUP.md Translation provider contract and setup
supabase/INITIAL_ADMIN_SETUP.md One-time first-administrator procedure
scripts/check-project.mjs   Pre-deployment public-site validation
scripts/build-pages.mjs     Clean GitHub Pages artifact builder
.github/workflows/pages.yml GitHub Pages validation and deployment
DEPLOYMENT.md               Deployment and backend connection checklist
_backup/                    Recoverable pre-refactor page copy
```

`js/content-data.js` is a deliberate fallback, not the primary data source. Once valid project settings are entered in `js/config.js`, the public page queries Supabase first. Only published events whose deletion timestamp is empty are requested and displayed. If Supabase is unavailable or does not respond within six seconds, the public page automatically uses the bundled bilingual fallback so that the calendar never waits indefinitely.

The selected public-page language is stored in the browser and can also be linked directly with `?lang=zh` or `?lang=en`. Until a Supabase project URL and publishable key are entered in `js/config.js`, the management page displays a safe setup notice and makes no network login request.

## Access model

- Anyone can browse published content without signing in.
- Only `@sjtu.edu.cn` and `@*.sjtu.edu.cn` accounts can sign in.
- New users start as viewers and require administrator approval to become editors.
- Editors manage only content they created; administrators manage everything.
- Published content must contain both Chinese and English.
- Deleted content remains recoverable for 30 days before permanent removal.

## Management workspace

After sign-in, viewers see an approval-waiting status. Editors enter a workspace that lists only their own events and resources and supports create, edit, and soft-delete operations. Administrators see all content, can restore recycle-bin items, import the prepared legacy content, and grant viewer/editor/administrator roles to other users.

New forms default to direct publication and require both language versions. Editors can generate English from Chinese or Chinese from English through an authenticated backend function. The generated text only fills the form and cannot be saved until the editor confirms that it has been reviewed.

## Security

Never commit Supabase secret/service-role keys or translation-provider credentials. The public browser uses only the Supabase publishable key; Row Level Security limits anonymous visitors to active categories and published, non-deleted content. Translation credentials stay in Supabase Edge Function secrets.

## Deployment readiness

GitHub Pages deployment is prepared through a GitHub Actions workflow. It publishes only `index.html`, `admin.html`, `css/`, and `js/`; backend source, SQL files, documentation, and backups are excluded from the public artifact. See `DEPLOYMENT.md` for the one-time GitHub setting and the remaining Supabase connection steps.
