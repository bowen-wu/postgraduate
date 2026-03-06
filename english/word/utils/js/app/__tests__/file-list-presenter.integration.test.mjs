import test from 'node:test';
import assert from 'node:assert/strict';

import { renderRootFileList, renderFolderFileList, renderFileListError } from '../presenters/file-list-presenter.js';

test('renderRootFileList includes folder and file actions', () => {
  const html = renderRootFileList({
    folders: [{ name: 'core' }],
    files: [{ name: 'u1.md' }]
  });
  assert.match(html, /data-action="load-folder"/);
  assert.match(html, /data-action="select-file"/);
});

test('renderFolderFileList includes back navigation and path actions', () => {
  const html = renderFolderFileList({
    path: 'core/unit',
    folders: [{ name: 'nested' }],
    files: [{ name: 'u2.md' }]
  });
  assert.match(html, /data-action="load-root-folders"/);
  assert.match(html, /data-path="core\/unit\/nested"/);
  assert.match(html, /data-path="core\/unit\/u2.md"/);
});

test('renderFileListError keeps retry action', () => {
  const html = renderFileListError('boom', '重试');
  assert.match(html, /data-action="load-root-folders"/);
  assert.match(html, /加载失败: boom/);
});
