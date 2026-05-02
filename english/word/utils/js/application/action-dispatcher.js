function shouldShowAudioSourceToastOnManualPlay() {
  if (typeof window === 'undefined') return false;
  const coarsePointer = typeof window.matchMedia === 'function' && (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches
  );
  const touchCapable = typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints || 0) > 0;
  return coarsePointer || touchCapable;
}

export function dispatchAction(actionEl, deps) {
  const { app, resetCardLocalState } = deps;
  const action = actionEl.dataset.action;

  const handlers = {
    'toggle-files': () => app.toggleFiles(),
    'toggle-shortcuts': () => app.toggleShortcuts(),
    'set-mode': () => actionEl.dataset.mode && app.setMode(actionEl.dataset.mode),
    'toggle-autoplay': () => app.toggleAutoPlay(),
    'toggle-stats': () => app.toggleStats(),
    'refresh-file-list': () => app.refreshFileList(),
    'reset-data': () => app.resetData(),
    'prev-card': () => {
      app.prevCard();
      resetCardLocalState();
    },
    'next-card': () => {
      app.nextCard();
      resetCardLocalState();
    },
    'cancel-dialog': () => app.confirmDialog.cancel(),
    'load-root-folders': () => app.loadRootFolders(),
    'load-folder': () => actionEl.dataset.path && app.loadFolder(actionEl.dataset.path),
    'select-file': () => {
      if (actionEl.dataset.path && actionEl.dataset.name) {
        app.selectFile(actionEl.dataset.path, actionEl.dataset.name);
      }
    },
    'jump-to-original': () => actionEl.dataset.index && app.jumpToOriginal(Number(actionEl.dataset.index)),
    restart: () => app.restart(),
    'clear-data-reload': () => app.clearDataAndReload(),
    'reload-page': () => location.reload(),
    'show-sentence-translation': () => app.showSentenceTranslation(),
    'translate-phrase': () => app.translatePhrase(),
    'translate-sentence': () => app.translateSentence(),
    'fill-complex-sentence-draft': () => app.fillComplexSentenceDraft(actionEl.dataset.targetId, actionEl.dataset.sentenceEncoded),
    'select-contrast-option': () => app.selectContrastOption(actionEl.dataset.targetId, actionEl.dataset.choice),
    'handle-sentence-recall': () => app.handleSentenceRecall(actionEl.dataset.understood === 'true'),
    'handle-recall': () => app.handleRecall(actionEl.dataset.claimedKnown === 'true'),
    'confirm-recall': () => app.confirmRecall(actionEl.dataset.actuallyCorrect === 'true'),
    reveal: () => app.reveal(actionEl),
    'play-word': () => {
      const encoded = actionEl.dataset.wordEncoded || '';
      const decoded = encoded ? decodeURIComponent(encoded) : '';
      const fallbackWord = (actionEl.dataset.word || '').trim();
      const targetWord = (decoded || fallbackWord).trim();
      if (!targetWord) return;
      const buttonId = actionEl.dataset.buttonId || actionEl.id || null;
      app.playWord(targetWord, buttonId, false, shouldShowAudioSourceToastOnManualPlay());
    }
  };

  const handler = handlers[action];
  if (handler) {
    handler();
    // On mobile browsers, keep buttons from staying in a pressed/focused visual state
    // after card navigation and action area re-render.
    if (typeof actionEl.blur === 'function') {
      actionEl.blur();
    }
  }
}
