-- GCinfo authentication foundation.
-- Run after 001_initial_schema.sql, then enable the Before User Created hook
-- in the Supabase dashboard as described in ../AUTH_SETUP.md.

begin;

create function public.is_allowed_login_email(candidate_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.allowed_email_domains as allowed
        where allowed.enabled
          and (
              split_part(lower(candidate_email), '@', 2) = allowed.domain
              or (
                  allowed.allow_subdomains
                  and split_part(lower(candidate_email), '@', 2) like '%.' || allowed.domain
              )
          )
    );
$$;

create function public.hook_restrict_signup_by_email_domain(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    candidate_email text;
begin
    candidate_email := lower(nullif(btrim(event->'user'->>'email'), ''));

    if candidate_email is null
       or candidate_email !~ '^[^@[:space:]]+@([a-z0-9-]+[.])*sjtu[.]edu[.]cn$'
       or not public.is_allowed_login_email(candidate_email) then
        return jsonb_build_object(
            'error', jsonb_build_object(
                'http_code', 403,
                'message', 'Only SJTU email addresses can sign in.'
            )
        );
    end if;

    return '{}'::jsonb;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    normalized_email text;
    requested_name text;
begin
    normalized_email := lower(nullif(btrim(new.email), ''));
    requested_name := nullif(btrim(new.raw_user_meta_data->>'display_name'), '');

    if normalized_email is null
       or not public.is_allowed_login_email(normalized_email) then
        raise exception 'Only SJTU email addresses can create GCinfo profiles.';
    end if;

    insert into public.profiles (id, email, display_name, role)
    values (new.id, normalized_email, requested_name, 'viewer');

    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

grant usage on schema public to supabase_auth_admin;
revoke all on function public.is_allowed_login_email(text) from public, anon, authenticated;
revoke all on function public.hook_restrict_signup_by_email_domain(jsonb) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.hook_restrict_signup_by_email_domain(jsonb) to supabase_auth_admin;

-- A signed-in user may only read their own profile and current role.
grant select on table public.profiles to authenticated;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

commit;
