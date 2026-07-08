import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applySavedProgressState,
  pickPreferredProgressSnapshot,
  shouldPersistResumeSnapshot
} from '../state/persistence.js';

test('applySavedProgressState restores saved displayOrder and current card in randomAll mode', () => {
  const state = {
    cards: [
      { id: 'card_a', type: 'word' },
      { id: 'card_b', type: 'phrase' },
      { id: 'card_c', type: 'sentence' }
    ],
    stats: {},
    orderMode: 'sequential',
    displayOrder: [],
    currentIndex: 0,
    currentCardId: null,
    completed: false
  };

  const parsed = {
    stats: { card_b: { errors: 1 } },
    orderMode: 'randomAll',
    orderSeed: 13579,
    mode: 'recall',
    displayOrder: [2, 0, 1],
    currentIndex: 2,
    currentCardId: 'card_b',
    completed: false
  };

  const result = applySavedProgressState(state, parsed);

  assert.equal(result.wasCompleted, false);
  assert.deepEqual(state.displayOrder, [2, 0, 1]);
  assert.equal(state.currentIndex, 2);
  assert.equal(state.currentCardId, 'card_b');
  assert.equal(state.orderSeed, 13579);
  assert.equal(state.mode, 'recall');
  assert.deepEqual(state.stats, { card_b: { errors: 1 } });
});

test('applySavedProgressState regenerates displayOrder with the saved seed when saved order is invalid', () => {
  const state = {
    cards: [
      { id: 'card_a', type: 'word' },
      { id: 'card_b', type: 'phrase' },
      { id: 'card_c', type: 'sentence' }
    ],
    stats: {},
    orderMode: 'sequential',
    displayOrder: [],
    currentIndex: 0,
    currentCardId: null,
    completed: false
  };

  const parsed = {
    stats: {},
    orderMode: 'randomAll',
    orderSeed: 24680,
    displayOrder: [2, 2, 1],
    currentIndex: 1,
    currentCardId: 'card_b',
    completed: false
  };

  applySavedProgressState(state, parsed);
  const restoredAgain = {
    cards: [
      { id: 'card_a', type: 'word' },
      { id: 'card_b', type: 'phrase' },
      { id: 'card_c', type: 'sentence' }
    ],
    stats: {},
    orderMode: 'sequential',
    displayOrder: [],
    currentIndex: 0,
    currentCardId: null,
    completed: false
  };
  applySavedProgressState(restoredAgain, parsed);

  assert.equal(state.displayOrder.length, 3);
  assert.equal(new Set(state.displayOrder).size, 3);
  assert.ok(state.displayOrder.includes(0));
  assert.ok(state.displayOrder.includes(1));
  assert.ok(state.displayOrder.includes(2));
  assert.deepEqual(state.displayOrder, restoredAgain.displayOrder);
});

test('pickPreferredProgressSnapshot prefers mid-progress snapshot over newer reset snapshot', () => {
  const olderResume = {
    currentIndex: 57,
    currentCardId: 'card_57',
    completed: false,
    timestamp: 100
  };
  const newerReset = {
    currentIndex: 0,
    currentCardId: 'card_0',
    completed: false,
    timestamp: 200
  };

  assert.deepEqual(
    pickPreferredProgressSnapshot(newerReset, olderResume),
    olderResume
  );
});

test('shouldPersistResumeSnapshot blocks downgrading an existing active snapshot', () => {
  const existing = {
    currentIndex: 57,
    currentCardId: 'card_57',
    completed: false,
    timestamp: 100
  };
  const downgraded = {
    currentIndex: 0,
    currentCardId: 'card_0',
    completed: false,
    timestamp: 200
  };

  assert.equal(shouldPersistResumeSnapshot(existing, downgraded), false);
});
