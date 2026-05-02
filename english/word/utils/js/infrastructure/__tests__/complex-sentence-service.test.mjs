import test from 'node:test';
import assert from 'node:assert/strict';
import { __testables } from '../complex-sentence-service.js';

test('parseDailySentenceMarkdown extracts list-style original sentence without glossary bullets', () => {
  const markdown = `
## 002

### 思考

本句断开为几件事？如何断开？

### 原句

- If you are part of the group which you are addressing, you will be in a position to know the experiences and problems
  which are common to all of you and it'll be appropriate for you to make a passing remark about the inedible canteen
  food or the chairman's notorious bad taste in ties.
    - appropriate [əˈproʊprieɪt]
        - adj. 合适的
`;

  const result = __testables.parseDailySentenceMarkdown(markdown);
  assert.equal(
    result['002'].sentence,
    "If you are part of the group which you are addressing, you will be in a position to know the experiences and problems which are common to all of you and it'll be appropriate for you to make a passing remark about the inedible canteen food or the chairman's notorious bad taste in ties."
  );
});
