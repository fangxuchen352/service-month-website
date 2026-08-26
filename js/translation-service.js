(function () {
    'use strict';

    function requireClient() {
        var connection = window.GCInfoSupabase;
        var client = connection && connection.getClient();
        if (!client) throw new Error('翻译服务尚未连接 / Translation service is not connected.');
        return client;
    }

    async function getFunctionErrorMessage(error) {
        try {
            if (error && error.context && typeof error.context.json === 'function') {
                var payload = await error.context.json();
                if (payload && payload.message) return payload.message;
            }
        } catch (contextError) {
            // Fall back to the SDK error message when the response is not JSON.
        }
        return error && error.message
            ? error.message
            : '自动翻译失败 / Automatic translation failed.';
    }

    function validateResponse(data, requestedItems) {
        if (!data || !Array.isArray(data.translations) || data.needsReview !== true) {
            throw new Error('翻译服务返回格式无效 / Invalid translation response.');
        }

        var translationsByKey = new Map();
        data.translations.forEach(function (item) {
            if (item && typeof item.key === 'string' && typeof item.text === 'string' && item.text.trim()) {
                translationsByKey.set(item.key, item.text.trim());
            }
        });

        var translations = requestedItems.map(function (item) {
            var text = translationsByKey.get(item.key);
            if (!text) throw new Error('翻译结果缺少字段 / Translation result is incomplete.');
            return { key: item.key, text: text };
        });

        return {
            translations: translations,
            provider: typeof data.provider === 'string' ? data.provider : 'configured-provider',
            needsReview: true
        };
    }

    async function translate(sourceLanguage, targetLanguage, items) {
        var client = requireClient();
        var result = await client.functions.invoke('translate', {
            body: {
                sourceLanguage: sourceLanguage,
                targetLanguage: targetLanguage,
                items: items
            }
        });

        if (result.error) throw new Error(await getFunctionErrorMessage(result.error));
        return validateResponse(result.data, items);
    }

    window.GCInfoTranslation = Object.freeze({
        translate: translate
    });
})();
