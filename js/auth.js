(function () {
    'use strict';

    var baseProfileFields = 'id,email,display_name,role,approved_at';
    var accessRequestProfileFields = baseProfileFields + ',access_request_organization,access_request_position,access_requested_at';
    var allowedEmailPattern = /^[^@\s]+@(?:[a-z0-9-]+\.)*sjtu\.edu\.cn$/i;

    function isConfigured() {
        return Boolean(window.GCInfoSupabase && window.GCInfoSupabase.isConfigured());
    }

    function normalizeEmail(email) {
        return String(email || '').trim().toLowerCase();
    }

    function isAllowedEmail(email) {
        return allowedEmailPattern.test(normalizeEmail(email));
    }

    function requireClient() {
        var supabaseClient = window.GCInfoSupabase && window.GCInfoSupabase.getClient();
        if (!supabaseClient) {
            throw new Error('登录服务尚未配置。');
        }
        return supabaseClient;
    }

    function getRedirectUrl() {
        return new URL('admin.html', window.location.href).href;
    }

    async function sendMagicLink(email) {
        var normalizedEmail = normalizeEmail(email);

        if (!isAllowedEmail(normalizedEmail)) {
            throw new Error('请使用 @sjtu.edu.cn 或其子域名邮箱。');
        }

        var supabaseClient = requireClient();
        var result = await supabaseClient.auth.signInWithOtp({
            email: normalizedEmail,
            options: {
                emailRedirectTo: getRedirectUrl(),
                shouldCreateUser: true
            }
        });

        if (result.error) throw result.error;
        return result.data;
    }

    async function getSession() {
        var supabaseClient = requireClient();
        var result = await supabaseClient.auth.getSession();
        if (result.error) throw result.error;
        return result.data.session;
    }

    async function getProfile(userId) {
        var supabaseClient = requireClient();
        var result = await supabaseClient
            .from('profiles')
            .select(accessRequestProfileFields)
            .eq('id', userId)
            .single();

        if (result.error && /access_request_/i.test(result.error.message || '')) {
            result = await supabaseClient
                .from('profiles')
                .select(baseProfileFields)
                .eq('id', userId)
                .single();
        }

        if (result.error) throw result.error;
        return Object.assign({
            access_request_organization: null,
            access_request_position: null,
            access_requested_at: null
        }, result.data);
    }

    async function submitAccessRequest(displayName, organization, position) {
        var result = await requireClient().rpc('submit_editor_access_request', {
            requested_display_name: String(displayName || '').trim(),
            requested_organization: String(organization || '').trim(),
            requested_position: String(position || '').trim()
        });

        if (result.error) {
            if (/submit_editor_access_request/i.test(result.error.message || '')) {
                throw new Error('申请功能尚未完成数据库配置，请联系管理员。');
            }
            throw result.error;
        }
    }

    function onAuthStateChange(callback) {
        var supabaseClient = requireClient();
        return supabaseClient.auth.onAuthStateChange(function (event, session) {
            window.setTimeout(function () {
                callback(event, session);
            }, 0);
        });
    }

    async function signOut() {
        var supabaseClient = requireClient();
        var result = await supabaseClient.auth.signOut({ scope: 'local' });
        if (result.error) throw result.error;
    }

    window.GCInfoAuth = Object.freeze({
        isConfigured: isConfigured,
        isAllowedEmail: isAllowedEmail,
        normalizeEmail: normalizeEmail,
        sendMagicLink: sendMagicLink,
        getSession: getSession,
        getProfile: getProfile,
        submitAccessRequest: submitAccessRequest,
        onAuthStateChange: onAuthStateChange,
        signOut: signOut
    });
})();
