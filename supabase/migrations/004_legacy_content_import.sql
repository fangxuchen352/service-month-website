-- GCinfo legacy content import.
-- This migration prepares an idempotent importer. It does not import rows
-- immediately because every legacy row must be owned by a real administrator.

begin;

-- Placeholder resources are retained as drafts without a URL. Published and
-- archived resources still require a valid HTTP(S) link.
alter table public.resources
    alter column url drop not null;

alter table public.resources
    drop constraint resources_url_check;

alter table public.resources
    add constraint resources_url_check
    check (
        (status = 'draft'::public.content_status and url is null)
        or (url is not null and url ~ '^https?://')
    );

create function public.import_legacy_content()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    importing_admin uuid;
    student_union_category uuid;
    service_month_category uuid;
    guide_category uuid;
    life_category uuid;
    career_category uuid;
    technology_category uuid;
    rights_category uuid;
    more_category uuid;
    inserted_events integer := 0;
    inserted_resources integer := 0;
begin
    importing_admin := auth.uid();

    if importing_admin is null
       or public.current_user_role() is distinct from 'admin'::public.user_role then
        raise exception 'Only an authenticated administrator can import legacy content.';
    end if;

    insert into public.categories (kind, key, name_zh, name_en, color, sort_order)
    values
        ('event', 'student_union', '学生会活动', 'Student Union Events', '#e74c3c', 10),
        ('event', 'service_month', '服务月活动', 'Service Month Events', '#3498db', 20),
        ('event', 'youth_volunteer', '青志队活动', 'Youth Volunteer Events', '#2ecc71', 30),
        ('resource', 'guide', '指北', 'Guides', '#4f69a2', 10),
        ('resource', 'campus_life', '生活区', 'Campus Life', '#4f69a2', 20),
        ('resource', 'career', '生涯规划', 'Career Planning', '#4f69a2', 30),
        ('resource', 'technology', '技术', 'Technology', '#5cb85c', 40),
        ('resource', 'student_rights', '学生权益', 'Student Rights', '#4f69a2', 50),
        ('resource', 'more', '更多', 'More', '#999999', 60)
    on conflict (kind, key) do nothing;

    select id into student_union_category
    from public.categories
    where kind = 'event' and key = 'student_union';

    select id into service_month_category
    from public.categories
    where kind = 'event' and key = 'service_month';

    select id into guide_category
    from public.categories
    where kind = 'resource' and key = 'guide';

    select id into life_category
    from public.categories
    where kind = 'resource' and key = 'campus_life';

    select id into career_category
    from public.categories
    where kind = 'resource' and key = 'career';

    select id into technology_category
    from public.categories
    where kind = 'resource' and key = 'technology';

    select id into rights_category
    from public.categories
    where kind = 'resource' and key = 'student_rights';

    select id into more_category
    from public.categories
    where kind = 'resource' and key = 'more';

    insert into public.events (
        id,
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
        created_by
    )
    values
        (
            '10000000-0000-4000-8000-000000000001',
            student_union_category,
            '学代会',
            'Student Congress',
            '包玉刚图书馆五楼学术报告厅',
            'Academic Lecture Hall, 5F, Pao Yue-Kong Library',
            '学生代表大会活动信息，详情请查看相关推送。',
            'Student Congress event information. See the linked announcement for details.',
            '2026-07-08 18:30:00+08',
            '2026-07-08 21:00:00+08',
            false,
            'https://mp.weixin.qq.com/s/yz5NbD_Z5HQFbu8PV3Htjw',
            'published',
            importing_admin
        ),
        (
            '10000000-0000-4000-8000-000000000002',
            student_union_category,
            '院长见面会',
            'Meeting with the Dean',
            '龙宾楼300中集报告厅',
            'CIMC Auditorium, Room 300, Long Bin Building',
            '院长见面会活动信息，详情请查看相关推送。',
            'Meeting with the Dean event information. See the linked announcement for details.',
            '2026-07-08 14:00:00+08',
            '2026-07-08 16:00:00+08',
            false,
            'https://mp.weixin.qq.com/s/rYD85VWJNEQA3XkkeMQOEA',
            'published',
            importing_admin
        ),
        (
            '10000000-0000-4000-8000-000000000003',
            student_union_category,
            '女生节',
            'Girls'' Day',
            '龙宾楼一楼唐创',
            'Tangchuang Space, 1F, Long Bin Building',
            '女生节活动信息，详情请查看相关推送。',
            'Girls'' Day event information. See the linked announcement for details.',
            '2026-06-06 13:00:00+08',
            '2026-06-06 17:00:00+08',
            false,
            'https://mp.weixin.qq.com/s/l80c-tro8d1LSC_ySNjFLg',
            'published',
            importing_admin
        ),
        (
            '10000000-0000-4000-8000-000000000004',
            student_union_category,
            '毕业晚会',
            'Graduation Gala',
            '待定',
            'To be confirmed',
            '毕业晚会活动信息，具体地点待定。',
            'Graduation Gala information. The venue is to be confirmed.',
            '2026-07-25 00:00:00+08',
            null,
            true,
            null,
            'published',
            importing_admin
        ),
        (
            '10000000-0000-4000-8000-000000000005',
            service_month_category,
            '服务月昭途分享会第二场',
            'Service Month Zhaotu Sharing Session II',
            '龙宾楼300中集报告厅',
            'CIMC Auditorium, Room 300, Long Bin Building',
            '服务月昭途分享会第二场活动信息，详情请查看相关推送。',
            'Information for the second Service Month Zhaotu sharing session. See the linked announcement for details.',
            '2026-06-27 10:20:00+08',
            '2026-06-27 11:20:00+08',
            false,
            'https://mp.weixin.qq.com/s/XIg87s2vVMarbvDbDEW4IQ',
            'published',
            importing_admin
        ),
        (
            '10000000-0000-4000-8000-000000000006',
            service_month_category,
            '服务月六一',
            'Service Month Children''s Day Event',
            '龙宾楼444教工之家及电院大草坪',
            'Faculty Lounge, Room 444, Long Bin Building, and the SEIEE Lawn',
            '服务月六一活动信息，详情请查看相关推送。',
            'Service Month Children''s Day event information. See the linked announcement for details.',
            '2026-06-06 17:00:00+08',
            '2026-06-06 19:30:00+08',
            false,
            'https://mp.weixin.qq.com/s/5VfUlKgB7ij5sg5Q95iycw',
            'published',
            importing_admin
        )
    on conflict (id) do nothing;

    get diagnostics inserted_events = row_count;

    insert into public.resources (
        id,
        category_id,
        name_zh,
        name_en,
        url,
        sort_order,
        status,
        created_by
    )
    values
        (
            '20000000-0000-4000-8000-000000000001',
            guide_category,
            'GC生存手册',
            'GC Survival Guide',
            'https://survive.gcers.org/',
            10,
            'published',
            importing_admin
        ),
        (
            '20000000-0000-4000-8000-000000000002',
            guide_category,
            '各部门历年活动',
            'Archive of Department Activities',
            null,
            20,
            'draft',
            importing_admin
        ),
        (
            '20000000-0000-4000-8000-000000000003',
            life_category,
            '宿舍钥匙维修',
            'Dormitory Key Repair',
            null,
            10,
            'draft',
            importing_admin
        ),
        (
            '20000000-0000-4000-8000-000000000004',
            life_category,
            '周边美食打印',
            'Nearby Dining and Printing',
            null,
            20,
            'draft',
            importing_admin
        ),
        (
            '20000000-0000-4000-8000-000000000005',
            career_category,
            '选课指南',
            'Course Selection Guide',
            'https://gc.sjtu.edu.cn/cn/academics/courses/',
            10,
            'published',
            importing_admin
        ),
        (
            '20000000-0000-4000-8000-000000000006',
            career_category,
            '学长经验分享',
            'Senior Student Experience Sharing',
            null,
            20,
            'draft',
            importing_admin
        ),
        (
            '20000000-0000-4000-8000-000000000007',
            technology_category,
            '技术部 repo',
            'Technology Department Repositories',
            'https://github.com/Tech-JI',
            10,
            'published',
            importing_admin
        ),
        (
            '20000000-0000-4000-8000-000000000008',
            technology_category,
            '科协相关文档',
            'Science and Technology Association Documents',
            null,
            20,
            'draft',
            importing_admin
        ),
        (
            '20000000-0000-4000-8000-000000000009',
            rights_category,
            'Src',
            'SRC',
            'https://piazza.com/sjtu.org/other/src',
            10,
            'published',
            importing_admin
        ),
        (
            '20000000-0000-4000-8000-000000000010',
            more_category,
            '敬请期待',
            'Coming Soon',
            null,
            10,
            'draft',
            importing_admin
        )
    on conflict (id) do nothing;

    get diagnostics inserted_resources = row_count;

    insert into public.translation_glossary (
        source_language,
        source_text,
        target_language,
        target_text,
        notes
    )
    values
        ('zh', '学生会', 'en', 'Student Union', 'Organization name'),
        ('zh', '服务月', 'en', 'Service Month', 'Program name'),
        ('zh', '青志队', 'en', 'Youth Volunteer Team', 'Organization name'),
        ('zh', '学代会', 'en', 'Student Congress', 'Event name'),
        ('zh', '院长见面会', 'en', 'Meeting with the Dean', 'Event name'),
        ('zh', '龙宾楼', 'en', 'Long Bin Building', 'Building name'),
        ('zh', '包玉刚图书馆', 'en', 'Pao Yue-Kong Library', 'Building name'),
        ('zh', '待定', 'en', 'To be confirmed', 'Status wording'),
        ('zh', '电院大草坪', 'en', 'SEIEE Lawn', 'Campus location'),
        ('zh', '推送', 'en', 'Announcement', 'Linked article label')
    on conflict (source_language, source_text, target_language) do nothing;

    return jsonb_build_object(
        'events_inserted', inserted_events,
        'resources_inserted', inserted_resources,
        'owner_id', importing_admin
    );
end;
$$;

revoke all on function public.import_legacy_content() from public, anon, authenticated;
grant execute on function public.import_legacy_content() to authenticated;

commit;
