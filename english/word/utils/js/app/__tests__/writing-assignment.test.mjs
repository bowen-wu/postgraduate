import test from 'node:test';
import assert from 'node:assert/strict';

import { getWritingIdForUnitPath } from '../../application/writing-assignment.js';

test('writing assignment uses rolling mapping for unit files', () => {
  assert.equal(getWritingIdForUnitPath('core/Unit1-1.md'), 'W001');
  assert.equal(getWritingIdForUnitPath('core/Unit10-2.md'), 'W003');
  assert.equal(getWritingIdForUnitPath('core/Unit21-2.md'), 'W005');
});
