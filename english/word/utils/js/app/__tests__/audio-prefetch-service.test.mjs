import test from 'node:test';
import assert from 'node:assert/strict';

import { extractCurrentCardRelationAudioTexts } from '../../infrastructure/audio-prefetch-service.js';

test('extractCurrentCardRelationAudioTexts collects all current card relation words', () => {
  const card = {
    type: 'word',
    word: 'initiative',
    synonyms: [
      { word: 'plan' },
      {
        word: 'willingness',
        pos: 'n.',
        cn: '愿意; 乐意'
      }
    ],
    antonyms: [
      { word: 'passivity' }
    ],
    similars: [
      {
        word: 'considerate',
        synonyms: [{ word: 'kind' }]
      }
    ]
  };

  assert.deepEqual(
    extractCurrentCardRelationAudioTexts(card),
    ['plan', 'willingness', 'passivity', 'considerate', 'kind']
  );
});

test('extractCurrentCardRelationAudioTexts ignores non-study cards and deduplicates texts', () => {
  const card = {
    type: 'sentence',
    synonyms: [{ word: 'plan' }]
  };

  assert.deepEqual(extractCurrentCardRelationAudioTexts(card), []);

  const wordCard = {
    type: 'word',
    synonyms: [
      { word: 'plan' },
      { word: 'plan' }
    ],
    similars: [
      { word: 'plan' },
      { word: 'strategy' }
    ]
  };

  assert.deepEqual(
    extractCurrentCardRelationAudioTexts(wordCard),
    ['plan', 'strategy']
  );
});
