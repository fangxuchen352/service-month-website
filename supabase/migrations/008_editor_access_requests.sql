-- Allow signed-in viewers to submit their name, student organization, and
-- position for editor access review.
-- The security-definer function exposes only these application fields, so a
-- viewer cannot grant themselves a different role.

begin;

alter table public.profiles
    add column if not exists access_request_organization text,
    add column if not exists access_request_position text,
    add column if not exists access_requested_at timestamptz;

do $constraints$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'profiles_access_request_organization_check'
          and conrelid = 'public.profiles'::regclass
    ) then
        alter table public.profiles
            add constraint profiles_access_request_organization_check
            check (
                access_request_organization is null
                or char_length(btrim(access_request_organization)) between 1 and 120
            );
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'profiles_access_request_position_check'
          and conrelid = 'public.profiles'::regclass
    ) then
        alter table public.profiles
            add constraint profiles_access_request_position_check
            check (
                access_request_position is null
                or char_length(btrim(access_request_position)) between 1 and 120
            );
    end if;
end
$constraints$;

drop function if exists public.submit_editor_access_request(text, text);

create or replace function public.submit_editor_access_request(
    requested_display_name text,
    requested_organization text,
    requested_position text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    normalized_name text := nullif(btrim(requested_display_name), '');
    normalized_organization text := nullif(btrim(requested_organization), '');
    normalized_position text := nullif(btrim(requested_position), '');
begin
    if (select auth.uid()) is null then
        raise exception 'Authentication is required.';
    end if;

    if normalized_name is null or char_length(normalized_name) > 80 then
        raise exception 'Please provide a name no longer than 80 characters.';
    end if;

    if normalized_organization is null or char_length(normalized_organization) > 120 then
        raise exception 'Please provide a student organization no longer than 120 characters.';
    end if;

    if normalized_position is null or char_length(normalized_position) > 120 then
        raise exception 'Please provide a position no longer than 120 characters.';
    end if;

    update public.profiles
    set
        display_name = normalized_name,
        access_request_organization = normalized_organization,
        access_request_position = normalized_position,
        access_requested_at = now()
    where id = (select auth.uid())
      and role = 'viewer'::public.user_role;

    if not found then
        raise exception 'Only viewers can submit an editor access request.';
    end if;
end;
$$;

revoke all on function public.submit_editor_access_request(text, text, text)
from public, anon, authenticated;
grant execute on function public.submit_editor_access_request(text, text, text)
to authenticated;

commit;
