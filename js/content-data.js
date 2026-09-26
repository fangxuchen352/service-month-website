// Temporary bilingual local source used until Supabase is connected.
(function () {
    'use strict';

    var categories = [
        { kind: 'event', key: 'student_union', name: { zh: '学生会活动', en: 'Student Union Events' }, color: '#e74c3c', sortOrder: 10 },
        { kind: 'event', key: 'service_month', name: { zh: '科协活动', en: 'Science and Technology Association Events' }, color: '#3498db', sortOrder: 20 },
        { kind: 'event', key: 'youth_volunteer', name: { zh: '青志队活动', en: 'Youth Volunteer Events' }, color: '#2ecc71', sortOrder: 30 },
        { kind: 'event', key: 'psychology_association', name: { zh: '心协', en: 'Psychology Association' }, color: '#8e44ad', sortOrder: 40 },
        { kind: 'event', key: 'miyuanren', name: { zh: '密缘人', en: 'Miyuanren' }, color: '#d97706', sortOrder: 50 },
        { kind: 'event', key: 'school', name: { zh: '学院活动', en: 'School Events' }, color: '#34495e', sortOrder: 60 },
        { kind: 'event', key: 'advising_center', name: { zh: 'Advising Center', en: 'Advising Center' }, color: '#00897b', sortOrder: 70 },
        { kind: 'event', key: 'converged_media', name: { zh: '融媒体', en: 'Converged Media' }, color: '#c2185b', sortOrder: 80 },
        { kind: 'resource', key: 'guide', name: { zh: '指北', en: 'Guides' }, color: '#4f69a2', sortOrder: 10 },
        { kind: 'resource', key: 'campus_life', name: { zh: '生活区', en: 'Campus Life' }, color: '#4f69a2', sortOrder: 20 },
        { kind: 'resource', key: 'career', name: { zh: '生涯规划', en: 'Career Planning' }, color: '#4f69a2', sortOrder: 30 },
        { kind: 'resource', key: 'technology', name: { zh: '技术', en: 'Technology' }, color: '#5cb85c', sortOrder: 40 },
        { kind: 'resource', key: 'student_rights', name: { zh: '学生权益', en: 'Student Rights' }, color: '#4f69a2', sortOrder: 50 },
        { kind: 'resource', key: 'more', name: { zh: '更多', en: 'More' }, color: '#999999', sortOrder: 60 }
    ];

    var events = [
        {
            id: '10000000-0000-4000-8000-000000000001',
            categoryKey: 'student_union',
            title: { zh: '学代会', en: 'Student Congress' },
            location: { zh: '包玉刚图书馆五楼学术报告厅', en: 'Academic Lecture Hall, 5F, Pao Yue-Kong Library' },
            description: {
                zh: '学生代表大会活动信息，详情请查看相关推送。',
                en: 'Student Congress event information. See the linked announcement for details.'
            },
            start: '2026-07-08T18:30:00+08:00',
            end: '2026-07-08T21:00:00+08:00',
            allDay: false,
            externalUrl: 'https://mp.weixin.qq.com/s/yz5NbD_Z5HQFbu8PV3Htjw',
            status: 'published'
        },
        {
            id: '10000000-0000-4000-8000-000000000002',
            categoryKey: 'student_union',
            title: { zh: '院长见面会', en: 'Meeting with the Dean' },
            location: { zh: '龙宾楼300中集报告厅', en: 'CIMC Auditorium, Room 300, Long Bin Building' },
            description: {
                zh: '院长见面会活动信息，详情请查看相关推送。',
                en: 'Meeting with the Dean event information. See the linked announcement for details.'
            },
            start: '2026-07-08T14:00:00+08:00',
            end: '2026-07-08T16:00:00+08:00',
            allDay: false,
            externalUrl: 'https://mp.weixin.qq.com/s/rYD85VWJNEQA3XkkeMQOEA',
            status: 'published'
        },
        {
            id: '10000000-0000-4000-8000-000000000003',
            categoryKey: 'student_union',
            title: { zh: '女生节', en: "Girls' Day" },
            location: { zh: '龙宾楼一楼唐创', en: 'Tangchuang Space, 1F, Long Bin Building' },
            description: {
                zh: '女生节活动信息，详情请查看相关推送。',
                en: "Girls' Day event information. See the linked announcement for details."
            },
            start: '2026-06-06T13:00:00+08:00',
            end: '2026-06-06T17:00:00+08:00',
            allDay: false,
            externalUrl: 'https://mp.weixin.qq.com/s/l80c-tro8d1LSC_ySNjFLg',
            status: 'published'
        },
        {
            id: '10000000-0000-4000-8000-000000000004',
            categoryKey: 'student_union',
            title: { zh: '毕业晚会', en: 'Graduation Gala' },
            location: { zh: '待定', en: 'To be confirmed' },
            description: {
                zh: '毕业晚会活动信息，具体地点待定。',
                en: 'Graduation Gala information. The venue is to be confirmed.'
            },
            start: '2026-07-25',
            end: null,
            allDay: true,
            externalUrl: null,
            status: 'published'
        },
        {
            id: '10000000-0000-4000-8000-000000000005',
            categoryKey: 'service_month',
            title: { zh: '服务月昭途分享会第二场', en: 'Service Month Zhaotu Sharing Session II' },
            location: { zh: '龙宾楼300中集报告厅', en: 'CIMC Auditorium, Room 300, Long Bin Building' },
            description: {
                zh: '服务月昭途分享会第二场活动信息，详情请查看相关推送。',
                en: 'Information for the second Service Month Zhaotu sharing session. See the linked announcement for details.'
            },
            start: '2026-06-27T10:20:00+08:00',
            end: '2026-06-27T11:20:00+08:00',
            allDay: false,
            externalUrl: 'https://mp.weixin.qq.com/s/XIg87s2vVMarbvDbDEW4IQ',
            status: 'published'
        },
        {
            id: '10000000-0000-4000-8000-000000000006',
            categoryKey: 'service_month',
            title: { zh: '服务月六一', en: "Service Month Children's Day Event" },
            location: {
                zh: '龙宾楼444教工之家及电院大草坪',
                en: 'Faculty Lounge, Room 444, Long Bin Building, and the SEIEE Lawn'
            },
            description: {
                zh: '服务月六一活动信息，详情请查看相关推送。',
                en: "Service Month Children's Day event information. See the linked announcement for details."
            },
            start: '2026-06-06T17:00:00+08:00',
            end: '2026-06-06T19:30:00+08:00',
            allDay: false,
            externalUrl: 'https://mp.weixin.qq.com/s/5VfUlKgB7ij5sg5Q95iycw',
            status: 'published'
        }
    ];

    var resources = [
        { id: '20000000-0000-4000-8000-000000000001', categoryKey: 'guide', name: { zh: 'GC生存手册', en: 'GC Survival Guide' }, url: 'https://survive.gcers.org/', sortOrder: 10, status: 'published' },
        { id: '20000000-0000-4000-8000-000000000002', categoryKey: 'guide', name: { zh: '各部门历年活动', en: 'Archive of Department Activities' }, url: null, sortOrder: 20, status: 'draft' },
        { id: '20000000-0000-4000-8000-000000000003', categoryKey: 'campus_life', name: { zh: '宿舍钥匙维修', en: 'Dormitory Key Repair' }, url: null, sortOrder: 10, status: 'draft' },
        { id: '20000000-0000-4000-8000-000000000004', categoryKey: 'campus_life', name: { zh: '周边美食打印', en: 'Nearby Dining and Printing' }, url: null, sortOrder: 20, status: 'draft' },
        { id: '20000000-0000-4000-8000-000000000005', categoryKey: 'career', name: { zh: '选课指南', en: 'Course Selection Guide' }, url: 'https://gc.sjtu.edu.cn/cn/academics/courses/', sortOrder: 10, status: 'published' },
        { id: '20000000-0000-4000-8000-000000000006', categoryKey: 'career', name: { zh: '学长经验分享', en: 'Senior Student Experience Sharing' }, url: null, sortOrder: 20, status: 'draft' },
        { id: '20000000-0000-4000-8000-000000000007', categoryKey: 'technology', name: { zh: '技术部 repo', en: 'Technology Department Repositories' }, url: 'https://github.com/Tech-JI', sortOrder: 10, status: 'published' },
        { id: '20000000-0000-4000-8000-000000000008', categoryKey: 'technology', name: { zh: '科协相关文档', en: 'Science and Technology Association Documents' }, url: null, sortOrder: 20, status: 'draft' },
        { id: '20000000-0000-4000-8000-000000000009', categoryKey: 'student_rights', name: { zh: 'Src', en: 'SRC' }, url: 'https://piazza.com/sjtu.org/other/src', sortOrder: 10, status: 'published' },
        { id: '20000000-0000-4000-8000-000000000010', categoryKey: 'more', name: { zh: '敬请期待', en: 'Coming Soon' }, url: null, sortOrder: 10, status: 'draft' }
    ];

    window.GCINFO_LEGACY_CONTENT = {
        categories: categories,
        events: events,
        resources: resources
    };
})();
