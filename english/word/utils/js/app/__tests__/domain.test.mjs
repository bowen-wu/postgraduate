import test from 'node:test';
import assert from 'node:assert/strict';

import { reduceSession } from '../../domain/session-reducer.js';
import { getCurrentCardFromState, getLastDisplayIndex } from '../../domain/selectors.js';

test('reduceSession sets mode', () => {
  const state = { mode: 'input', currentIndex: 0, autoPlay: false };
  const next = reduceSession(state, { type: 'SET_MODE', payload: 'recall' });
  assert.equal(next.mode, 'recall');
  assert.equal(state.mode, 'input');
});

test('reduceSession toggles autoplay', () => {
  const state = { mode: 'input', currentIndex: 0, autoPlay: false };
  const next = reduceSession(state, { type: 'TOGGLE_AUTOPLAY' });
  assert.equal(next.autoPlay, true);
});

test('selectors read last index and current card by display order', () => {
  const state = {
    cards: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    displayOrder: [2, 0, 1],
    currentIndex: 1
  };
  assert.equal(getLastDisplayIndex(state), 2);
  assert.deepEqual(getCurrentCardFromState(state), { id: 'a' });
});
