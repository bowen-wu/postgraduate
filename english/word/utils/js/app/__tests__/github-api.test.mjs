import test from 'node:test';
import assert from 'node:assert/strict';

import { GitHubApi } from '../../api/github.js';

test('filterMdFiles sorts Unit names naturally', () => {
  const items = [
    { type: 'file', name: 'Unit10-1.md' },
    { type: 'file', name: 'Unit2-1.md' },
    { type: 'file', name: 'Unit1-10.md' },
    { type: 'file', name: 'Unit1-2.md' },
    { type: 'file', name: 'Unit1.md' }
  ];

  const names = GitHubApi.filterMdFiles(items).map((item) => item.name);
  assert.deepEqual(names, [
    'Unit1.md',
    'Unit1-2.md',
    'Unit1-10.md',
    'Unit2-1.md',
    'Unit10-1.md'
  ]);
});
