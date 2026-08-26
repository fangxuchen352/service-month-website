-- GCinfo grants, Row Level Security policies, and audit triggers.
-- Run after 002_authentication_foundation.sql.

begin;

create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
    select role
    from public.profiles
    where id = (select auth.uid());
$$;

create function public.normalize_soft_delete_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if old.deleted_at is null and new.deleted_at is not null then
        new.deleted_at := now();
        new.deleted_by := auth.uid();
    elsif old.deleted_at is not null and new.deleted_at is null then
        new.deleted_by := null;
    elsif old.deleted_at is null then
        new.deleted_by := null;
    else
        new.deleted_at := old.deleted_at;
        new.deleted_by := old.deleted_by;
    end if;

    return new;
end;
$$;

create function public.enforce_profile_update_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.id is distinct from old.id or new.email is distinct from old.email then
        raise exception 'Profile identity fields cannot be changed.';
    end if;

    if new.role is distinct from old.role then
        if old.role = 'admin'::public.user_role
           and new.role <> 'admin'::public.user_role
           and not exists (
               select 1
               from public.profiles
               where role = 'admin'::public.user_role
                 and id <> old.id
           ) then
            raise exception 'The final administrator cannot be demoted.';
        end if;

        if new.role = 'viewer'::public.user_role then
            new.approved_by := null;
            new.approved_at := null;
        else
            new.approved_by := auth.uid();
            new.approved_at := now();
        end if;
    end if;

    return new;
end;
$$;

create function public.record_content_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    audit_action text;
    previous_data jsonb;
begin
    if tg_op = 'INSERT' then
        audit_action := 'create';
        previous_data := null;
    elsif old.deleted_at is null and new.deleted_at is not null then
        audit_action := 'soft_delete';
        previous_data := to_jsonb(old);
    elsif old.deleted_at is not null and new.deleted_at is null then
        audit_action := 'restore';
        previous_data := to_jsonb(old);
    else
        audit_action := 'update';
        previous_data := to_jsonb(old);
    end if;

    insert into public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        before_data,
        after_data
    )
    values (
        auth.uid(),
        audit_action,
        tg_argv[0],
        new.id,
        previous_data,
        to_jsonb(new)
    );

    return new;
end;
$$;

create function public.record_profile_role_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.role is distinct from old.role then
        insert into public.audit_logs (
            actor_id,
            action,
            entity_type,
            entity_id,
            before_data,
            after_data
        )
        values (
            auth.uid(),
            'role_change',
            'profile',
            new.id,
            jsonb_build_object('email', old.email, 'role', old.role),
            jsonb_build_object('email', new.email, 'role', new.role)
        );
    end if;

    return new;
end;
$$;

create trigger events_normalize_soft_delete_metadata
before update on public.events
for each row execute function public.normalize_soft_delete_metadata();

create trigger resources_normalize_soft_delete_metadata
before update on public.resources
for each row execute function public.normalize_soft_delete_metadata();

create trigger profiles_enforce_update_rules
before update on public.profiles
for each row execute function public.enforce_profile_update_rules();

create trigger events_record_audit
after insert or update on public.events
for each row execute function public.record_content_audit('event');

create trigger resources_record_audit
after insert or update on public.resources
for each row execute function public.record_content_audit('resource');

create trigger profiles_record_role_audit
after update on public.profiles
for each row execute function public.record_profile_role_audit();

revoke all on function public.current_user_role() from public, anon, authenticated;
revoke all on function public.normalize_soft_delete_metadata() from public, anon, authenticated;
revoke all on function public.enforce_profile_update_rules() from public, anon, authenticated;
revoke all on function public.record_content_audit() from public, anon, authenticated;
revoke all on function public.record_profile_role_audit() from public, anon, authenticated;
grant execute on function public.current_user_role() to authenticated;

-- Public content reads.
grant select on table public.categories to anon, authenticated;
grant select on table public.events to anon, authenticated;
grant select on table public.resources to anon, authenticated;

create policy categories_select_active
on public.categories
for select
to anon, authenticated
using (is_active);

create policy events_select_published
on public.events
for select
to anon, authenticated
using (status = 'published'::public.content_status and deleted_at is null);

create policy resources_select_published
on public.resources
for select
to anon, authenticated
using (status = 'published'::public.content_status and deleted_at is null);

-- Signed-in users can read their own role; administrators can read all users.
grant update (display_name, role) on table public.profiles to authenticated;

