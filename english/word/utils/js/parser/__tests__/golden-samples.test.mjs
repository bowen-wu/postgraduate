import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { sampleFiles } from './golden-config.mjs';
import {
  goldenDir,
  hashJson,
  parseProjectMarkdown,
  readProjectFile,
  sha256,
  testsDir
} from './golden-helpers.mjs';

const baselines = JSON.parse(
  await readFile(join(goldenDir, 'sample-baselines.json'), 'utf8')
);

const baselineByKey = new Map(baselines.map((entry) => [entry.key, entry]));

test('golden sample outputs stay stable', async (t) => {
  for (const sample of sampleFiles) {
    const baseline = baselineByKey.get(sample.key);
    await t.test(sample.key, async (t) => {
      const source = await readProjectFile(sample.source);
      const sourceHash = sha256(source);

      if (sourceHash !== baseline.sourceHash) {
        t.skip(`source changed for ${sample.source}`);
        return;
      }

      const { cards } = await parseProjectMarkdown(sample.source);
      assert.equal(hashJson(cards), baseline.outputHash, `hash mismatch: ${sample.source}`);

      if (baseline.mode !== 'snapshot') {
        return;
      }

      const expected = JSON.parse(
        await readFile(join(testsDir, baseline.expectedFile), 'utf8')
      );
      assert.deepEqual(cards, expected, `snapshot mismatch: ${sample.source}`);
    });
  }
});
