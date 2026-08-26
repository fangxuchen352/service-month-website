-- One-time setup for the first GCinfo administrator.
-- Run this manually in the Supabase SQL editor only after the chosen person
-- has successfully requested a sign-in link and a public.profiles row exists.
-- Keep the real email out of the Git repository.

do $$
declare
    initial_admin_email text := lower('REPLACE_WITH_INITIAL_ADMIN_EMAIL@sjtu.edu.cn');
    matching_profiles integer;
    changed_profiles integer;
begin
    if initial_admin_email like 'replace_with_%' then
        raise exception 'Replace the placeholder with the initial administrator email before running this statement.';
    end if;

    if initial_admin_email !~ '^[^@[:space:]]+@([a-z0-9-]+[.])*sjtu[.]edu[.]cn$' then
        raise exception 'The initial administrator must use an @sjtu.edu.cn address or one of its subdomains.';
    end if;

    if exists (
        select 1
        from public.profiles
        where role = 'admin'::public.user_role
          and lower(email) <> initial_admin_email
    ) then
        raise exception 'An administrator already exists. Use the management page for later role changes.';
    end if;

    select count(*)
    into matching_profiles
    from public.profiles
    where lower(email) = initial_admin_email;

    if matching_profiles = 0 then
        raise exception 'No matching profile exists. Ask this user to sign in once, then run the statement again.';
    elsif matching_profiles > 1 then
        raise exception 'More than one matching profile exists. Stop and inspect the user data.';
    end if;

    update public.profiles
    set role = 'admin'::public.user_role
    where lower(email) = initial_admin_email
      and role <> 'admin'::public.user_role;

    get diagnostics changed_profiles = row_count;

    if changed_profiles = 0 then
        raise notice 'The selected user is already an administrator.';
    else
        raise notice 'Initial administrator configured successfully.';
    end if;
end;
$$;

select email, role, approved_at
from public.profiles
where role = 'admin'::public.user_role
order by created_at;
