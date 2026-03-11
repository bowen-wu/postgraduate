import test from 'node:test';
import assert from 'node:assert/strict';

import { withRecallBlur } from '../renderers/relations-renderer.js';

test('withRecallBlur keeps class unchanged in input mode', () => {
  assert.equal(withRecallBlur('synonym-main', 'input'), 'synonym-main');
});

test('withRecallBlur adds blur-target in recall mode', () => {
  assert.equal(withRecallBlur('synonym-main', 'recall'), 'synonym-main blur-target');
});

test('withRecallBlur does not duplicate blur-target class', () => {
  assert.equal(withRecallBlur('synonym-main blur-target', 'recall'), 'synonym-main blur-target');
});
