import test from 'node:test';
import assert from 'node:assert/strict';

import { createTranslationUseCases } from '../../application/translation-use-cases.js';

test('translatePhrase writes translation and triggers render pipeline', async () => {
  const card = { type: 'phrase', word: 'take off', items: [{ en: 'take off', cn: '' }] };
  const calls = { save: 0, render: 0, toast: 0 };
  const useCases = createTranslationUseCases({
    stateManager: {
      getCurrentCard: () => card,
      saveState: () => { calls.save += 1; }
    },
    uiRenderer: {
      showToast: () => { calls.toast += 1; },
      renderNextAction: () => {}
    },
    getUi: () => ({}),
    render: () => { calls.render += 1; },
    translateText: async () => ({ translation: '起飞', sourceName: 'Mock' }),
    setButtonLoading: () => {}
  });

  await useCases.translatePhrase();

  assert.equal(card.items[0].cn, '起飞');
  assert.equal(calls.save, 1);
  assert.equal(calls.render, 1);
});

test('translateSentence reveals translation through injected ui port', async () => {
  const card = { type: 'sentence', word: 'hello', displayWord: 'Hello', items: [{ en: 'Hello', cn: '' }] };
  const calls = { save: 0, render: 0, reveal: 0 };
  const useCases = createTranslationUseCases({
    stateManager: {
      getCurrentCard: () => card,
      saveState: () => { calls.save += 1; }
    },
    uiRenderer: {
      showToast: () => {},
      renderNextAction: () => {}
    },
    getUi: () => ({}),
    render: () => { calls.render += 1; },
    translateText: async () => ({ translation: '你好', sourceName: 'Mock' }),
    setButtonLoading: () => {},
    revealSentenceTranslation: () => { calls.reveal += 1; }
  });

  await useCases.translateSentence();

  assert.equal(card.items[0].cn, '你好');
  assert.equal(calls.save, 1);
  assert.equal(calls.render, 1);
  assert.equal(calls.reveal, 1);
});
