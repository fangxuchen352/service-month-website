# Automatic translation setup

The management page calls the authenticated Supabase Edge Function named `translate`. The browser sends only the source text and language direction to this function. Translation-provider credentials stay in Supabase function secrets and are never included in `js/config.js` or the GitHub Pages files.

## Workflow

1. An editor or administrator enters all source-language fields.
2. The management page invokes `translate` for Chinese-to-English or English-to-Chinese translation.
3. Supabase validates the user's session before the handler runs; the Edge Function then verifies that the profile role is `editor` or `admin`.
4. Active matching terms from `translation_glossary` are sent to the configured provider with the source fields. Existing glossary rows are also reversed automatically when translating in the opposite direction.
5. Returned text fills the form but is not saved automatically.
6. The user must check the human-review box before the form can be saved.

## Provider-independent contract

The first adapter is named `custom_json`. This keeps the public page and management page independent from the provider selected later.

The Edge Function sends this authenticated server-to-server request to `TRANSLATION_API_URL`:

```json
{
  "sourceLanguage": "zh",
  "targetLanguage": "en",
  "items": [
    { "key": "title", "text": "活动标题" },
    { "key": "location", "text": "活动地点" }
  ],
  "glossary": [
    { "source_text": "学生会", "target_text": "Student Union" }
  ]
}
```

The provider endpoint must return the same keys:

```json
{
  "translations": [
    { "key": "title", "text": "Event title" },
    { "key": "location", "text": "Event location" }
  ]
}
```

The request uses `Authorization: Bearer <TRANSLATION_API_KEY>`. When a concrete provider is chosen, either configure a small adapter service that implements this contract or add a new provider case inside `functions/translate/index.ts`; the browser API does not change.

## Supabase configuration

After creating and linking the Supabase project:

1. Deploy the `translate` Edge Function with normal JWT verification enabled.
2. Set `TRANSLATION_PROVIDER=custom_json`.
3. Set `TRANSLATION_API_URL` to the HTTPS provider or adapter endpoint.
4. Set `TRANSLATION_API_KEY` as a Supabase function secret.
5. Set `TRANSLATION_ALLOWED_ORIGINS` to the final GitHub Pages origin. Multiple origins can be comma-separated for preview and production.
6. Optionally set `TRANSLATION_TIMEOUT_MS`; accepted values are clamped to 1–60 seconds.

Use `functions/.env.example` only as a variable-name template. Never copy a real key into that file or any browser JavaScript file.

The current `@supabase/server` function wrapper supplies a caller-scoped database client and a privileged server-only client. The latter is used only to read the protected glossary and is never returned to the browser. The wrapper also handles browser preflight and standard CORS headers; the function still rejects actual translation requests whose origin is not in `TRANSLATION_ALLOWED_ORIGINS`.

## Security limits

- Anonymous visitors and unapproved viewers receive an authorization error.
- Requests support only `zh` and `en`, must contain 1–8 uniquely keyed fields, and are limited to 6,000 source characters in total.
- Provider responses are checked for the same complete set of fields before they are returned to the management page.
- Only HTTPS provider endpoints are accepted unless insecure HTTP is explicitly enabled for local development.
- Provider responses are never published automatically and all public rendering remains text-only.
