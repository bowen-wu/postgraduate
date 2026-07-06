import test from 'node:test';
import assert from 'node:assert/strict';

import { __testables } from '../wm-service.js';

test('parseWmSectionsFromMarkdown extracts all WM sections from materials markdown', () => {
  const markdown = `
## WM-0

- alpha

## WM-1

- beta

## WM-20

- gamma
`;

  const parsed = __testables.parseWmSectionsFromMarkdown(markdown);
  const ids = __testables.getOrderedWmIds(parsed);

  assert.deepEqual(ids, ['WM-0', 'WM-1', 'WM-20']);
});

test('resolveWmIdForUnitPath maps units by actual WM count instead of a hardcoded pool size', () => {
  const wmIds = Array.from({ length: 21 }, (_, i) => `WM-${i}`);

  assert.equal(__testables.resolveWmIdForUnitPath('core/Unit1-1.md', wmIds), 'WM-0');
  assert.equal(__testables.resolveWmIdForUnitPath('core/Unit7-1.md', wmIds), 'WM-19');
  assert.equal(__testables.resolveWmIdForUnitPath('core/Unit7-2.md', wmIds), 'WM-20');
  assert.equal(__testables.resolveWmIdForUnitPath('core/Unit7-3.md', wmIds), 'WM-0');
});

test('buildWmBlockCard keeps one WM section as a single card for one unit', () => {
  const wm = {
    id: 'WM-19',
    items: [
      { type: 'meta', cn: 'WM-19' },
      { type: 'sentence-line', cleanText: 'line 1', en: 'line 1', cn: '', audioText: 'line 1' },
      { type: 'sentence-line', cleanText: 'line 2', en: 'line 2', cn: '', audioText: 'line 2' }
    ]
  };

  const card = __testables.buildWmBlockCard(wm, 'WM-19', 'core/Unit7-1.md');

  assert.equal(card.type, 'block');
  assert.equal(card.word, 'WM-19');
  assert.equal(card.items.length, 3);
  assert.equal(card.items[1].en, 'line 1');
  assert.equal(card.items[2].en, 'line 2');
});
