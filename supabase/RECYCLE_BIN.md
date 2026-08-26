# Recycle bin and permanent deletion

Events and resources are never deleted directly by the browser. Moving an item to the recycle bin sets `deleted_at`; the authorization policies allow an editor to do this only to an active item they own. Only an administrator can restore a deleted item.

`migrations/005_recycle_bin_purge.sql` creates `public.purge_expired_content()`. It permanently removes events and resources whose deletion timestamp is at least 30 days old and records a final `purge` audit entry before each row is removed.

The function is not executable by anonymous or signed-in browser roles. It is granted only to Supabase's trusted `service_role`. After the Supabase project is created, schedule it once per day from a trusted server-side scheduler such as Supabase Cron. Do not call it with the browser publishable key.
