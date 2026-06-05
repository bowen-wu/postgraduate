import { generateDisplayOrder } from './ordering.js';

export function applyDefaultProgressState(state) {
  state.stats = {};
  state.currentIndex = 0;
  state.orderMode = 'sequential';
  state.mode = 'input';
  state.currentCardId = null;
  state.completed = false;
  state.displayOrder = generateDisplayOrder(state.cards, 'sequential');
}

function safeInteger(value, fallback = 0) {
  return Number.isInteger(value) ? value : fallback;
}

function snapshotProgressScore(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return Number.NEGATIVE_INFINITY;
  }

  const completedPenalty = snapshot.completed ? -1 : 0;
  const currentIndex = safeInteger(snapshot.currentIndex, 0);
  const hasCardIdBonus = snapshot.currentCardId ? 1 : 0;
  const timestamp = safeInteger(snapshot.timestamp, 0);

  return (completedPenalty * 1_000_000_000_000) +
    (currentIndex * 1_000_000) +
    (hasCardIdBonus * 10_000) +
    timestamp;
}

export function pickPreferredProgressSnapshot(...candidates) {
  const validCandidates = candidates.filter((snapshot) => snapshot && typeof snapshot === 'object');
  if (validCandidates.length === 0) return null;

  return validCandidates.reduce((best, candidate) => {
    if (!best) return candidate;
    return snapshotProgressScore(candidate) > snapshotProgressScore(best)
      ? candidate
      : best;
  }, null);
}

export function shouldPersistResumeSnapshot(existingSnapshot, nextSnapshot) {
  if (!nextSnapshot || typeof nextSnapshot !== 'object') return false;
  if (nextSnapshot.completed) return false;
  if (!existingSnapshot || typeof existingSnapshot !== 'object') return true;

  return snapshotProgressScore(nextSnapshot) >= snapshotProgressScore(existingSnapshot);
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

function isValidSavedDisplayOrder(state, savedDisplayOrder) {
  if (!Array.isArray(savedDisplayOrder)) return false;
  if (savedDisplayOrder.length !== state.cards.length) return false;

  const normalized = savedDisplayOrder.map((value) => Number(value));
  if (normalized.some((value) => !Number.isInteger(value) || value < 0 || value >= state.cards.length)) {
    return false;
  }

  return new Set(normalized).size === state.cards.length;
}

function resolveRandomIndex(state, parsed) {
  state.currentCardId = parsed.currentCardId || null;
  if (!state.currentCardId) {
    state.currentIndex = Number.isInteger(parsed.currentIndex) ? parsed.currentIndex : 0;
    return;
  }

  const cardIndex = state.cards.findIndex((c) => c.id === state.currentCardId);
  if (cardIndex === -1) {
    state.currentIndex = Number.isInteger(parsed.currentIndex) ? parsed.currentIndex : 0;
    return;
  }

  const restoredIndex = state.displayOrder.indexOf(cardIndex);
  state.currentIndex = restoredIndex === -1
    ? (Number.isInteger(parsed.currentIndex) ? parsed.currentIndex : 0)
    : restoredIndex;
}

export function applySavedProgressState(state, parsed) {
  state.stats = parsed.stats || {};
  state.orderMode = parsed.orderMode || 'sequential';
  state.mode = parsed.mode || state.mode || 'input';
  state.displayOrder = isValidSavedDisplayOrder(state, parsed.displayOrder)
    ? parsed.displayOrder.map((value) => Number(value))
    : generateDisplayOrder(state.cards, state.orderMode);

  if (parsed.completed) {
    state.currentIndex = 0;
    state.currentCardId = null;
    state.completed = false;
    return { wasCompleted: true };
  }

  if (state.orderMode === 'randomByType' || state.orderMode === 'randomAll') {
    resolveRandomIndex(state, parsed);
  } else {
    resolveSequentialIndex(state, parsed);
  }

  normalizeCurrentIndex(state);
  return { wasCompleted: false };
}
