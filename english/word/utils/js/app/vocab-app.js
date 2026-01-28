/**
 * Main VocabApp Class
 * Coordinates all modules and initializes the application
 */

import { CONFIG, STATE } from '../config.js';
import { GitHubApi } from '../api/github.js';
import { MarkdownParser } from '../parser/index.js';
import * as StateManager from './state-manager.js';
import * as UiRenderer from './ui-renderer.js';
import * as EventHandlers from './event-handlers.js';

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
      confirmDialog: document.getElementById('confirmDialog'),
      dialogMessage: document.getElementById('dialogMessage'),
      dialogConfirmBtn: document.getElementById('dialogConfirmBtn'),
      currentFileDisplay: document.getElementById('currentFileDisplay')
    };
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
    console.log('🗑️ Clearing all file cache to fix format issues');
    const cacheKeys = Object.keys(localStorage);
    cacheKeys.forEach(key => {
      if (key.startsWith(CONFIG.cacheKey)) {
        localStorage.removeItem(key);
      }
    });

    StateManager.loadState();
    console.log('init - STATE.cards.length:', STATE.cards.length, 'currentPath:', STATE.currentPath);

    UiRenderer.updateAutoPlayButton(this.ui);
    UiRenderer.updateModeButtons(this.ui);
    UiRenderer.updateBodyModeClass();

    if (STATE.cards.length === 0) {
      if (STATE.currentPath) {
        console.log('init - Loading saved file:', STATE.currentPath);
        await EventHandlers.loadFile(STATE.currentPath, this.ui);
      } else {
        console.log('init - No saved file, showing file selection');
        EventHandlers.toggleFiles(true, this.ui);
        await EventHandlers.loadRootFolders(false, this.ui);
      }
    } else {
      console.log('init - Rendering existing cards');
      if (STATE.currentPath) {
        UiRenderer.updateCurrentFileDisplay(this.ui, STATE.currentPath);
      }
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

  restart() {
    EventHandlers.restart();
  }

  clearDataAndReload() {
    EventHandlers.clearDataAndReload();
  }

  playWord(word, buttonId = null, useTTSFallback = false, showNotification = true) {
    return EventHandlers.playWord(word, buttonId, useTTSFallback, showNotification);
  }

  reveal(el) {
    UiRenderer.reveal(el);
  }

  showSentenceTranslation() {
    UiRenderer.showSentenceTranslation(this.ui);
  }

  showCompletionScreen() {
    UiRenderer.showCompletionScreen(this.ui);
  }

  restart() {
    // Restore original card content
    if (window._originalCardContent) {
      this.ui.card.innerHTML = window._originalCardContent;
    }

    // Reset index
    STATE.currentIndex = 0;

    // Re-initialize UI elements that were replaced
    this.ui.word = document.getElementById('displayWord');
    this.ui.ipa = document.getElementById('displayPronunciation');
    this.ui.badges = document.getElementById('displayBadges');
    this.ui.list = document.getElementById('itemList');
    this.ui.progress = document.getElementById('progressText');
    this.ui.actionArea = document.getElementById('actionArea');
    this.ui.btnPrev = document.getElementById('btnPrev');

    // Re-render the first card
    this.render();
  }

  clearDataAndReload() {
    localStorage.removeItem(CONFIG.storageKey);
    location.reload();
  }

  // Confirm dialog object
  confirmDialog = {
    confirmCallback: null,

    show(message, onConfirm, title = '切换文件') {
      console.log('🔲 confirmDialog.show called');
      const overlay = window.app.ui.confirmDialog;
      const msgEl = window.app.ui.dialogMessage;
      const confirmBtn = window.app.ui.dialogConfirmBtn;
      const titleEl = overlay.querySelector('.dialog-title span');

      msgEl.innerHTML = message;
      if (titleEl) titleEl.textContent = title;
      this.confirmCallback = onConfirm;
      console.log('🔲 Callback set:', typeof onConfirm);

      confirmBtn.onclick = () => {
        console.log('✅ Confirm button clicked!');
        if (this.confirmCallback) {
          console.log('🔲 Executing callback...');
          const callback = this.confirmCallback;
          this.confirmCallback = null;
          callback();
        }
        this.hide();
      };

      overlay.classList.add('show');
    },

    hide() {
      window.app.ui.confirmDialog.classList.remove('show');
      this.confirmCallback = null;
    },

    cancel() {
      this.hide();
    }
  };
}

console.log('VocabMaster app module loaded successfully');
