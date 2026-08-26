import { cp, lstat, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(projectRoot, 'dist');
const publicEntries = ['index.html', 'admin.html', 'css', 'js'];
const allowedTopLevelEntries = new Set([...publicEntries, '.nojekyll']);

async function validateArtifact(directory) {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        const relativePath = path.relative(outputDirectory, fullPath).split(path.sep).join('/');
        const metadata = await lstat(fullPath);

        if (metadata.isSymbolicLink()) {
            throw new Error(`发布目录不允许符号链接：${relativePath}`);
        }

        if (metadata.isDirectory()) {
            await validateArtifact(fullPath);
            continue;
        }

        const isAllowedFile = relativePath === '.nojekyll'
            || relativePath === 'index.html'
            || relativePath === 'admin.html'
            || /^css\/.+[.]css$/.test(relativePath)
            || /^js\/.+[.]js$/.test(relativePath);

        if (!metadata.isFile() || !isAllowedFile) {
            throw new Error(`发布目录中出现未允许的文件：${relativePath}`);
        }
    }
}

if (path.dirname(outputDirectory) !== projectRoot || path.basename(outputDirectory) !== 'dist') {
    throw new Error('拒绝清理非项目 dist 目录。');
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of publicEntries) {
    await cp(
        path.join(projectRoot, entry),
        path.join(outputDirectory, entry),
        { recursive: true }
    );
}

await writeFile(
    path.join(outputDirectory, '.nojekyll'),
    'This file keeps GitHub Pages from applying Jekyll processing.\n',
    'utf8'
);

const builtEntries = await readdir(outputDirectory);
for (const entry of builtEntries) {
    if (!allowedTopLevelEntries.has(entry)) {
        throw new Error(`发布目录中出现未允许的文件：${entry}`);
    }
}

await validateArtifact(outputDirectory);

console.log('GitHub Pages 发布包已生成：dist/（仅包含公开前端文件）。');