create policy profiles_select_admin
on public.profiles
for select
to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role);

create policy profiles_update_admin
on public.profiles
for update
to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role)
with check ((select public.current_user_role()) = 'admin'::public.user_role);

-- Editors create content as themselves and can update only their own active rows.
-- A soft-deleted row is no longer updatable by its editor, so only an admin can restore it.
grant insert on table public.events to authenticated;
grant update (
    category_id,
    title_zh,
    title_en,
    location_zh,
    location_en,
    description_zh,
    description_en,
    start_at,
    end_at,
    all_day,
    external_url,
    status,
    deleted_at
) on table public.events to authenticated;

create policy events_select_own_for_management
on public.events
for select
to authenticated
using (
    created_by = (select auth.uid())
    and (select public.current_user_role()) = 'editor'::public.user_role
);

create policy events_select_admin
on public.events
for select
to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role);

create policy events_insert_editor_or_admin
on public.events
for insert
to authenticated
with check (
    created_by = (select auth.uid())
    and deleted_at is null
    and deleted_by is null
    and (select public.current_user_role()) in (
        'editor'::public.user_role,
        'admin'::public.user_role
    )
);

create policy events_update_own_active
on public.events
for update
to authenticated
using (
    created_by = (select auth.uid())
    and deleted_at is null
    and (select public.current_user_role()) = 'editor'::public.user_role
)
with check (
    created_by = (select auth.uid())
    and (select public.current_user_role()) = 'editor'::public.user_role
);

create policy events_update_admin
on public.events
for update
to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role)
with check ((select public.current_user_role()) = 'admin'::public.user_role);

grant insert on table public.resources to authenticated;
grant update (
    category_id,
    name_zh,
    name_en,
    url,
    sort_order,
    status,
    deleted_at
) on table public.resources to authenticated;

create policy resources_select_own_for_management
on public.resources
for select
to authenticated
using (
    created_by = (select auth.uid())
    and (select public.current_user_role()) = 'editor'::public.user_role
);

create policy resources_select_admin
on public.resources
for select
to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role);

create policy resources_insert_editor_or_admin
on public.resources
for insert
to authenticated
with check (
    created_by = (select auth.uid())
    and deleted_at is null
    and deleted_by is null
    and (select public.current_user_role()) in (
        'editor'::public.user_role,
        'admin'::public.user_role
    )
);

create policy resources_update_own_active
on public.resources
for update
to authenticated
using (
    created_by = (select auth.uid())
    and deleted_at is null
    and (select public.current_user_role()) = 'editor'::public.user_role
)
with check (
    created_by = (select auth.uid())
    and (select public.current_user_role()) = 'editor'::public.user_role
);

create policy resources_update_admin
on public.resources
for update
to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role)
with check ((select public.current_user_role()) = 'admin'::public.user_role);

-- Administrators own global taxonomies, translation terminology, and audits.
grant insert on table public.categories to authenticated;
grant update (
    kind,
    key,
    name_zh,
    name_en,
    color,
    sort_order,
    is_active
) on table public.categories to authenticated;

create policy categories_select_admin
on public.categories
for select
to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role);

create policy categories_insert_admin
on public.categories
for insert
to authenticated
with check ((select public.current_user_role()) = 'admin'::public.user_role);

create policy categories_update_admin
on public.categories
for update
to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role)
with check ((select public.current_user_role()) = 'admin'::public.user_role);

grant select, insert on table public.translation_glossary to authenticated;
grant update (
    source_language,
    source_text,
    target_language,
    target_text,
    notes,
    is_active
) on table public.translation_glossary to authenticated;

create policy translation_glossary_select_admin
on public.translation_glossary
for select
to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role);

create policy translation_glossary_insert_admin
on public.translation_glossary
for insert
to authenticated
with check ((select public.current_user_role()) = 'admin'::public.user_role);

create policy translation_glossary_update_admin
on public.translation_glossary
for update
to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role)
with check ((select public.current_user_role()) = 'admin'::public.user_role);

grant select on table public.audit_logs to authenticated;

create policy audit_logs_select_admin
on public.audit_logs
for select
to authenticated
using ((select public.current_user_role()) = 'admin'::public.user_role);

-- No DELETE grant or policy is exposed to browser roles. Editors soft-delete
-- their own rows; administrators restore with UPDATE. A later scheduled,
-- server-side task will permanently purge rows older than 30 days.

commit;
