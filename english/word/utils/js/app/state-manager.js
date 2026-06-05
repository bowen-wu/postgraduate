/**
 * State Manager Module
 * Handles all state management operations including load, save, and stats
 */

import { CONFIG, STATE } from '../config.js';
import { StateRepo } from '../infrastructure/state-repo.js';
import { generateDisplayOrder } from './state/ordering.js';
import {
  applyDefaultProgressState,
  applySavedProgressState,
  pickPreferredProgressSnapshot,
  shouldPersistResumeSnapshot
} from './state/persistence.js';

export { generateDisplayOrder };

/**
 * Get storage key for a specific file
 */
export function getStorageKey(path) {
  return `${CONFIG.storageKey}_${path}`;
}

export function getResumeStorageKey(path) {
  return `${getStorageKey(path)}__resume`;
}

function parseStoredSnapshot(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function getStoredProgressSnapshot(path) {
  const primary = parseStoredSnapshot(StateRepo.getByKey(getStorageKey(path)));
  const resume = parseStoredSnapshot(StateRepo.getByKey(getResumeStorageKey(path)));
  return pickPreferredProgressSnapshot(primary, resume);
}

export function clearResumeSnapshot(path) {
  if (!path) return;
  StateRepo.removeByKey(getResumeStorageKey(path));
}

/**
 * Load statistics for a specific file
 */
export function loadStatsForFile(path) {
  try {
    const saved = getStoredProgressSnapshot(path);
    if (!saved) {
      applyDefaultProgressState(STATE);
      return;
    }

    const result = applySavedProgressState(STATE, saved);
    if (result.wasCompleted) saveState();
  } catch (e) {
    applyDefaultProgressState(STATE);
  }
}

/**
 * Save current state to storage repo
 */
export function saveState(options = {}) {
  if (!STATE.currentPath) return;
  const { allowResumeDowngrade = false } = options;

  // Get current card ID for progress tracking
  const currentCard = getCurrentCard();
  if (currentCard) {
    STATE.currentCardId = currentCard.id;
  }

  const key = getStorageKey(STATE.currentPath);
  const data = {
    stats: STATE.stats,
    currentIndex: STATE.currentIndex,
    currentCardId: STATE.currentCardId,
    orderMode: STATE.orderMode,
    mode: STATE.mode,
    displayOrder: STATE.displayOrder,
    completed: STATE.completed || false,
    timestamp: Date.now()
  };

  try {
    StateRepo.setJsonByKey(key, data);
    const resumeKey = getResumeStorageKey(STATE.currentPath);
    const existingResume = parseStoredSnapshot(StateRepo.getByKey(resumeKey));
    if (allowResumeDowngrade || shouldPersistResumeSnapshot(existingResume, data)) {
      StateRepo.setJsonByKey(resumeKey, data);
    }
    // Also save the last used path globally
    StateRepo.setByKey(`${CONFIG.storageKey}_lastPath`, STATE.currentPath);
  } catch (e) {
  }
}

/**
 * Get current card based on display order
 */
export function getCurrentCard() {
  if (STATE.cards.length === 0 || STATE.displayOrder.length === 0) return null;
  const cardIndex = STATE.displayOrder[STATE.currentIndex];
  return STATE.cards[cardIndex];
}

/**
 * Load state from storage repo
 */
export function loadState() {
  try {
    // First, try to load the last used path
    if (!STATE.currentPath) {
      const lastPath = StateRepo.getByKey(`${CONFIG.storageKey}_lastPath`);
      if (lastPath) {
        STATE.currentPath = lastPath;
      }
    }

    if (!STATE.currentPath) return;

    const saved = getStoredProgressSnapshot(STATE.currentPath);
    if (!saved) {
      applyDefaultProgressState(STATE);
      return;
    }

    applySavedProgressState(STATE, saved);
  } catch (e) {
    applyDefaultProgressState(STATE);
  }
}

/**
 * Get current folder path from STATE.currentPath
 */
export function getCurrentFolderPath() {
  if (!STATE.currentPath) return null;

  const parts = STATE.currentPath.split('/');
  parts.pop(); // Remove filename
  return parts.join('/');
}

/**
 * Reset all data and clear storage repo
 */
export function resetData() {
  // Clear all VocabMaster related data from storage repo
  const keys = StateRepo.keys();
  keys.forEach(key => {
    if (key.startsWith(CONFIG.storageKey) || key.startsWith(CONFIG.cacheKey)) {
      StateRepo.removeByKey(key);
    }
  });

  // Reset state
  STATE.cards = [];
  STATE.currentIndex = 0;
  STATE.displayOrder = [];
  STATE.currentCardId = null;
  STATE.orderMode = 'sequential';
  STATE.stats = {};
  STATE.currentPath = null;
  STATE.currentFile = null;
  STATE.completed = false;
}

/**
 * Set order mode and regenerate display order
 */
export function setOrderMode(mode) {
  STATE.orderMode = mode;
  STATE.displayOrder = generateDisplayOrder(STATE.cards, mode);
  STATE.currentIndex = 0;
  STATE.currentCardId = null;
  clearResumeSnapshot(STATE.currentPath);
  saveState({ allowResumeDowngrade: true });
}

/**
 * Start a new study session
 */
export function startSession() {
  STATE.sessionStartTime = Date.now();
  STATE.sessionEndTime = null;
  STATE.sessionCardsStudied = new Set();
}

/**
 * Record that a card was studied in this session
 */
export function recordCardStudied(cardId) {
  if (STATE.sessionCardsStudied) {
    STATE.sessionCardsStudied.add(cardId);
  }
}

/**
 * End the current study session
 */
export function endSession() {
  STATE.sessionEndTime = Date.now();
}

/**
 * Calculate session duration in milliseconds
 */
export function getSessionDuration() {
  if (!STATE.sessionStartTime) return 0;
  const endTime = STATE.sessionEndTime || Date.now();
  return endTime - STATE.sessionStartTime;
}

/**
 * Format duration as human-readable string
 */
export function formatDuration(ms) {
  if (ms < 1000) return '< 1 min';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes} min`;
  } else {
    return `${seconds} sec`;
  }
}

/**
 * Get session statistics for completion screen
 */
export function getSessionStats() {
  const totalCards = STATE.cards.length;
  const totalErrors = Object.values(STATE.stats).reduce((sum, stat) => sum + (stat.errors || 0), 0);
  const accuracy = totalCards > 0 ? Math.round(((totalCards - Math.min(totalErrors, totalCards)) / totalCards) * 100) : 100;

  // Count cards with errors (need review)
  const cardsNeedingReview = Object.values(STATE.stats).filter(s => s.errors > 0).length;

  // Count cards without errors (mastered)
  const cardsMastered = totalCards - cardsNeedingReview;

  // Cards studied in this session
  const cardsStudied = STATE.sessionCardsStudied ? STATE.sessionCardsStudied.size : totalCards;

  // Duration
  const duration = getSessionDuration();
  const avgTimePerCard = cardsStudied > 0 ? duration / cardsStudied : 0;

  return {
    totalCards,
    totalErrors,
    accuracy,
    cardsNeedingReview,
    cardsMastered,
    cardsStudied,
    duration,
    avgTimePerCard,
    startTime: STATE.sessionStartTime,
    endTime: STATE.sessionEndTime
  };
}
