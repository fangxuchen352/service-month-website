(function () {
    'use strict';

    var client = null;

    function getConfig() {
        return window.GCINFO_CONFIG || {};
    }

    function hasProjectConfig() {
        var config = getConfig();

        return Boolean(
            config.supabaseUrl &&
            config.supabasePublishableKey &&
            !config.supabaseUrl.includes('YOUR_PROJECT_REF') &&
            !config.supabasePublishableKey.includes('YOUR_KEY')
        );
    }

    function isConfigured() {
        return Boolean(
            hasProjectConfig() &&
            window.supabase &&
            typeof window.supabase.createClient === 'function'
        );
    }

    function getClient() {
        if (!isConfigured()) return null;

        if (!client) {
            var config = getConfig();
            client = window.supabase.createClient(
                config.supabaseUrl,
                config.supabasePublishableKey,
                {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true
                    }
                }
            );
        }

        return client;
    }

    window.GCInfoSupabase = Object.freeze({
        hasProjectConfig: hasProjectConfig,
        isConfigured: isConfigured,
        getClient: getClient
    });
})();
