import test from 'node:test';
import assert from 'node:assert/strict';

import { runFallbackChain } from '../fallback-chain.js';

test('runFallbackChain returns first successful source', async () => {
  const sources = [{ name: 'A' }, { name: 'B' }];
  const result = await runFallbackChain(
    sources,
    async (source) => {
      if (source.name === 'A') throw new Error('A failed');
      return 'ok';
    },
    'all failed'
  );

  assert.equal(result.sourceName, 'B');
  assert.equal(result.value, 'ok');
});

test('runFallbackChain aggregates errors when all fail', async () => {
  const sources = [{ name: 'A' }, { name: 'B' }];
  await assert.rejects(
    runFallbackChain(
      sources,
      async (source) => {
        throw new Error(`${source.name} failed`);
      },
      'all failed'
    ),
    (error) => {
      assert.equal(error.message, 'all failed');
      assert.equal(Array.isArray(error.details), true);
      assert.equal(error.details.length, 2);
      return true;
    }
  );
});
