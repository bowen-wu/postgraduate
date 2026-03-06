import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseMarkdownToCards } from '../index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const testsDir = __dirname;
export const projectRoot = resolve(__dirname, '../../../../../..');
export const goldenDir = join(__dirname, 'golden');
export const sampleSnapshotsDir = join(goldenDir, 'samples');

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function hashJson(value) {
  return sha256(JSON.stringify(value));
}

export async function readProjectFile(relativePath) {
  return readFile(resolve(projectRoot, relativePath), 'utf8');
}

export async function parseProjectMarkdown(relativePath) {
  const source = await readProjectFile(relativePath);
  return {
    source,
    cards: parseMarkdownToCards(source)
  };
}

export async function collectCorpusMarkdownFiles() {
  const rootDir = resolve(projectRoot, 'english/word');
  const files = [];

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.name.endsWith('.md')) {
        continue;
      }
      const relativePath = fullPath.replace(`${projectRoot}/`, '');
      if (relativePath.startsWith('english/word/utils/')) {
        continue;
      }
      files.push(relativePath);
    }
  }

  await walk(rootDir);
  return files.sort();
}

export async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
