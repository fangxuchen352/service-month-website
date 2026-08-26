-- GCinfo initial data model for Supabase/PostgreSQL.
-- This migration creates structure only. Client access stays locked until
-- the authentication and authorization policies are added in a later step.

begin;

create extension if not exists pgcrypto;

create type public.user_role as enum ('viewer', 'editor', 'admin');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.category_kind as enum ('event', 'resource');

create table public.allowed_email_domains (
    domain text primary key,
    allow_subdomains boolean not null default true,
    enabled boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint allowed_email_domains_lowercase_check
        check (domain = lower(domain)),
    constraint allowed_email_domains_format_check
        check (domain ~ '^[a-z0-9-]+([.][a-z0-9-]+)+$')
);

insert into public.allowed_email_domains (domain, allow_subdomains)
values ('sjtu.edu.cn', true);

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null unique,
    display_name text,
    role public.user_role not null default 'viewer',
    approved_by uuid references auth.users(id) on delete set null,
    approved_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint profiles_email_lowercase_check
        check (email = lower(email)),
    constraint profiles_sjtu_email_check
        check (email ~ '^[^@[:space:]]+@([a-z0-9-]+[.])*sjtu[.]edu[.]cn$'),
    constraint profiles_display_name_check
        check (display_name is null or btrim(display_name) <> '')
);

create table public.categories (
    id uuid primary key default gen_random_uuid(),
    kind public.category_kind not null,
    key text not null,
    name_zh text not null,
    name_en text not null,
    color text not null default '#4f69a2',
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (kind, key),
    constraint categories_key_check
        check (key ~ '^[a-z][a-z0-9_-]*$'),
    constraint categories_name_zh_check
        check (btrim(name_zh) <> ''),
    constraint categories_name_en_check
        check (btrim(name_en) <> ''),
    constraint categories_color_check
        check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.events (
    id uuid primary key default gen_random_uuid(),
    category_id uuid not null references public.categories(id) on delete restrict,
    title_zh text not null,
    title_en text not null,
    location_zh text not null,
    location_en text not null,
    description_zh text not null,
    description_en text not null,
    start_at timestamptz not null,
    end_at timestamptz,
    all_day boolean not null default false,
    external_url text,
    status public.content_status not null default 'published',
    created_by uuid not null references auth.users(id) on delete restrict,
    deleted_at timestamptz,
    deleted_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint events_title_zh_check check (btrim(title_zh) <> ''),
    constraint events_title_en_check check (btrim(title_en) <> ''),
    constraint events_location_zh_check check (btrim(location_zh) <> ''),
    constraint events_location_en_check check (btrim(location_en) <> ''),
    constraint events_description_zh_check check (btrim(description_zh) <> ''),
    constraint events_description_en_check check (btrim(description_en) <> ''),
    constraint events_time_range_check check (end_at is null or end_at > start_at),
    constraint events_external_url_check
        check (external_url is null or external_url ~ '^https?://'),
    constraint events_deletion_metadata_check
        check (deleted_by is null or deleted_at is not null)
);

create table public.resources (
    id uuid primary key default gen_random_uuid(),
    category_id uuid not null references public.categories(id) on delete restrict,
    name_zh text not null,
    name_en text not null,
    url text not null,
    sort_order integer not null default 0,
    status public.content_status not null default 'published',
    created_by uuid not null references auth.users(id) on delete restrict,
    deleted_at timestamptz,
    deleted_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint resources_name_zh_check check (btrim(name_zh) <> ''),
    constraint resources_name_en_check check (btrim(name_en) <> ''),
    constraint resources_url_check check (url ~ '^https?://'),
    constraint resources_deletion_metadata_check
        check (deleted_by is null or deleted_at is not null)
);

create table public.translation_glossary (
    id uuid primary key default gen_random_uuid(),
    source_language text not null,
    source_text text not null,
    target_language text not null,
    target_text text not null,
    notes text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (source_language, source_text, target_language),
    constraint translation_glossary_source_language_check
        check (source_language in ('zh', 'en')),
    constraint translation_glossary_target_language_check
        check (target_language in ('zh', 'en')),
    constraint translation_glossary_direction_check
        check (source_language <> target_language),
    constraint translation_glossary_source_text_check
        check (btrim(source_text) <> ''),
    constraint translation_glossary_target_text_check
        check (btrim(target_text) <> '')
);

create table public.audit_logs (
    id bigint generated always as identity primary key,
    actor_id uuid references auth.users(id) on delete set null,
    action text not null,
    entity_type text not null,
    entity_id uuid,
    before_data jsonb,
    after_data jsonb,
    created_at timestamptz not null default now(),
    constraint audit_logs_action_check
        check (action in ('create', 'update', 'soft_delete', 'restore', 'purge', 'role_change')),
    constraint audit_logs_entity_type_check
        check (entity_type in ('event', 'resource', 'category', 'profile', 'glossary'))
);

create index events_public_calendar_idx
    on public.events (status, deleted_at, start_at);
create index events_created_by_idx
    on public.events (created_by);
create index events_category_id_idx
    on public.events (category_id);
create index events_deleted_at_idx
    on public.events (deleted_at)
    where deleted_at is not null;

create index resources_public_list_idx
    on public.resources (status, deleted_at, sort_order);
create index resources_created_by_idx
    on public.resources (created_by);
create index resources_category_id_idx
    on public.resources (category_id);
create index resources_deleted_at_idx
    on public.resources (deleted_at)
    where deleted_at is not null;

create index categories_list_idx
    on public.categories (kind, is_active, sort_order);
create index audit_logs_entity_idx
    on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx
    on public.audit_logs (actor_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create function public.prevent_content_ownership_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.created_by is distinct from old.created_by then
        raise exception 'created_by cannot be changed';
    end if;
    return new;
end;
$$;

create function public.ensure_category_kind()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if not exists (
        select 1
        from public.categories
        where id = new.category_id
          and kind = tg_argv[0]::public.category_kind
    ) then
        raise exception 'category kind must be %', tg_argv[0];
    end if;
    return new;
end;
$$;

create trigger allowed_email_domains_set_updated_at
before update on public.allowed_email_domains
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger events_ensure_category_kind
before insert or update on public.events
for each row execute function public.ensure_category_kind('event');

create trigger events_prevent_ownership_change
before update on public.events
for each row execute function public.prevent_content_ownership_change();

create trigger resources_set_updated_at
before update on public.resources
for each row execute function public.set_updated_at();

create trigger resources_ensure_category_kind
before insert or update on public.resources
for each row execute function public.ensure_category_kind('resource');

create trigger resources_prevent_ownership_change
before update on public.resources
for each row execute function public.prevent_content_ownership_change();

create trigger translation_glossary_set_updated_at
before update on public.translation_glossary
for each row execute function public.set_updated_at();

alter table public.allowed_email_domains enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.events enable row level security;
alter table public.resources enable row level security;
alter table public.translation_glossary enable row level security;
alter table public.audit_logs enable row level security;

-- Safe default: neither anonymous nor signed-in browser clients can access
-- these tables until the dedicated authorization migration grants access.
revoke all on table public.allowed_email_domains from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.events from anon, authenticated;
revoke all on table public.resources from anon, authenticated;
revoke all on table public.translation_glossary from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;
revoke all on sequence public.audit_logs_id_seq from anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.prevent_content_ownership_change() from public, anon, authenticated;
revoke all on function public.ensure_category_kind() from public, anon, authenticated;

commit;
