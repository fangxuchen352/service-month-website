import { withSupabase } from 'npm:@supabase/server@^1';
import {
    TranslationContractError,
    validateProviderResult,
    validateTranslationRequest
} from '../_shared/translation-contract.mjs';

class HttpError extends Error {
    status: number;
    code: string;

    constructor(status: number, code: string, message: string) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.code = code;
    }
}

type TranslationItem = { key: string; text: string };
type TranslationRequest = {
    sourceLanguage: 'zh' | 'en';
    targetLanguage: 'zh' | 'en';
    items: TranslationItem[];
};

function assertAllowedOrigin(request: Request) {
    const requestOrigin = request.headers.get('origin');
    const configuredOrigins = (Deno.env.get('TRANSLATION_ALLOWED_ORIGINS') || '*')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (configuredOrigins.includes('*')) return;
    if (!requestOrigin || !configuredOrigins.includes(requestOrigin)) {
        throw new HttpError(403, 'origin_not_allowed', '请求来源不允许 / Origin not allowed.');
    }
}

function jsonResponse(payload: unknown, status: number): Response {
    return Response.json(payload, {
        status,
        headers: { 'Cache-Control': 'no-store' }
    });
}

function requireEnvironment(name: string): string {
    const value = Deno.env.get(name)?.trim();
    if (!value) {
        throw new HttpError(
            503,
            'translation_not_configured',
            `翻译服务尚未配置：缺少 ${name} / Translation service is not configured.`
        );
    }
    return value;
}

async function authorizeEditor(context: any): Promise<void> {
    const userId = context.userClaims?.sub || context.userClaims?.id;
    if (!userId) {
        throw new HttpError(401, 'invalid_session', '登录状态无效 / Invalid session.');
    }

    const { data: profile, error: profileError } = await context.supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
    if (profileError || !profile || !['editor', 'admin'].includes(profile.role)) {
        throw new HttpError(403, 'editing_access_required', '尚未获得编辑权限 / Editing access required.');
    }

}

async function loadGlossary(serviceClient: any, sourceLanguage: string, targetLanguage: string) {
    const [directResult, reverseResult] = await Promise.all([
        serviceClient
            .from('translation_glossary')
            .select('source_text,target_text')
            .eq('source_language', sourceLanguage)
            .eq('target_language', targetLanguage)
            .eq('is_active', true)
            .order('source_text', { ascending: true })
            .limit(100),
        serviceClient
            .from('translation_glossary')
            .select('source_text,target_text')
            .eq('source_language', targetLanguage)
            .eq('target_language', sourceLanguage)
            .eq('is_active', true)
            .order('source_text', { ascending: true })
            .limit(100)
    ]);

    if (directResult.error || reverseResult.error) {
        console.error(
            'Translation glossary could not be loaded:',
            directResult.error?.message || reverseResult.error?.message
        );
    }

    const glossary = new Map<string, string>();
    (directResult.data || []).forEach((entry) => glossary.set(entry.source_text, entry.target_text));
    (reverseResult.data || []).forEach((entry) => {
        if (!glossary.has(entry.target_text)) glossary.set(entry.target_text, entry.source_text);
    });
    return Array.from(glossary, ([source_text, target_text]) => ({ source_text, target_text })).slice(0, 100);
}

async function callCustomJsonProvider(request: TranslationRequest, glossary: unknown[]) {
    const endpointValue = requireEnvironment('TRANSLATION_API_URL');
    const apiKey = requireEnvironment('TRANSLATION_API_KEY');
    let endpoint: URL;
    try {
        endpoint = new URL(endpointValue);
    } catch (_error) {
        throw new HttpError(503, 'invalid_provider_url', '翻译服务地址无效 / Invalid translation provider URL.');
    }
    const allowInsecure = Deno.env.get('TRANSLATION_ALLOW_INSECURE_HTTP') === 'true';
    if (endpoint.protocol !== 'https:' && !(allowInsecure && endpoint.protocol === 'http:')) {
        throw new HttpError(503, 'invalid_provider_url', '翻译服务必须使用 HTTPS / Translation provider must use HTTPS.');
    }

    const timeoutValue = Number.parseInt(Deno.env.get('TRANSLATION_TIMEOUT_MS') || '20000', 10);
    const timeoutMs = Number.isFinite(timeoutValue) ? Math.min(Math.max(timeoutValue, 1000), 60000) : 20000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'X-GCinfo-Translation-Version': '1'
            },
            body: JSON.stringify({
                sourceLanguage: request.sourceLanguage,
                targetLanguage: request.targetLanguage,
                items: request.items,
                glossary
            })
        });
        if (!response.ok) {
            throw new HttpError(502, 'provider_request_failed', '翻译服务请求失败 / Translation provider request failed.');
        }
        const responseText = await response.text();
        if (responseText.length > 100000) {
            throw new HttpError(502, 'provider_response_too_large', '翻译服务响应过大 / Translation provider response is too large.');
        }
        let payload: unknown;
        try {
            payload = JSON.parse(responseText);
        } catch (_error) {
            throw new HttpError(502, 'invalid_provider_response', '翻译服务返回格式无效 / Invalid translation provider response.');
        }
        return validateProviderResult(payload, request.items);
    } catch (error) {
        if (error instanceof HttpError || error instanceof TranslationContractError) throw error;
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new HttpError(504, 'provider_timeout', '翻译服务响应超时 / Translation provider timed out.');
        }
        throw new HttpError(502, 'provider_unavailable', '翻译服务暂时不可用 / Translation provider is unavailable.');
    } finally {
        clearTimeout(timeout);
    }
}

async function translate(request: TranslationRequest, serviceClient: any) {
    const provider = (Deno.env.get('TRANSLATION_PROVIDER') || '').trim();
    const glossary = await loadGlossary(serviceClient, request.sourceLanguage, request.targetLanguage);

    switch (provider) {
        case 'custom_json':
            return {
                provider,
                translations: await callCustomJsonProvider(request, glossary)
            };
        default:
            throw new HttpError(
                503,
                'translation_not_configured',
                '尚未选择翻译服务 / Translation provider has not been selected.'
            );
    }
}

export default {
    fetch: withSupabase({ auth: 'user' }, async (request, context) => {
        try {
            assertAllowedOrigin(request);
            if (request.method !== 'POST') {
                return jsonResponse({ error: 'method_not_allowed', message: '仅支持 POST 请求 / POST required.' }, 405);
            }

            await authorizeEditor(context);
            const requestText = await request.text();
            if (requestText.length > 20000) {
                throw new HttpError(413, 'request_too_large', '翻译请求过大 / Translation request is too large.');
            }
            let body: unknown;
            try {
                body = JSON.parse(requestText);
            } catch (_error) {
                throw new HttpError(400, 'invalid_json', '请求格式无效 / Invalid JSON request.');
            }
            const translationRequest = validateTranslationRequest(body) as TranslationRequest;
            const result = await translate(translationRequest, context.supabaseAdmin);
            return jsonResponse({
                translations: result.translations,
                provider: result.provider,
                needsReview: true
            }, 200);
        } catch (error) {
            if (error instanceof TranslationContractError || error instanceof HttpError) {
                return jsonResponse({ error: error.code, message: error.message }, error.status);
            }
            console.error('Unexpected translation error:', error instanceof Error ? error.message : 'unknown error');
            return jsonResponse({
                error: 'internal_error',
                message: '翻译服务发生错误 / Translation service error.'
            }, 500);
        }
    })
};
