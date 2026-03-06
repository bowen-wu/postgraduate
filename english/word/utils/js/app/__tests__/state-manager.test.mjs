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
