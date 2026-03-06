import test from 'node:test';
import assert from 'node:assert/strict';

import { buildStatsRows, renderStatsRows } from '../presenters/stats-list-presenter.js';

test('buildStatsRows marks active row and maps icons', () => {
  const rows = buildStatsRows({
    cards: [
      { id: '1', word: 'alpha', type: 'word' },
      { id: '2', word: 'beta', type: 'phrase' },
      { id: '3', word: 'gamma', type: 'sentence' }
    ],
    displayOrder: [2, 0, 1],
    currentIndex: 1,
    stats: { '1': { errors: 2 } }
  });

  assert.equal(rows.length, 3);
  assert.equal(rows[0].isActive, true);
  assert.equal(rows[0].errorCount, 2);
  assert.equal(rows[1].icon, '🔗');
  assert.equal(rows[2].icon, '💬');
});

test('renderStatsRows outputs stat rows with jump action', () => {
  const html = renderStatsRows([
    { index: 0, isActive: true, errorCount: 1, icon: '📝', word: 'alpha' }
  ]);
  assert.match(html, /data-action="jump-to-original"/);
  assert.match(html, /\(1\)/);
});
