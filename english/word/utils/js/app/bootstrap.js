import { VocabApp } from './vocab-app.js';
import { createUseCases } from '../application/use-cases.js';
import { dispatchAction } from '../application/action-dispatcher.js';
import { setAppContext } from './event-handlers.js';
import { setupOrderModeSelect } from './order-mode-select.js';
import { createKeyboardShortcutHandler } from './keyboard-shortcuts.js';
import { warmUpAudioContext } from '../infrastructure/audio-service.js';
import { setAutoPlayFn } from './ui-renderer.js';

const app = new VocabApp();
setAppContext(app);

app.uiPort = {
  isShortcutsOpen: () => app.ui.shortcutsDialog?.classList.contains('show') || false,
  isFilesOpen: () => app.ui.filePanel?.classList.contains('open') || false,
  isStatsOpen: () => app.ui.statsPanel?.classList.contains('open') || false
};

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

function setupDomActions() {
  document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    dispatchAction(actionEl, { app, resetCardLocalState });
  });

  document.addEventListener('app:play-word', (e) => {
    const { word, buttonId } = e.detail || {};
    if (!word) return;
    app.playWord(word, buttonId || null, false, false);
  });
}

function handleKeyboardShortcuts() {
  const onKeydown = createKeyboardShortcutHandler({
    app,
    useCases,
    keyboardState,
    resetCardLocalState
  });
  document.addEventListener('keydown', onKeydown);
}

setupDomActions();
setupOrderModeSelect();
handleKeyboardShortcuts();

// Use direct function call for autoplay instead of CustomEvent (preserves gesture context better)
setAutoPlayFn((payload) => {
  return app.playWord(payload.word, payload.buttonId || null, false, true);
});

// Pre-warm AudioContext on the first user gesture (required by iOS Safari)
const warmUpOnce = () => {
  warmUpAudioContext();
  document.removeEventListener('click', warmUpOnce);
  document.removeEventListener('touchstart', warmUpOnce);
};
document.addEventListener('click', warmUpOnce);
document.addEventListener('touchstart', warmUpOnce);
