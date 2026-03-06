import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseMarkdownToCards } from '../index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

const fixtureFiles = (await readdir(fixturesDir))
  .filter((name) => name.endsWith('.md'))
  .sort();

test('all parser fixtures have expected snapshots', async () => {
  for (const fixtureName of fixtureFiles) {
    const fixturePath = join(fixturesDir, fixtureName);
    const expectedPath = join(fixturesDir, fixtureName.replace(/\.md$/, '.expected.json'));

    const source = await readFile(fixturePath, 'utf8');
    const expected = JSON.parse(await readFile(expectedPath, 'utf8'));
    const actual = parseMarkdownToCards(source);

    assert.deepEqual(
      actual,
      expected,
      `fixture failed: ${fixtureName}`
    );
  }
});
