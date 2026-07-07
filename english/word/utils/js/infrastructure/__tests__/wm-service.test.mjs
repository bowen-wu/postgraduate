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

test('splitSentenceLineToCards keeps WM content split into sentence cards', () => {
  const first = __testables.splitSentenceLineToCards(
    { type: 'sentence-line', cleanText: 'line 1 中文1', en: 'line 1', cn: '中文1', audioText: 'line 1' },
    'WM-19',
    'core/Unit7-1.md',
    0
  );
  const second = __testables.splitSentenceLineToCards(
    { type: 'sentence-line', cleanText: 'line 2', en: 'line 2', cn: '', audioText: 'line 2' },
    'WM-19',
    'core/Unit7-1.md',
    1
  );

  assert.equal(first.type, 'sentence');
  assert.equal(first.word, 'line 1');
  assert.deepEqual(first.items, [{ type: 'sentence', en: 'line 1', cn: '中文1' }]);
  assert.equal(second.type, 'sentence');
  assert.equal(second.word, 'line 2');
  assert.deepEqual(second.items, [{ type: 'sentence', en: 'line 2', cn: '' }]);
});
