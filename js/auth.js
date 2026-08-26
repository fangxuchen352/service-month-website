(function () {
    'use strict';

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
            .select('id,email,display_name,role,approved_at')
            .eq('id', userId)
            .single();

        if (result.error) throw result.error;
        return result.data;
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
        onAuthStateChange: onAuthStateChange,
        signOut: signOut
    });
})();
