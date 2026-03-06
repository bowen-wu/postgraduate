export function dispatchAction(actionEl, deps) {
  const { app, resetCardLocalState } = deps;
  const action = actionEl.dataset.action;

  switch (action) {
    case 'toggle-files':
      app.toggleFiles();
      break;
    case 'toggle-shortcuts':
      app.toggleShortcuts();
      break;
    case 'set-mode':
      if (actionEl.dataset.mode) app.setMode(actionEl.dataset.mode);
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
      if (actionEl.dataset.path) app.loadFolder(actionEl.dataset.path);
      break;
    case 'select-file':
      if (actionEl.dataset.path && actionEl.dataset.name) {
        app.selectFile(actionEl.dataset.path, actionEl.dataset.name);
      }
      break;
    case 'jump-to-original':
      if (actionEl.dataset.index) app.jumpToOriginal(Number(actionEl.dataset.index));
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
        app.playWord(decodeURIComponent(actionEl.dataset.wordEncoded), actionEl.dataset.buttonId || null, false, false);
      }
      break;
    default:
      break;
  }
}
