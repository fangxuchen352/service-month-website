(function () {
    'use strict';

    var CATEGORY_FIELDS = 'id,kind,key,name_zh,name_en,color,sort_order,is_active';
    var EVENT_FIELDS = 'id,category_id,title_zh,title_en,location_zh,location_en,description_zh,description_en,start_at,end_at,all_day,external_url,status,created_by,deleted_at,deleted_by,created_at,updated_at';
    var RESOURCE_FIELDS = 'id,category_id,name_zh,name_en,url,sort_order,status,created_by,deleted_at,deleted_by,created_at,updated_at';
    var PROFILE_FIELDS = 'id,email,display_name,role,approved_at,created_at';
    var PROFILE_REVIEW_FIELDS = PROFILE_FIELDS + ',access_request_organization,access_request_position,access_requested_at';

    function requireClient() {
        var connection = window.GCInfoSupabase;
        var client = connection && connection.getClient();
        if (!client) throw new Error('管理服务尚未配置。');
        return client;
    }

    function unwrap(result) {
        if (result.error) throw result.error;
        return result.data;
    }

    async function loadCategories(client) {
        return unwrap(await client
            .from('categories')
            .select(CATEGORY_FIELDS)
            .order('sort_order', { ascending: true }));
    }

    async function loadEvents(client, profile) {
        var query = client
            .from('events')
            .select(EVENT_FIELDS);

        if (profile.role === 'editor') query = query.eq('created_by', profile.id);
        return unwrap(await query.order('updated_at', { ascending: false }));
    }

    async function loadResources(client, profile) {
        var query = client
            .from('resources')
            .select(RESOURCE_FIELDS);

        if (profile.role === 'editor') query = query.eq('created_by', profile.id);
        return unwrap(await query.order('updated_at', { ascending: false }));
    }

    async function loadProfiles(client, profile) {
        if (profile.role !== 'admin') return [];
        var result = await client
            .from('profiles')
            .select(PROFILE_REVIEW_FIELDS)
            .order('created_at', { ascending: false });

        if (result.error && /access_request_/i.test(result.error.message || '')) {
            result = await client
                .from('profiles')
                .select(PROFILE_FIELDS)
                .order('created_at', { ascending: false });
        }

        return unwrap(result);
    }

    async function loadWorkspace(profile) {
        var client = requireClient();
        var results = await Promise.all([
            loadCategories(client),
            loadEvents(client, profile),
            loadResources(client, profile),
            loadProfiles(client, profile)
        ]);

        return {
            categories: results[0],
            events: results[1],
            resources: results[2],
            profiles: results[3]
        };
    }

    async function createEvent(values, userId) {
        return unwrap(await requireClient()
            .from('events')
            .insert(Object.assign({}, values, { created_by: userId }))
            .select(EVENT_FIELDS)
            .single());
    }

    async function updateEvent(id, values) {
        return unwrap(await requireClient()
            .from('events')
            .update(values)
            .eq('id', id)
            .select(EVENT_FIELDS)
            .single());
    }

    async function createResource(values, userId) {
        return unwrap(await requireClient()
            .from('resources')
            .insert(Object.assign({}, values, { created_by: userId }))
            .select(RESOURCE_FIELDS)
            .single());
    }

    async function updateResource(id, values) {
        return unwrap(await requireClient()
            .from('resources')
            .update(values)
            .eq('id', id)
            .select(RESOURCE_FIELDS)
            .single());
    }

    async function moveToTrash(kind, id) {
        var table = kind === 'event' ? 'events' : 'resources';
        var fields = kind === 'event' ? EVENT_FIELDS : RESOURCE_FIELDS;
        return unwrap(await requireClient()
            .from(table)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .select(fields)
            .single());
    }

    async function restoreFromTrash(kind, id) {
        var table = kind === 'event' ? 'events' : 'resources';
        var fields = kind === 'event' ? EVENT_FIELDS : RESOURCE_FIELDS;
        return unwrap(await requireClient()
            .from(table)
            .update({ deleted_at: null })
            .eq('id', id)
            .select(fields)
            .single());
    }

    async function updateProfileRole(id, role) {
        return unwrap(await requireClient()
            .from('profiles')
            .update({ role: role })
            .eq('id', id)
            .select(PROFILE_FIELDS)
            .single());
    }

    async function importLegacyContent() {
        return unwrap(await requireClient().rpc('import_legacy_content'));
    }

    window.GCInfoAdminData = Object.freeze({
        loadWorkspace: loadWorkspace,
        createEvent: createEvent,
        updateEvent: updateEvent,
        createResource: createResource,
        updateResource: updateResource,
        moveToTrash: moveToTrash,
        restoreFromTrash: restoreFromTrash,
        updateProfileRole: updateProfileRole,
        importLegacyContent: importLegacyContent
    });
})();
