import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlFiles = ['index.html', 'admin.html'];
const publicDirectories = ['css', 'js'];
const failures = [];

function fail(message) {
    failures.push(message);
}

async function exists(filePath) {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function listFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...await listFiles(fullPath));
        } else if (entry.isFile()) {
            files.push(fullPath);
        }
    }

    return files;
}

function publicLabel(filePath) {
    return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

function isExternalReference(reference) {
    return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference);
}

async function checkHtml(fileName) {
    const filePath = path.join(projectRoot, fileName);
    const source = await readFile(filePath, 'utf8');
    const seenIds = new Set();
    const idPattern = /\bid\s*=\s*(["'])(.*?)\1/gi;
    const referencePattern = /\b(?:src|href)\s*=\s*(["'])(.*?)\1/gi;
    let match;

    while ((match = idPattern.exec(source))) {
        const id = match[2].trim();
        if (!id) {
            fail(`${fileName}: 发现空的 id 属性。`);
        } else if (seenIds.has(id)) {
            fail(`${fileName}: id "${id}" 重复。`);
        }
        seenIds.add(id);
    }

    while ((match = referencePattern.exec(source))) {
        const reference = match[2].trim();
        if (!reference || isExternalReference(reference)) {
            continue;
        }

        if (reference.startsWith('/')) {
            fail(`${fileName}: "${reference}" 使用站点根路径，在 GitHub 项目页面中会失效。`);
            continue;
        }

        const referenceWithoutQuery = reference.split(/[?#]/, 1)[0];
        const resolved = path.resolve(path.dirname(filePath), referenceWithoutQuery);
        const relative = path.relative(projectRoot, resolved);

        if (relative.startsWith('..') || path.isAbsolute(relative)) {
            fail(`${fileName}: "${reference}" 指向公开目录之外。`);
        } else if (!await exists(resolved)) {
            fail(`${fileName}: 找不到本地引用 "${reference}"。`);
        }
    }
}

async function checkCss(filePath) {
    const source = await readFile(filePath, 'utf8');
    const urlPattern = /url\(\s*(["']?)(.*?)\1\s*\)/gi;
    let match;

    while ((match = urlPattern.exec(source))) {
        const reference = match[2].trim();
        if (!reference || isExternalReference(reference) || reference.startsWith('data:')) {
            continue;
        }

        if (reference.startsWith('/')) {
            fail(`${publicLabel(filePath)}: "${reference}" 使用站点根路径。`);
            continue;
        }

        const referenceWithoutQuery = reference.split(/[?#]/, 1)[0];
        const resolved = path.resolve(path.dirname(filePath), referenceWithoutQuery);
        if (!await exists(resolved)) {
            fail(`${publicLabel(filePath)}: 找不到本地引用 "${reference}"。`);
        }
    }
}

async function checkJavaScript(filePath) {
    const source = await readFile(filePath, 'utf8');
    try {
        new vm.Script(source, { filename: publicLabel(filePath) });
    } catch (error) {
        fail(`${publicLabel(filePath)}: JavaScript 语法错误：${error.message}`);
    }
}

function checkForPublicSecrets(filePath, source) {
    const label = publicLabel(filePath);
    const forbiddenPatterns = [
        [/sb_secret_[A-Za-z0-9_-]+/i, 'Supabase secret key'],
        [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i, 'private key'],
        [/(?:SUPABASE_SERVICE_ROLE_KEY|TRANSLATION_API_KEY|OPENAI_API_KEY)\s*[:=]\s*["'][^"']+["']/i, 'server-side secret']
    ];

    for (const [pattern, description] of forbiddenPatterns) {
        if (pattern.test(source)) {
            fail(`${label}: 公开文件中疑似包含 ${description}。`);
        }
    }
}

for (const fileName of htmlFiles) {
    const filePath = path.join(projectRoot, fileName);
    if (!await exists(filePath)) {
        fail(`缺少公开入口文件 ${fileName}。`);
    } else {
        await checkHtml(fileName);
    }
}

const publicFiles = [];
for (const directoryName of publicDirectories) {
    const directory = path.join(projectRoot, directoryName);
    if (!await exists(directory)) {
        fail(`缺少公开资源目录 ${directoryName}/。`);
        continue;
    }
    publicFiles.push(...await listFiles(directory));
}

for (const filePath of publicFiles) {
    const source = await readFile(filePath, 'utf8');
    checkForPublicSecrets(filePath, source);

    if (filePath.endsWith('.js')) {
        await checkJavaScript(filePath);
    } else if (filePath.endsWith('.css')) {
        await checkCss(filePath);
    }
}

for (const fileName of htmlFiles) {
    const filePath = path.join(projectRoot, fileName);
    if (await exists(filePath)) {
        checkForPublicSecrets(filePath, await readFile(filePath, 'utf8'));
    }
}

const configSource = await readFile(path.join(projectRoot, 'js/config.js'), 'utf8');
if (!configSource.includes("allowedEmailDomain: 'sjtu.edu.cn'")) {
    fail('js/config.js: 学校邮箱域名必须保持为 sjtu.edu.cn。');
}
if (/TRANSLATION_API_(?:KEY|URL)|SUPABASE_SERVICE_ROLE_KEY/.test(configSource)) {
    fail('js/config.js: 后端密钥或翻译服务配置不能放在浏览器配置中。');
}

const calendarSource = await readFile(path.join(projectRoot, 'js/calendar.js'), 'utf8');
if (!/initialDate\s*:\s*new Date\(\)/.test(calendarSource)) {
    fail('js/calendar.js: 日历首次打开时必须定位到访问当天。');
}

const fallbackContentSource = await readFile(path.join(projectRoot, 'js/content-data.js'), 'utf8');
if (!fallbackContentSource.includes("zh: '科协活动'")
    || !fallbackContentSource.includes("en: 'Science and Technology Association Events'")) {
    fail('js/content-data.js: 科协活动图例必须同时包含中英文名称。');
}

const publicPageSource = await readFile(path.join(projectRoot, 'index.html'), 'utf8');
if (publicPageSource.includes('resource-grid') || publicPageSource.includes('js/resources.js')) {
    fail('index.html: 公开首页不应再显示或加载资源入口。');
}
if (!publicPageSource.includes('id="calendar"') || !publicPageSource.includes('id="legend-items"')) {
    fail('index.html: 公开首页必须保留活动日历和图例。');
}

if (failures.length > 0) {
    console.error('公开网站检查失败：');
    for (const message of failures) {
        console.error(`- ${message}`);
    }
    process.exitCode = 1;
} else {
    console.log(`公开网站检查通过：${htmlFiles.length} 个页面，${publicFiles.length} 个资源文件。`);
}
