-- GCinfo 30-day recycle-bin purge helper.
-- Run after 004_legacy_content_import.sql. Schedule this server-side only;
-- browser roles are deliberately not allowed to execute it.

begin;

create function public.purge_expired_content()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    purged_events integer := 0;
    purged_resources integer := 0;
begin
    insert into public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        before_data,
        after_data
    )
    select
        null,
        'purge',
        'event',
        event_record.id,
        to_jsonb(event_record),
        null
    from public.events as event_record
    where event_record.deleted_at <= now() - interval '30 days';

    delete from public.events
    where deleted_at <= now() - interval '30 days';
    get diagnostics purged_events = row_count;

    insert into public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        before_data,
        after_data
    )
    select
        null,
        'purge',
        'resource',
        resource_record.id,
        to_jsonb(resource_record),
        null
    from public.resources as resource_record
    where resource_record.deleted_at <= now() - interval '30 days';

    delete from public.resources
    where deleted_at <= now() - interval '30 days';
    get diagnostics purged_resources = row_count;

    return jsonb_build_object(
        'events_purged', purged_events,
        'resources_purged', purged_resources,
        'retention_days', 30
    );
end;
$$;

revoke all on function public.purge_expired_content() from public, anon, authenticated;
grant execute on function public.purge_expired_content() to service_role;

commit;
