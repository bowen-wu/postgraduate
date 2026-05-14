import test from 'node:test';
import assert from 'node:assert/strict';

import { applySavedProgressState } from '../state/persistence.js';

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
  assert.deepEqual(state.stats, { card_b: { errors: 1 } });
});

test('applySavedProgressState regenerates displayOrder when saved order is invalid', () => {
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
    displayOrder: [2, 2, 1],
    currentIndex: 1,
    currentCardId: 'card_b',
    completed: false
  };

  applySavedProgressState(state, parsed);

  assert.equal(state.displayOrder.length, 3);
  assert.equal(new Set(state.displayOrder).size, 3);
  assert.ok(state.displayOrder.includes(0));
  assert.ok(state.displayOrder.includes(1));
  assert.ok(state.displayOrder.includes(2));
});
