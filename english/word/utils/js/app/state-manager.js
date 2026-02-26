/**
 * State Manager Module
 * Handles all state management operations including load, save, and stats
 */

import { CONFIG, STATE } from '../config.js';

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate display order based on order mode
 */
export function generateDisplayOrder(cards, orderMode) {
  const indices = cards.map((_, i) => i);

  switch (orderMode) {
    case 'sequential':
      return indices;

    case 'randomByType':
      // Group cards by type: prefix → word → phrase → sentence
      const byType = { prefix: [], word: [], phrase: [], sentence: [] };
      cards.forEach((card, i) => {
        if (byType[card.type]) {
          byType[card.type].push(i);
        }
      });
      // Shuffle each group and concatenate in order: prefix → word → phrase → sentence
      return [...shuffle(byType.prefix), ...shuffle(byType.word), ...shuffle(byType.phrase), ...shuffle(byType.sentence)];

    case 'randomAll':
      return shuffle(indices);

    default:
      return indices;
  }
}

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
      STATE.orderMode = parsed.orderMode || 'sequential';

      // Generate display order based on order mode
      // For random modes, generate new order (refresh = re-randomize)
      STATE.displayOrder = generateDisplayOrder(STATE.cards, STATE.orderMode);

      // Check if file was completed in previous session
      // If completed, reset to first card for a fresh start
      if (parsed.completed) {
        STATE.currentIndex = 0;
        STATE.currentCardId = null;
        STATE.completed = false;
        // Save the reset state
        saveState();
      } else {
        // Reset to first card for random modes (refresh = re-randomize = start fresh)
        if (STATE.orderMode === 'randomByType' || STATE.orderMode === 'randomAll') {
          STATE.currentIndex = 0;
          STATE.currentCardId = null;
        } else {
          // For sequential mode, try to restore position from card ID
          STATE.currentCardId = parsed.currentCardId || null;
          if (STATE.currentCardId) {
            // Find the card index by ID
            const cardIndex = STATE.cards.findIndex(c => c.id === STATE.currentCardId);
            if (cardIndex !== -1) {
              STATE.currentIndex = STATE.displayOrder.indexOf(cardIndex);
              if (STATE.currentIndex === -1) STATE.currentIndex = 0;
            } else {
              STATE.currentIndex = parsed.currentIndex || 0;
            }
          } else {
            STATE.currentIndex = parsed.currentIndex || 0;
          }
        }

        // Ensure currentIndex is within bounds
        if (STATE.currentIndex >= STATE.displayOrder.length) {
          STATE.currentIndex = 0;
        }
      }
    } else {
      STATE.stats = {};
      STATE.currentIndex = 0;
      STATE.orderMode = 'sequential';
      STATE.currentCardId = null;
      STATE.completed = false;
      STATE.displayOrder = generateDisplayOrder(STATE.cards, 'sequential');
    }
  } catch (e) {
    STATE.stats = {};
    STATE.currentIndex = 0;
    STATE.orderMode = 'sequential';
    STATE.currentCardId = null;
    STATE.completed = false;
    STATE.displayOrder = generateDisplayOrder(STATE.cards, 'sequential');
  }
}

/**
 * Save current state to localStorage
 */
export function saveState() {
  if (!STATE.currentPath) return;

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
    completed: STATE.completed || false,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(key, JSON.stringify(data));
    // Also save the last used path globally
    localStorage.setItem(`${CONFIG.storageKey}_lastPath`, STATE.currentPath);
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
      STATE.orderMode = parsed.orderMode || 'sequential';
      STATE.currentCardId = parsed.currentCardId || null;

      // Generate display order
      STATE.displayOrder = generateDisplayOrder(STATE.cards, STATE.orderMode);

      // Check if file was completed in previous session
      // If completed, reset to first card for a fresh start
      if (parsed.completed) {
        STATE.currentIndex = 0;
        STATE.currentCardId = null;
        STATE.completed = false;
      } else {
        // For random modes, reset to first card
        if (STATE.orderMode === 'randomByType' || STATE.orderMode === 'randomAll') {
          STATE.currentIndex = 0;
          STATE.currentCardId = null;
        } else {
          // For sequential mode, try to restore position
          if (STATE.currentCardId) {
            const cardIndex = STATE.cards.findIndex(c => c.id === STATE.currentCardId);
            if (cardIndex !== -1) {
              STATE.currentIndex = STATE.displayOrder.indexOf(cardIndex);
              if (STATE.currentIndex === -1) STATE.currentIndex = 0;
            } else {
              STATE.currentIndex = parsed.currentIndex || 0;
            }
          } else {
            STATE.currentIndex = parsed.currentIndex || 0;
          }
        }

        // Ensure currentIndex is within bounds
        if (STATE.currentIndex >= STATE.displayOrder.length) {
          STATE.currentIndex = 0;
        }
      }
    } else {
      STATE.stats = {};
      STATE.currentIndex = 0;
      STATE.orderMode = 'sequential';
      STATE.currentCardId = null;
      STATE.completed = false;
      STATE.displayOrder = generateDisplayOrder(STATE.cards, 'sequential');
    }
  } catch (e) {
    STATE.stats = {};
    STATE.currentIndex = 0;
    STATE.orderMode = 'sequential';
    STATE.currentCardId = null;
    STATE.completed = false;
    STATE.displayOrder = generateDisplayOrder(STATE.cards, 'sequential');
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
  STATE.displayOrder = [];
  STATE.currentCardId = null;
  STATE.orderMode = 'sequential';
  STATE.stats = {};
  STATE.currentPath = null;
  STATE.currentFile = null;
  STATE.completed = false;
}

/**
 * Update statistics UI
 * Learning list always shows original order, but highlights current card
 * @param {Object} ui - UI elements object
 */
export function updateStatsUI(ui) {
  // Get current card's actual index in the original array
  const currentCardIndex = STATE.displayOrder[STATE.currentIndex];

  let html = '';
  STATE.cards.forEach((c, idx) => {
    const s = STATE.stats[c.id];
    // Highlight the card that's currently being displayed (not by position, but by card)
    const isActive = idx === currentCardIndex;
    const err = s && s.errors ? `(${s.errors})` : '';
    let icon = '📝';  // 'word' type
    if (c.type === 'phrase') icon = '🔗';
    if (c.type === 'sentence') icon = '💬';
    html += `
      <div class="stat-row ${isActive ? 'active' : ''}" onclick="app.jumpToOriginal(${idx})">
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
 * Set order mode and regenerate display order
 */
export function setOrderMode(mode) {
  STATE.orderMode = mode;
  STATE.displayOrder = generateDisplayOrder(STATE.cards, mode);
  STATE.currentIndex = 0;
  STATE.currentCardId = null;
  saveState();
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

