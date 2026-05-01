import test from 'node:test';
import assert from 'node:assert/strict';

import { parseWritingExamplesFromMarkdown } from '../../infrastructure/writing-service.js';

test('parseWritingExamplesFromMarkdown extracts full example and translation blocks', () => {
  const source = `## 001
### Example
Line EN 1<br>
Line EN 2<br>
### 译文
行CN1<br>
行CN2<br>
## 002
### Example
Other EN
### 译文
Other CN
`;

  const parsed = parseWritingExamplesFromMarkdown(source, new Set(['001']));
  assert.ok(parsed.W001);
  assert.match(parsed.W001.en, /Line EN 1/);
  assert.match(parsed.W001.en, /Line EN 2/);
  assert.match(parsed.W001.cn, /行CN1/);
  assert.match(parsed.W001.cn, /行CN2/);
  assert.equal(parsed.W002, undefined);
});
