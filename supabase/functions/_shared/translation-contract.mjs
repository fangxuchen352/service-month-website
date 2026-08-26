export class TranslationContractError extends Error {
    constructor(message, code = 'invalid_request', status = 400) {
        super(message);
        this.name = 'TranslationContractError';
        this.code = code;
        this.status = status;
    }
}

const SUPPORTED_LANGUAGES = new Set(['zh', 'en']);
const ITEM_KEY_PATTERN = /^[a-z][a-z0-9_]{0,40}$/;
const MAX_ITEMS = 8;
const MAX_ITEM_CHARACTERS = 3000;
const MAX_TOTAL_CHARACTERS = 6000;

export function validateTranslationRequest(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new TranslationContractError('请求内容无效 / Invalid request body.');
    }

    const sourceLanguage = body.sourceLanguage;
    const targetLanguage = body.targetLanguage;
    if (!SUPPORTED_LANGUAGES.has(sourceLanguage) || !SUPPORTED_LANGUAGES.has(targetLanguage)) {
        throw new TranslationContractError('只支持中文和英文 / Only Chinese and English are supported.');
    }
    if (sourceLanguage === targetLanguage) {
        throw new TranslationContractError('源语言和目标语言不能相同 / Source and target languages must differ.');
    }
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > MAX_ITEMS) {
        throw new TranslationContractError(`每次需要提交 1–${MAX_ITEMS} 个字段 / Submit 1–${MAX_ITEMS} fields.`);
    }

    const seenKeys = new Set();
    let totalCharacters = 0;
    const items = body.items.map((item) => {
        const key = typeof item?.key === 'string' ? item.key.trim() : '';
        const text = typeof item?.text === 'string' ? item.text.trim() : '';
        if (!ITEM_KEY_PATTERN.test(key) || seenKeys.has(key)) {
            throw new TranslationContractError('翻译字段标识无效或重复 / Translation field keys are invalid or duplicated.');
        }
        if (!text || text.length > MAX_ITEM_CHARACTERS) {
            throw new TranslationContractError(`每个字段须为 1–${MAX_ITEM_CHARACTERS} 个字符 / Each field must contain 1–${MAX_ITEM_CHARACTERS} characters.`);
        }
        seenKeys.add(key);
        totalCharacters += text.length;
        return { key, text };
    });

    if (totalCharacters > MAX_TOTAL_CHARACTERS) {
        throw new TranslationContractError(`单次翻译总长度不能超过 ${MAX_TOTAL_CHARACTERS} 个字符 / Translation request is too long.`);
    }

    return { sourceLanguage, targetLanguage, items };
}

export function validateProviderResult(payload, expectedItems) {
    if (!payload || !Array.isArray(payload.translations)) {
        throw new TranslationContractError(
            '翻译服务返回格式无效 / Translation provider returned an invalid response.',
            'invalid_provider_response',
            502
        );
    }

    const translationsByKey = new Map();
    payload.translations.forEach((item) => {
        const key = typeof item?.key === 'string' ? item.key.trim() : '';
        const text = typeof item?.text === 'string' ? item.text.trim() : '';
        if (!ITEM_KEY_PATTERN.test(key) || !text || text.length > MAX_ITEM_CHARACTERS || translationsByKey.has(key)) {
            throw new TranslationContractError(
                '翻译服务返回了无效字段 / Translation provider returned invalid fields.',
                'invalid_provider_response',
                502
            );
        }
        translationsByKey.set(key, text);
    });

    if (translationsByKey.size !== expectedItems.length) {
        throw new TranslationContractError(
            '翻译服务返回字段数量不完整 / Translation provider returned incomplete fields.',
            'invalid_provider_response',
            502
        );
    }

    return expectedItems.map((item) => {
        const text = translationsByKey.get(item.key);
        if (!text) {
            throw new TranslationContractError(
                '翻译服务遗漏了字段 / Translation provider omitted a field.',
                'invalid_provider_response',
                502
            );
        }
        return { key: item.key, text };
    });
}
