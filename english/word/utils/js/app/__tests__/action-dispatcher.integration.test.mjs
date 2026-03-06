import test from 'node:test';
import assert from 'node:assert/strict';

import { dispatchAction } from '../../application/action-dispatcher.js';

function createMockApp() {
  const calls = [];
  return {
    calls,
    toggleFiles: () => calls.push('toggleFiles'),
    nextCard: () => calls.push('nextCard'),
    loadFolder: (path) => calls.push(`loadFolder:${path}`),
    selectFile: (path, name) => calls.push(`selectFile:${path}:${name}`),
    handleRecall: (v) => calls.push(`handleRecall:${v}`),
    playWord: (word, btn) => calls.push(`playWord:${word}:${btn}`),
    confirmDialog: { cancel: () => calls.push('cancelDialog') }
  };
}

test('dispatchAction routes next-card and resets local state', () => {
  const app = createMockApp();
  let resetCount = 0;
  dispatchAction({ dataset: { action: 'next-card' } }, {
    app,
    resetCardLocalState: () => { resetCount += 1; }
  });

  assert.deepEqual(app.calls, ['nextCard']);
  assert.equal(resetCount, 1);
});

test('dispatchAction routes folder and file actions', () => {
  const app = createMockApp();
  const noop = () => {};
  dispatchAction({ dataset: { action: 'load-folder', path: 'core' } }, { app, resetCardLocalState: noop });
  dispatchAction({ dataset: { action: 'select-file', path: 'core/a.md', name: 'a.md' } }, { app, resetCardLocalState: noop });

  assert.deepEqual(app.calls, ['loadFolder:core', 'selectFile:core/a.md:a.md']);
});

test('dispatchAction routes recall and play-word', () => {
  const app = createMockApp();
  const noop = () => {};
  dispatchAction({ dataset: { action: 'handle-recall', claimedKnown: 'true' } }, { app, resetCardLocalState: noop });
  dispatchAction({
    dataset: {
      action: 'play-word',
      wordEncoded: encodeURIComponent('hello world'),
      buttonId: 'play-btn-main'
    }
  }, { app, resetCardLocalState: noop });

  assert.deepEqual(app.calls, ['handleRecall:true', 'playWord:hello world:play-btn-main']);
});
