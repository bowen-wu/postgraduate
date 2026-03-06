import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseMarkdownToCards } from '../index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

const fixtureFiles = (await readdir(fixturesDir))
  .filter((name) => name.endsWith('.md'))
  .sort();

for (const fixtureName of fixtureFiles) {
  const fixturePath = join(fixturesDir, fixtureName);
  const expectedPath = join(fixturesDir, fixtureName.replace(/\.md$/, '.expected.json'));

  const source = await readFile(fixturePath, 'utf8');
  const cards = parseMarkdownToCards(source);
  await writeFile(expectedPath, `${JSON.stringify(cards, null, 2)}\n`, 'utf8');
  console.log(`updated ${expectedPath}`);
}
