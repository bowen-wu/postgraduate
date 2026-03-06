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
    'handle-sentence-recall': () => app.handleSentenceRecall(actionEl.dataset.understood === 'true'),
    'handle-recall': () => app.handleRecall(actionEl.dataset.claimedKnown === 'true'),
    'confirm-recall': () => app.confirmRecall(actionEl.dataset.actuallyCorrect === 'true'),
    reveal: () => app.reveal(actionEl),
    'play-word': () => {
      if (!actionEl.dataset.wordEncoded) return;
      app.playWord(decodeURIComponent(actionEl.dataset.wordEncoded), actionEl.dataset.buttonId || null, false, false);
    }
  };

  const handler = handlers[action];
  if (handler) {
    handler();
  }
}
