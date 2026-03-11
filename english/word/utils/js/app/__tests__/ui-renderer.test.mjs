import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldAutoPlayCard } from '../ui-renderer.js';

test('should autoplay word card in input mode when autoPlay is enabled', () => {
  const card = { type: 'word', word: 'hello' };
  const state = { autoPlay: true, mode: 'input' };
  assert.equal(shouldAutoPlayCard(card, state), true);
});

test('should autoplay word card in recall mode when autoPlay is enabled', () => {
  const card = { type: 'word', word: 'hello' };
  const state = { autoPlay: true, mode: 'recall' };
  assert.equal(shouldAutoPlayCard(card, state), true);
});

test('should not autoplay when autoPlay is disabled', () => {
  const card = { type: 'word', word: 'hello' };
  const state = { autoPlay: false, mode: 'recall' };
  assert.equal(shouldAutoPlayCard(card, state), false);
});

test('should not autoplay non-word cards', () => {
  const card = { type: 'phrase', word: 'on time' };
  const state = { autoPlay: true, mode: 'recall' };
  assert.equal(shouldAutoPlayCard(card, state), false);
});
