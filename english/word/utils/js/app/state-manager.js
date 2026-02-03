/**
 * State Manager Module
 * Handles all state management operations including load, save, and stats
 */

import { CONFIG, STATE } from '../config.js';

/**
 * Get storage key for a specific file
 */
export function getStorageKey(path) {
  return `${CONFIG.storageKey}_${path}`;
}

/**
 * Load statistics for a specific file
 */
export function loadStatsForFile(path) {
  const key = getStorageKey(path);
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only load stats, not cards (cards are loaded from file)
      STATE.stats = parsed.stats || {};
      STATE.currentIndex = parsed.currentIndex || 0;
      // If file was completed, reset to beginning for a fresh start
      if (STATE.cards.length > 0 && STATE.currentIndex >= STATE.cards.length - 1) {
        STATE.currentIndex = 0;
      }
    } else {
      STATE.stats = {};
      STATE.currentIndex = 0;
    }
  } catch (e) {
    console.warn('Failed to load stats:', e);
    STATE.stats = {};
    STATE.currentIndex = 0;
  }
}

/**
 * Save current state to localStorage
 */
export function saveState() {
  if (!STATE.currentPath) return;

  const key = getStorageKey(STATE.currentPath);
  const data = {
    stats: STATE.stats,
    currentIndex: STATE.currentIndex,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(key, JSON.stringify(data));
    // Also save the last used path globally
    localStorage.setItem(`${CONFIG.storageKey}_lastPath`, STATE.currentPath);
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
}

/**
 * Load state from localStorage
 */
export function loadState() {
  try {
    // First, try to load the last used path
    if (!STATE.currentPath) {
      const lastPath = localStorage.getItem(`${CONFIG.storageKey}_lastPath`);
      if (lastPath) {
        STATE.currentPath = lastPath;
      }
    }

    if (!STATE.currentPath) return;

    // Now load stats for the current path
    const key = getStorageKey(STATE.currentPath);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      STATE.stats = parsed.stats || {};
      STATE.currentIndex = parsed.currentIndex || 0;
    } else {
      STATE.stats = {};
      STATE.currentIndex = 0;
    }
  } catch (e) {
    console.warn('Failed to load state:', e);
    STATE.stats = {};
    STATE.currentIndex = 0;
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
 * Reset all data and clear localStorage
 */
export function resetData() {
  // Clear all VocabMaster related data from localStorage
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(CONFIG.storageKey) || key.startsWith(CONFIG.cacheKey)) {
      localStorage.removeItem(key);
    }
  });

  // Reset state
  STATE.cards = [];
  STATE.currentIndex = 0;
  STATE.stats = {};
  STATE.currentPath = null;
  STATE.currentFile = null;
}

/**
 * Update statistics UI
 * @param {Object} ui - UI elements object
 */
export function updateStatsUI(ui) {
  let html = '';
  STATE.cards.forEach((c, idx) => {
    const s = STATE.stats[c.id];
    const isActive = idx === STATE.currentIndex;
    const err = s && s.errors ? `(${s.errors})` : '';
    let icon = '📝';  // 'word' type
    if (c.type === 'phrase') icon = '🔗';
    if (c.type === 'sentence') icon = '💬';
    html += `
      <div class="stat-row ${isActive ? 'active' : ''}" onclick="app.jumpTo(${idx})">
        <span class="stat-word"><span class="tag-pill">${icon}</span>${c.word.substring(0, 18)}${c.word.length > 18 ? '...' : ''}</span>
        <span class="stat-val" style="color:${s && s.errors ? 'var(--danger)' : 'inherit'}">${err}</span>
      </div>
    `;
  });
  ui.statsList.innerHTML = html;
  const active = ui.statsList.querySelector('.active');
  if (active) active.scrollIntoView({block: 'center'});
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
  if (ms < 1000) return '< 1 分钟';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours} 小时 ${minutes % 60} 分钟`;
  } else if (minutes > 0) {
    return `${minutes} 分钟`;
  } else {
    return `${seconds} 秒`;
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

