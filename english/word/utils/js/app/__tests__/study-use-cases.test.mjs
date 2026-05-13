import test from 'node:test';
import assert from 'node:assert/strict';

import { createStudyUseCases } from '../../application/study-use-cases.js';

function createDeps(initialState) {
  const state = {
    currentIndex: 0,
    displayOrder: [],
    stats: {},
    ...initialState
  };

  const calls = {
    saveState: 0,
    updateStatsUI: 0,
    render: 0,
    toasts: [],
    completion: 0,
    stopAudioPlayback: 0
  };

  const stateManager = {
    getCurrentCard() {
      const idx = state.displayOrder[state.currentIndex];
      return state.cards?.[idx] || null;
    },
    recordCardStudied() {},
    saveState() { calls.saveState += 1; }
  };

  const uiRenderer = {
    revealAll() {},
    renderNextAction() {},
    renderConfirmationActions() {},
    showSentenceTranslation() {},
    updateStatsUI() { calls.updateStatsUI += 1; },
    showToast(_ui, msg) { calls.toasts.push(msg); },
    showCompletionScreen() { calls.completion += 1; }
  };

  const useCases = createStudyUseCases({
    state,
    stateManager,
    uiRenderer,
    getUi: () => ({}),
    render: () => { calls.render += 1; },
    getBadgesElement: () => null,
    stopAudioPlayback: () => { calls.stopAudioPlayback += 1; }
  });

  return { state, calls, useCases };
}

test('nextCard increments index and renders', () => {
  const { state, calls, useCases } = createDeps({
    currentIndex: 0,
    displayOrder: [0, 1],
    cards: [{ id: 'a' }, { id: 'b' }]
  });

  const changed = useCases.nextCard();

  assert.equal(changed, true);
  assert.equal(state.currentIndex, 1);
  assert.equal(calls.saveState, 1);
  assert.equal(calls.render, 1);
  assert.equal(calls.updateStatsUI, 1);
  assert.equal(calls.stopAudioPlayback, 1);
});

test('nextCard shows completion at end', () => {
  const { state, calls, useCases } = createDeps({
    currentIndex: 1,
    displayOrder: [0, 1],
    cards: [{ id: 'a' }, { id: 'b' }]
  });

  const changed = useCases.nextCard();

  assert.equal(changed, false);
  assert.equal(state.currentIndex, 1);
  assert.equal(calls.completion, 1);
  assert.equal(calls.stopAudioPlayback, 0);
});

test('handleSentenceRecall true reveals translation and enters confirmation state', () => {
  let showSentenceTranslationCalls = 0;
  let renderConfirmationActionsCalls = 0;
  const { state, calls } = createDeps({
    currentIndex: 0,
    displayOrder: [0, 1],
    cards: [{ id: 'a' }, { id: 'b' }]
  });

  const useCases = createStudyUseCases({
    state,
    stateManager: {
      getCurrentCard() {
        const idx = state.displayOrder[state.currentIndex];
        return state.cards?.[idx] || null;
      },
      recordCardStudied() {},
      saveState() { calls.saveState += 1; }
    },
    uiRenderer: {
      revealAll() {},
      renderNextAction() {},
      renderConfirmationActions() { renderConfirmationActionsCalls += 1; },
      showSentenceTranslation() { showSentenceTranslationCalls += 1; },
      updateStatsUI() { calls.updateStatsUI += 1; },
      showToast(_ui, msg) { calls.toasts.push(msg); },
      showCompletionScreen() { calls.completion += 1; }
    },
    getUi: () => ({}),
    render: () => { calls.render += 1; },
    getBadgesElement: () => null,
    stopAudioPlayback: () => { calls.stopAudioPlayback += 1; }
  });

  useCases.handleSentenceRecall(true);

  assert.equal(state.currentIndex, 0);
  assert.equal(showSentenceTranslationCalls, 1);
  assert.equal(renderConfirmationActionsCalls, 1);
});

test('handleSentenceRecall false records error and stays on current card', () => {
  const nextActionCalls = [];
  const { state, calls } = createDeps({
    currentIndex: 0,
    displayOrder: [0, 1],
    cards: [{ id: 'a' }, { id: 'b' }]
  });

  const useCases = createStudyUseCases({
    state,
    stateManager: {
      getCurrentCard() {
        const idx = state.displayOrder[state.currentIndex];
        return state.cards?.[idx] || null;
      },
      recordCardStudied() {},
      saveState() { calls.saveState += 1; }
    },
    uiRenderer: {
      revealAll() {},
      renderNextAction() { nextActionCalls.push('next'); },
      renderConfirmationActions() {},
      showSentenceTranslation() {},
      updateStatsUI() { calls.updateStatsUI += 1; },
      showToast(_ui, msg) { calls.toasts.push(msg); },
      showCompletionScreen() { calls.completion += 1; }
    },
    getUi: () => ({}),
    render: () => { calls.render += 1; },
    getBadgesElement: () => null,
    stopAudioPlayback: () => { calls.stopAudioPlayback += 1; }
  });

  useCases.handleSentenceRecall(false);

  assert.equal(state.currentIndex, 0);
  assert.equal(state.stats.a.errors, 1);
  assert.deepEqual(calls.toasts, ['已记录不理解']);
  assert.deepEqual(nextActionCalls, ['next']);
});

test('handleRecall false records error and shows toast', () => {
  const { state, calls, useCases } = createDeps({
    currentIndex: 0,
    displayOrder: [0],
    cards: [{ id: 'a' }]
  });

  useCases.handleRecall(false);

  assert.equal(state.stats.a.errors, 1);
  assert.deepEqual(calls.toasts, ['已记录不记得']);
});
