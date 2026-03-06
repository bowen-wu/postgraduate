import { CONFIG, STATE } from '../config.js';
import { VocabApp } from './vocab-app.js';
import { createUseCases } from '../application/use-cases.js';
import { setAppContext } from './event-handlers.js';
import { getCurrentCardFromState } from '../domain/selectors.js';

const app = new VocabApp();
window.app = app;
setAppContext(app);
const useCases = createUseCases(app);

const keyboardState = {
  lastPlayTime: {},
  synonymPlayIndex: 0,
  antonymPlayIndex: 0,
  isConfirming: false
};

function resetCardLocalState() {
  keyboardState.synonymPlayIndex = 0;
  keyboardState.antonymPlayIndex = 0;
  keyboardState.isConfirming = false;
}

function handleAction(actionEl) {
  const action = actionEl.dataset.action;
  switch (action) {
    case 'toggle-files':
      app.toggleFiles();
      break;
    case 'toggle-shortcuts':
      app.toggleShortcuts();
      break;
    case 'set-mode':
      if (actionEl.dataset.mode) {
        app.setMode(actionEl.dataset.mode);
      }
      break;
    case 'toggle-autoplay':
      app.toggleAutoPlay();
      break;
    case 'toggle-stats':
      app.toggleStats();
      break;
    case 'refresh-file-list':
      app.refreshFileList();
      break;
    case 'reset-data':
      app.resetData();
      break;
    case 'prev-card':
      app.prevCard();
      resetCardLocalState();
      break;
    case 'next-card':
      app.nextCard();
      resetCardLocalState();
      break;
    case 'cancel-dialog':
      app.confirmDialog.cancel();
      break;
    case 'load-root-folders':
      app.loadRootFolders();
      break;
    case 'load-folder':
      if (actionEl.dataset.path) {
        app.loadFolder(actionEl.dataset.path);
      }
      break;
    case 'select-file':
      if (actionEl.dataset.path && actionEl.dataset.name) {
        app.selectFile(actionEl.dataset.path, actionEl.dataset.name);
      }
      break;
    case 'jump-to-original':
      if (actionEl.dataset.index) {
        app.jumpToOriginal(Number(actionEl.dataset.index));
      }
      break;
    case 'restart':
      app.restart();
      break;
    case 'clear-data-reload':
      app.clearDataAndReload();
      break;
    case 'reload-page':
      location.reload();
      break;
    case 'show-sentence-translation':
      app.showSentenceTranslation();
      break;
    case 'translate-phrase':
      app.translatePhrase();
      break;
    case 'translate-sentence':
      app.translateSentence();
      break;
    case 'handle-sentence-recall':
      app.handleSentenceRecall(actionEl.dataset.understood === 'true');
      break;
    case 'handle-recall':
      app.handleRecall(actionEl.dataset.claimedKnown === 'true');
      break;
    case 'confirm-recall':
      app.confirmRecall(actionEl.dataset.actuallyCorrect === 'true');
      break;
    case 'reveal':
      app.reveal(actionEl);
      break;
    case 'play-word':
      if (actionEl.dataset.wordEncoded) {
        const word = decodeURIComponent(actionEl.dataset.wordEncoded);
        app.playWord(word, actionEl.dataset.buttonId || null, false, false);
      }
      break;
    default:
      break;
  }
}

function setupDomActions() {
  document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    handleAction(actionEl);
  });

  document.addEventListener('app:play-word', (e) => {
    const { word, buttonId } = e.detail || {};
    if (!word) return;
    app.playWord(word, buttonId || null, false, false);
  });
}

function setupOrderModeSelect() {
  const customSelect = document.getElementById('orderModeSelect');
  if (!customSelect) return;

  const trigger = customSelect.querySelector('.custom-select-trigger');
  const label = document.getElementById('orderModeLabel');
  const options = customSelect.querySelectorAll('.custom-select-option');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    customSelect.classList.toggle('open');
  });

  options.forEach((option) => {
    option.addEventListener('click', () => {
      const value = option.dataset.value;
      if (!value) return;

      label.textContent = option.textContent;
      options.forEach((opt) => opt.classList.remove('selected'));
      option.classList.add('selected');
      customSelect.classList.remove('open');
      app.setOrderMode(value);
    });
  });

  document.addEventListener('click', () => {
    customSelect.classList.remove('open');
  });

  customSelect.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      customSelect.classList.toggle('open');
    } else if (e.key === 'Escape') {
      customSelect.classList.remove('open');
    }
  });
}

