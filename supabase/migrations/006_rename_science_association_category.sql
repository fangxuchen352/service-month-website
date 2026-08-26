-- Rename the legacy service-month legend category to the requested
-- Science and Technology Association label. The internal key remains stable
-- so the existing importer and event relationships continue to work.

begin;

insert into public.categories (
    kind,
    key,
    name_zh,
    name_en,
    color,
    sort_order
)
values (
    'event',
    'service_month',
    '科协活动',
    'Science and Technology Association Events',
    '#3498db',
    20
)
on conflict (kind, key) do update
set
    name_zh = excluded.name_zh,
    name_en = excluded.name_en;

commit;
