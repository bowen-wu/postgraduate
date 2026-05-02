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
  assert.match(result['002'].sentenceRaw, /appropriate/);
});

test('extractExtraCardsFromRawSentenceBlock generates word and phrase cards using parser rules', () => {
  const raw = `
- If you are part of the group which you are addressing, you will be in a position to know the experiences and problems.
    - appropriate [əˈproʊprieɪt]
        - adj. 合适的
    - be in a position to do sth. 有条件/有能力做某事
`;

  const cards = __testables.extractExtraCardsFromRawSentenceBlock(raw, '002');
  const words = cards.filter((card) => card.type === 'word').map((card) => card.word);
  const phrases = cards.filter((card) => card.type === 'phrase').map((card) => card.word);

  assert.equal(words.includes('appropriate'), true);
  assert.equal(phrases.includes('be in a position to do sth.'), true);
});
