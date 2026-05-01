import test from 'node:test';
import assert from 'node:assert/strict';

import { generateDisplayOrder } from '../state-manager.js';

test('generateDisplayOrder sequential keeps original order', () => {
  const cards = [{ type: 'word' }, { type: 'phrase' }, { type: 'sentence' }];
  const order = generateDisplayOrder(cards, 'sequential');
  assert.deepEqual(order, [0, 1, 2]);
});

test('generateDisplayOrder randomByType keeps type group ordering', () => {
  const cards = [
    { type: 'sentence' },
    { type: 'word' },
    { type: 'prefix' },
    { type: 'phrase' },
    { type: 'word' },
    { type: 'sentence' }
  ];

  const order = generateDisplayOrder(cards, 'randomByType');
  const orderedTypes = order.map((idx) => cards[idx].type);
  assert.deepEqual(orderedTypes, ['prefix', 'word', 'word', 'phrase', 'sentence', 'sentence']);
});

test('generateDisplayOrder randomAll keeps all indices', () => {
  const cards = [{ type: 'word' }, { type: 'phrase' }, { type: 'sentence' }, { type: 'prefix' }];
  const order = generateDisplayOrder(cards, 'randomAll');
  const sortedOrder = [...order].sort((a, b) => a - b);
  assert.deepEqual(sortedOrder, [0, 1, 2, 3]);
  assert.equal(order.length, cards.length);
});

test('generateDisplayOrder keeps writing cards at the end in all modes', () => {
  const cards = [
    { id: 'card_0', type: 'word' },
    { id: 'writing_W001', type: 'sentence' },
    { id: 'card_2', type: 'phrase' },
    { id: 'writing_W041', type: 'sentence' }
  ];

  const modes = ['sequential', 'randomByType', 'randomAll'];
  for (const mode of modes) {
    const order = generateDisplayOrder(cards, mode);
    const tail = order.slice(-2);
    assert.deepEqual(tail, [1, 3], `writing cards should stay at end in mode ${mode}`);
  }
});
