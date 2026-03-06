import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  goldenDir,
  hashJson,
  parseProjectMarkdown,
  readProjectFile,
  sha256
} from './golden-helpers.mjs';

const baselines = JSON.parse(
  await readFile(join(goldenDir, 'corpus-baselines.json'), 'utf8')
);

test('full markdown corpus output hashes stay stable', async (t) => {
  for (const baseline of baselines) {
    await t.test(baseline.source, async (t) => {
      const source = await readProjectFile(baseline.source);
      const sourceHash = sha256(source);

      if (sourceHash !== baseline.sourceHash) {
        t.skip(`source changed for ${baseline.source}`);
        return;
      }

      const { cards } = await parseProjectMarkdown(baseline.source);
      assert.equal(hashJson(cards), baseline.outputHash, `hash mismatch: ${baseline.source}`);
    });
  }
});
