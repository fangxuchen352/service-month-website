# GitHub Pages deployment

The repository includes a GitHub Actions workflow that validates the public files, creates a clean `dist/` package, and deploys that package to GitHub Pages. Database migrations, function source, documentation, local environment files, and `_backup/` are never included in the website artifact.

## One-time GitHub setting

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Push the finished changes to `main`, or run the workflow manually from the repository's **Actions** page.

For the current repository, the expected default addresses are:

- Public page: `https://fangxuchen352.github.io/service-month-website/`
- Management page: `https://fangxuchen352.github.io/service-month-website/admin.html`

If a custom domain is added later, use its final HTTPS addresses instead throughout the Supabase settings.

## Supabase connection before launch

The static public page can be deployed before Supabase is connected; it will show the bundled bilingual fallback content. Editing and login remain disabled until all of these steps are complete:

1. Create the Supabase project and apply migrations `001` through `006` in order.
2. Configure the authentication hook and allowed redirect URL as described in `supabase/AUTH_SETUP.md`.
3. Put only the project URL and browser-safe publishable key in `js/config.js`.
4. Let the chosen initial administrator sign in once, then follow `supabase/INITIAL_ADMIN_SETUP.md`.
5. Deploy and configure the translation function following `supabase/TRANSLATION_SETUP.md`.
6. Schedule the 30-day cleanup following `supabase/RECYCLE_BIN.md`.

The final Pages origin must also be included in the translation function's `TRANSLATION_ALLOWED_ORIGINS` secret. Translation-provider keys and Supabase service-role keys must stay in backend secrets and must never be placed in GitHub Pages, GitHub repository variables exposed to the browser, or `js/config.js`.

## Local release check

Run these commands before publishing:

```sh
node scripts/check-project.mjs
node scripts/build-pages.mjs
```

The generated `dist/` directory is ignored by Git. GitHub Actions creates it again for every deployment.
