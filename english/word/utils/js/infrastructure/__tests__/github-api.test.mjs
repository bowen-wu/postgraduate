import test from 'node:test';
import assert from 'node:assert/strict';

import { GitHubApi } from '../../api/github.js';

test('filterMdFiles keeps markdown files and ignores templates', () => {
  const input = [
    { type: 'file', name: 'a.md' },
    { type: 'file', name: 'template.md' },
    { type: 'file', name: 'basic.md' },
    { type: 'file', name: 'a.txt' },
    { type: 'dir', name: 'core' }
  ];

  const files = GitHubApi.filterMdFiles(input);
  assert.deepEqual(files, [{ type: 'file', name: 'a.md' }]);
});

test('fetchContents throws readable message on GitHub rate limit', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 403,
    headers: {
      get: () => String(Math.floor(Date.now() / 1000) + 60)
    }
  });

  try {
    await assert.rejects(
      GitHubApi.fetchContents('', true),
      (error) => {
        assert.match(error.message, /速率限制/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
