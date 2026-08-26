# Legacy content import

`migrations/004_legacy_content_import.sql` prepares the current GCinfo content for a one-time bilingual import.

Prepared content:

- 3 event categories, including the currently empty Youth Volunteer category
- 6 existing calendar events with Chinese and English fields
- 6 resource categories
- 4 working resource links as published content
- 6 placeholder resource entries as drafts with no public URL
- 10 initial translation-glossary terms

The migration creates `public.import_legacy_content()` but does not execute it. This is intentional: `events.created_by` and `resources.created_by` must reference a real authenticated administrator.

After the initial administrator has signed in and been promoted, the management interface can call:

```js
const { data, error } = await supabase.rpc('import_legacy_content')
```

The function verifies the caller is an administrator, assigns that administrator as the legacy content owner, and uses fixed content IDs so repeated calls do not create duplicates.

The initial English text is ready for migration but should be reviewed by the content team, especially proper nouns such as “唐创” and “昭途”.
