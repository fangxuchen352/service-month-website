-- Add the five requested student-organization event categories.
-- Upserts make this migration safe to run again if necessary.

begin;

insert into public.categories (
    kind,
    key,
    name_zh,
    name_en,
    color,
    sort_order,
    is_active
)
values
    ('event', 'psychology_association', '心协', 'Psychology Association', '#8e44ad', 40, true),
    ('event', 'miyuanren', '密缘人', 'Miyuanren', '#d97706', 50, true),
    ('event', 'school', '学院活动', 'School Events', '#34495e', 60, true),
    ('event', 'advising_center', 'Advising Center', 'Advising Center', '#00897b', 70, true),
    ('event', 'converged_media', '融媒体', 'Converged Media', '#c2185b', 80, true)
on conflict (kind, key) do update
set
    name_zh = excluded.name_zh,
    name_en = excluded.name_en,
    color = excluded.color,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

commit;
