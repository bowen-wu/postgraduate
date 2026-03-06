import test from 'node:test';
import assert from 'node:assert/strict';

import { STATE } from '../../config.js';
import { createKeyboardShortcutHandler } from '../keyboard-shortcuts.js';

function createEvent(key, tagName = 'DIV') {
  return {
    key,
    target: { tagName },
    metaKey: false,
    ctrlKey: false,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    }
  };
}

function createDeps() {
  const calls = {
    next: 0,
    prev: 0,
    toggleMode: 0,
    handleRecall: [],
    confirmRecall: []
  };

  const app = {
    nextCard: () => { calls.next += 1; },
    prevCard: () => { calls.prev += 1; },
    playWord: () => {},
    translatePhrase: () => {},
    translateSentence: () => {},
    confirmRecall: (v) => { calls.confirmRecall.push(v); },
    handleRecall: (v) => { calls.handleRecall.push(v); },
    toggleShortcuts: () => {},
    toggleAutoPlay: () => {},
    toggleStats: () => {},
    toggleFiles: () => {}
  };

  const useCases = {
    closeOverlaysByPriority: () => {},
    jumpToFirst: () => {},
    jumpToLast: () => {},
    toggleMode: () => { calls.toggleMode += 1; }
  };

  const keyboardState = {
    lastPlayTime: {},
    synonymPlayIndex: 0,
    antonymPlayIndex: 0,
    isConfirming: false
  };

  let resetCount = 0;
  const handler = createKeyboardShortcutHandler({
    app,
    useCases,
    keyboardState,
    resetCardLocalState: () => { resetCount += 1; }
  });

  return { handler, calls, keyboardState, getResetCount: () => resetCount };
}

test('Enter moves to next card and resets local state', () => {
  STATE.cards = [{ id: '1', type: 'word', word: 'alpha', items: [] }];
  STATE.displayOrder = [0];
  STATE.currentIndex = 0;
  STATE.mode = 'input';

  const { handler, calls, getResetCount } = createDeps();
  const event = createEvent('Enter');
  handler(event);

  assert.equal(calls.next, 1);
  assert.equal(getResetCount(), 1);
  assert.equal(event.prevented, true);
});

test('m toggles mode via use-cases', () => {
  STATE.cards = [{ id: '1', type: 'word', word: 'alpha', items: [] }];
  STATE.displayOrder = [0];
  STATE.currentIndex = 0;
  STATE.mode = 'input';

  const { handler, calls } = createDeps();
  const event = createEvent('m');
  handler(event);
  assert.equal(calls.toggleMode, 1);
});

test('y only works in recall mode', () => {
  STATE.cards = [{ id: '1', type: 'word', word: 'alpha', items: [] }];
  STATE.displayOrder = [0];
  STATE.currentIndex = 0;
  STATE.mode = 'input';

  const deps = createDeps();
  deps.handler(createEvent('y'));
  assert.deepEqual(deps.calls.handleRecall, []);

  STATE.mode = 'recall';
  deps.handler(createEvent('y'));
  assert.deepEqual(deps.calls.handleRecall, [true]);
});
