import { generateDisplayOrder } from './ordering.js';

export function applyDefaultProgressState(state) {
  state.stats = {};
  state.currentIndex = 0;
  state.orderMode = 'sequential';
  state.currentCardId = null;
  state.completed = false;
  state.displayOrder = generateDisplayOrder(state.cards, 'sequential');
}

function resolveSequentialIndex(state, parsed) {
  state.currentCardId = parsed.currentCardId || null;
  if (!state.currentCardId) {
    state.currentIndex = parsed.currentIndex || 0;
    return;
  }

  const cardIndex = state.cards.findIndex((c) => c.id === state.currentCardId);
  if (cardIndex === -1) {
    state.currentIndex = parsed.currentIndex || 0;
    return;
  }

  state.currentIndex = state.displayOrder.indexOf(cardIndex);
  if (state.currentIndex === -1) {
    state.currentIndex = 0;
  }
}

function normalizeCurrentIndex(state) {
  if (state.currentIndex >= state.displayOrder.length) {
    state.currentIndex = 0;
  }
}

export function applySavedProgressState(state, parsed) {
  state.stats = parsed.stats || {};
  state.orderMode = parsed.orderMode || 'sequential';
  state.displayOrder = generateDisplayOrder(state.cards, state.orderMode);

  if (parsed.completed) {
    state.currentIndex = 0;
    state.currentCardId = null;
    state.completed = false;
    return { wasCompleted: true };
  }

  if (state.orderMode === 'randomByType' || state.orderMode === 'randomAll') {
    state.currentIndex = 0;
    state.currentCardId = null;
  } else {
    resolveSequentialIndex(state, parsed);
  }

  normalizeCurrentIndex(state);
  return { wasCompleted: false };
}
