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

test('fetchFileContent prefers local same-origin file before GitHub raw', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const calls = [];

  globalThis.window = {
    location: {
      href: 'https://bowen-wu.github.io/postgraduate/english/word/utils/review.html'
    }
  };
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return {
      ok: true,
      text: async () => '# local content'
    };
  };

  try {
    const text = await GitHubApi.fetchFileContent('core/Unit11-3.md');
    assert.equal(text, '# local content');
    assert.equal(calls.length, 1);
    assert.match(calls[0], /\/english\/word\/core\/Unit11-3\.md$/);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});

test('fetchFileContent falls back to GitHub raw when local file fetch fails', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const calls = [];

  globalThis.window = {
    location: {
      href: 'https://bowen-wu.github.io/postgraduate/english/word/utils/review.html'
    }
  };
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (calls.length === 1) {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
    }
    return {
      ok: true,
      text: async () => '# raw content'
    };
  };

  try {
    const text = await GitHubApi.fetchFileContent('core/Unit11-3.md');
    assert.equal(text, '# raw content');
    assert.equal(calls.length, 2);
    assert.match(calls[0], /\/english\/word\/core\/Unit11-3\.md$/);
    assert.match(calls[1], /raw\.githubusercontent\.com/);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});