function shouldIgnoreShortcut(e) {
  return e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
}

function debouncePassed(key, intervalMs) {
  const now = Date.now();
  if (keyboardState.lastPlayTime[key] && now - keyboardState.lastPlayTime[key] < intervalMs) {
    return false;
  }
  keyboardState.lastPlayTime[key] = now;
  return true;
}

function handleKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (shouldIgnoreShortcut(e)) return;

    const currentCard = getCurrentCardFromState(STATE);
    if (!currentCard) return;

    const isRecallMode = STATE.mode === 'recall';

    switch (e.key) {
      case 'Enter':
      case 'ArrowRight':
        e.preventDefault();
        app.nextCard();
        resetCardLocalState();
        break;
      case 'Backspace':
      case 'ArrowLeft':
        e.preventDefault();
        app.prevCard();
        resetCardLocalState();
        break;
      case ' ': {
        e.preventDefault();
        const debounceTime = CONFIG.audio?.debounce?.[currentCard.type] || 500;
        if (!debouncePassed('space', debounceTime)) return;

        let playBtnId = 'play-btn-main';
        if (currentCard.type === 'phrase') playBtnId = 'play-btn-phrase';
        else if (currentCard.type === 'sentence') playBtnId = 'play-btn-sentence';

        const audioText = currentCard.type === 'sentence' && currentCard.items?.[0]?.en
          ? currentCard.items[0].en
          : currentCard.word;
        app.playWord(audioText, playBtnId, false, false);
        break;
      }
      case 's':
      case 'S': {
        e.preventDefault();
        if (!debouncePassed('s', CONFIG.audio?.debounce?.word || 500)) return;
        if (!currentCard.synonyms || currentCard.synonyms.length === 0) return;

        const syn = currentCard.synonyms[keyboardState.synonymPlayIndex];
        const synWord = syn.word;
        const synBtnId = `play-btn-syn-${synWord.replace(/[^a-zA-Z0-9]/g, '-')}`;
        app.playWord(synWord, synBtnId, false, false);
        keyboardState.synonymPlayIndex = (keyboardState.synonymPlayIndex + 1) % currentCard.synonyms.length;
        break;
      }
      case 'a':
      case 'A': {
        e.preventDefault();
        const debounceTime = CONFIG.audio?.debounce?.[currentCard.type] || 500;
        if (!debouncePassed('a', debounceTime)) return;
        if (!currentCard.antonyms || currentCard.antonyms.length === 0) return;

        const ant = currentCard.antonyms[keyboardState.antonymPlayIndex];
        const antWord = ant.word;
        const antBtnId = `play-btn-ant-${antWord.replace(/[^a-zA-Z0-9]/g, '-')}`;
        app.playWord(antWord, antBtnId, false, false);
        keyboardState.antonymPlayIndex = (keyboardState.antonymPlayIndex + 1) % currentCard.antonyms.length;
        break;
      }
      case 't':
      case 'T':
        e.preventDefault();
        if (!debouncePassed('t', 1000)) return;
        if (currentCard.type === 'phrase') app.translatePhrase();
        else if (currentCard.type === 'sentence') app.translateSentence();
        break;
      case 'y':
      case 'Y':
      case '1':
        if (!isRecallMode) break;
        e.preventDefault();
        if (keyboardState.isConfirming) {
          app.confirmRecall(true);
          keyboardState.isConfirming = false;
        } else {
          app.handleRecall(true);
          keyboardState.isConfirming = true;
        }
        break;
      case 'n':
      case 'N':
      case '2':
        if (!isRecallMode) break;
        e.preventDefault();
        if (keyboardState.isConfirming) {
          app.confirmRecall(false);
          keyboardState.isConfirming = false;
        } else {
          app.handleRecall(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        useCases.closeOverlaysByPriority();
        break;
      case '?':
        e.preventDefault();
        app.toggleShortcuts();
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        useCases.toggleMode();
        break;
      case 'p':
      case 'P':
        e.preventDefault();
        app.toggleAutoPlay();
        break;
      case 'l':
      case 'L':
        e.preventDefault();
        app.toggleStats();
        break;
      case 'f':
      case 'F':
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          app.toggleFiles();
        }
        break;
      case 'Home':
        e.preventDefault();
        useCases.jumpToFirst();
        break;
      case 'End': {
        e.preventDefault();
        useCases.jumpToLast();
        break;
      }
      default:
        break;
    }
  });
}

setupDomActions();
setupOrderModeSelect();
handleKeyboardShortcuts();
