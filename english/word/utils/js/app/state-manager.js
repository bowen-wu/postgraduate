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
