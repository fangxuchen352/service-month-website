(function () {
    'use strict';

    function getLocalContent(error) {
        var local = window.GCINFO_LEGACY_CONTENT || {
            categories: [],
            events: []
        };

        return {
            source: 'local',
            error: error || null,
            categories: local.categories.slice(),
            events: local.events.filter(function (event) {
                return event.status === 'published';
            })
        };
    }

    function isSafeUrl(value) {
        if (!value) return false;

        try {
            var url = new URL(value, window.location.href);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (error) {
            return false;
        }
    }

    function normalizeCategory(row) {
        return {
            id: row.id,
            kind: row.kind,
            key: row.key,
            name: { zh: row.name_zh, en: row.name_en },
            color: row.color,
            sortOrder: row.sort_order
        };
    }

    function normalizeEvent(row, categoryById) {
        var category = categoryById[row.category_id];

        return {
            id: row.id,
            categoryId: row.category_id,
            categoryKey: category ? category.key : '',
            title: { zh: row.title_zh, en: row.title_en },
            location: { zh: row.location_zh, en: row.location_en },
            description: { zh: row.description_zh, en: row.description_en },
            start: row.start_at,
            end: row.end_at,
            allDay: row.all_day,
            externalUrl: isSafeUrl(row.external_url) ? row.external_url : null,
            status: row.status
        };
    }

    async function loadFromSupabase(client) {
        var results = await Promise.all([
            client
                .from('categories')
                .select('id,kind,key,name_zh,name_en,color,sort_order,is_active')
                .eq('kind', 'event')
                .eq('is_active', true)
                .order('sort_order', { ascending: true }),
            client
                .from('events')
                .select('id,category_id,title_zh,title_en,location_zh,location_en,description_zh,description_en,start_at,end_at,all_day,external_url,status,deleted_at')
                .eq('status', 'published')
                .is('deleted_at', null)
                .order('start_at', { ascending: true })
        ]);

        var firstError = results.find(function (result) { return result.error; });
        if (firstError) throw firstError.error;

        var categories = results[0].data.map(normalizeCategory);
        var categoryById = categories.reduce(function (map, category) {
            map[category.id] = category;
            return map;
        }, {});

        return {
            source: 'supabase',
            error: null,
            categories: categories,
            events: results[1].data.map(function (row) {
                return normalizeEvent(row, categoryById);
            })
        };
    }

    async function loadPublicContent() {
        var connection = window.GCInfoSupabase;
        var client = connection && connection.getClient();
        if (!client) return getLocalContent();

        try {
            return await loadFromSupabase(client);
        } catch (error) {
            return getLocalContent(error);
        }
    }

    window.GCInfoData = Object.freeze({
        loadPublicContent: loadPublicContent,
        isSafeUrl: isSafeUrl
    });
})();
