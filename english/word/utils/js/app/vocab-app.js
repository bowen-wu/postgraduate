/**
 * Main VocabApp Class
 * Coordinates all modules and initializes the application
 */

import { CONFIG, STATE } from '../config.js';
import { GitHubApi } from '../api/github.js';
import { MarkdownParser } from '../parser/index.js';
import { StorageRepo } from '../infrastructure/storage-repo.js';
import * as StateManager from './state-manager.js';
import * as UiRenderer from './ui-renderer.js';
import * as EventHandlers from './event-handlers.js';
import { createConfirmDialog } from './services/confirm-dialog.js';
import { hasCardShell, buildCardShellHtml, refreshCardUiRefs } from './services/card-shell.js';

// Export for global scope access
export { CONFIG, STATE, GitHubApi, MarkdownParser };

/**
 * Main VocabApp Class
 */
export class VocabApp {
  constructor() {
    this.ui = {
      loader: document.getElementById('loader'),
      card: document.getElementById('cardContainer'),
      word: document.getElementById('displayWord'),
      ipa: document.getElementById('displayPronunciation'),
      badges: document.getElementById('displayBadges'),
      list: document.getElementById('itemList'),
      progress: document.getElementById('progressText'),
      statsList: document.getElementById('wordListContainer'),
      actionArea: document.getElementById('actionArea'),
      statsPanel: document.getElementById('statsPanel'),
      filePanel: document.getElementById('filePanel'),
      fileListContainer: document.getElementById('fileListContainer'),
      btnInput: document.getElementById('btnModeInput'),
      btnRecall: document.getElementById('btnModeRecall'),
      btnAutoPlay: document.getElementById('btnAutoPlay'),
      iconAutoPlayOff: document.getElementById('iconAutoPlayOff'),
      iconAutoPlayOn: document.getElementById('iconAutoPlayOn'),
      btnPrev: document.getElementById('btnPrev'),
      shortcutsDialog: document.getElementById('shortcutsDialog'),
      confirmDialog: document.getElementById('confirmDialog'),
      dialogMessage: document.getElementById('dialogMessage'),
      dialogConfirmBtn: document.getElementById('dialogConfirmBtn'),
      currentFileDisplay: document.getElementById('currentFileDisplay')
    };
    this.confirmDialog = createConfirmDialog(this.ui);
    this.init();
  }

  async init() {
    // Initialize speech synthesis voices
    if ('speechSynthesis' in window) {
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
          EventHandlers.prewarmSpeechSynthesis();
        };
      }
      EventHandlers.prewarmSpeechSynthesis();
    }

    // Clear cache on init
    const cacheKeys = StorageRepo.keys();
    cacheKeys.forEach(key => {
      if (key.startsWith(CONFIG.cacheKey)) {
        StorageRepo.removeItem(key);
      }
    });

    StateManager.loadState();

    // Initialize displayOrder if empty
    if (STATE.cards.length > 0 && STATE.displayOrder.length === 0) {
      STATE.displayOrder = StateManager.generateDisplayOrder(STATE.cards, STATE.orderMode);
    }

    UiRenderer.updateAutoPlayButton(this.ui);
    UiRenderer.updateModeButtons(this.ui);
    UiRenderer.updateBodyModeClass();
    UiRenderer.updateOrderModeSelect(this.ui);

    if (STATE.cards.length === 0) {
      if (STATE.currentPath) {
        await EventHandlers.loadFile(STATE.currentPath, this.ui);
      } else {
        // Hide loader when showing file selection panel
        this.ui.loader.classList.add('hidden');
        EventHandlers.toggleFiles(true, this.ui);
        await EventHandlers.loadRootFolders(false, this.ui);
      }
    } else {
      if (STATE.currentPath) {
        UiRenderer.updateCurrentFileDisplay(this.ui, STATE.currentPath);
      }
      // 🔧 FIX: Start a new session when restoring from saved state
      StateManager.startSession();
      this.render();
    }
    StateManager.updateStatsUI(this.ui);
  }

  render() {
    UiRenderer.render(this.ui);
  }

  // State management methods
  getStorageKey(path) {
    return StateManager.getStorageKey(path);
  }

  loadStatsForFile(path) {
    StateManager.loadStatsForFile(path);
  }

  saveState() {
    StateManager.saveState();
  }

  loadState() {
    StateManager.loadState();
  }

  resetData() {
    StateManager.resetData();
  }

  getCurrentFolderPath() {
    return StateManager.getCurrentFolderPath();
  }

  updateStatsUI() {
    StateManager.updateStatsUI(this.ui);
  }

  // UI rendering methods
  updateCurrentFileDisplay(path) {
    UiRenderer.updateCurrentFileDisplay(this.ui, path);
  }

  updateAutoPlayButton() {
    UiRenderer.updateAutoPlayButton(this.ui);
  }

  showToast(msg) {
    UiRenderer.showToast(this.ui, msg);
  }

  triggerConfetti() {
    UiRenderer.triggerConfetti();
  }

  // Event handler methods
  setMode(newMode) {
    EventHandlers.setMode(newMode);
  }

  toggleAutoPlay() {
    EventHandlers.toggleAutoPlay();
  }

  handleRecall(claimedKnown) {
    EventHandlers.handleRecall(claimedKnown);
  }

  confirmRecall(actuallyCorrect) {
    EventHandlers.confirmRecall(actuallyCorrect);
  }

  revealAll() {
    UiRenderer.revealAll();
  }

  reveal(el) {
    UiRenderer.reveal(el);
  }

  showSentenceTranslation() {
    UiRenderer.showSentenceTranslation(this.ui);
  }

  recordError() {
    EventHandlers.recordError();
  }

  handleSentenceRecall(understood) {
    EventHandlers.handleSentenceRecall(understood);
  }

  nextCard() {
    EventHandlers.nextCard();
  }

  prevCard() {
    EventHandlers.prevCard();
  }

  jumpTo(idx) {
    EventHandlers.jumpTo(idx);
  }

  jumpToOriginal(originalIdx) {
    EventHandlers.jumpToOriginal(originalIdx);
  }

  setOrderMode(mode) {
    EventHandlers.setOrderMode(mode);
  }

  toggleFiles(forceOpen = null) {
    EventHandlers.toggleFiles(forceOpen);
  }

  toggleStats() {
    EventHandlers.toggleStats();
  }

  toggleShortcuts() {
    EventHandlers.toggleShortcuts();
  }

  loadRootFolders(forceRefresh = false) {
    return EventHandlers.loadRootFolders(forceRefresh);
  }

  loadFolder(path, forceRefresh = false) {
    return EventHandlers.loadFolder(path, forceRefresh);
  }

  selectFile(path, name) {
    EventHandlers.selectFile(path, name);
  }

  refreshFileList() {
    return EventHandlers.refreshFileList();
  }

  /**
   * Restart from beginning - restore card structure if needed and show first card
   */
  restart() {
    if (!hasCardShell()) {
      // Card structure was replaced (e.g., by completion screen) - rebuild it
      this.ui.card.innerHTML = buildCardShellHtml();
    }

    // Reset index, clear completed flag, and start new session
    STATE.currentIndex = 0;
    STATE.completed = false;
    StateManager.startSession();
    StateManager.saveState();

    // Re-initialize UI elements that were replaced
    refreshCardUiRefs(this.ui);

    // Re-render the first card
    this.render();
  }

  clearDataAndReload() {
    EventHandlers.clearDataAndReload();
  }

  playWord(word, buttonId = null, useTTSFallback = false, showNotification = true) {
    return EventHandlers.playWord(word, buttonId, useTTSFallback, showNotification);
  }

  translatePhrase() {
    return EventHandlers.translatePhrase();
  }

  translateSentence() {
    return EventHandlers.translateSentence();
  }

}
