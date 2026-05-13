export function createStudyUseCases(deps) {
  const {
    state,
    stateManager,
    uiRenderer,
    getUi,
    render,
    stopAudioPlayback = () => {},
    prefetchUpcomingAudio = () => {}
  } = deps;

  function recordError() {
    const card = stateManager.getCurrentCard();
    if (!card) return false;

    if (!state.stats[card.id]) state.stats[card.id] = { errors: 0 };
    state.stats[card.id].errors += 1;
    stateManager.saveState();
    uiRenderer.updateStatsUI(getUi());

    return true;
  }

  function nextCard() {
    const currentCard = stateManager.getCurrentCard();
    if (currentCard) {
      stateManager.recordCardStudied(currentCard.id);
    }

    if (state.currentIndex < state.displayOrder.length - 1) {
      stopAudioPlayback();
      state.currentIndex += 1;
      stateManager.saveState();
      render();
      prefetchUpcomingAudio();
      uiRenderer.updateStatsUI(getUi());
      return true;
    }

    uiRenderer.showCompletionScreen(getUi());
    return false;
  }

  function prevCard() {
    if (state.currentIndex > 0) {
      stopAudioPlayback();
      state.currentIndex -= 1;
      stateManager.saveState();
      render();
      prefetchUpcomingAudio();
      uiRenderer.updateStatsUI(getUi());
      return true;
    }

    uiRenderer.showToast(getUi(), '已经是第一个卡片了');
    return false;
  }

  function handleRecall(claimedKnown) {
    uiRenderer.revealAll();
    if (!claimedKnown) {
      recordError();
      uiRenderer.showToast(getUi(), '已记录不记得');
      uiRenderer.renderNextAction(getUi());
      return;
    }
    uiRenderer.renderConfirmationActions(getUi());
  }

  function confirmRecall(actuallyCorrect) {
    if (actuallyCorrect) {
      uiRenderer.showToast(getUi(), '正确！');
    } else {
      recordError();
      uiRenderer.showToast(getUi(), '已记录错误');
    }
    nextCard();
  }

  function handleSentenceRecall(understood) {
    if (!understood) {
      recordError();
      uiRenderer.showToast(getUi(), '已记录不理解');
      uiRenderer.renderNextAction(getUi());
      return;
    }

    uiRenderer.showSentenceTranslation(getUi());
    uiRenderer.renderConfirmationActions(getUi());
  }

  function jumpTo(idx) {
    if (idx >= 0 && idx < state.displayOrder.length && idx !== state.currentIndex) {
      stopAudioPlayback();
      state.currentIndex = idx;
      stateManager.saveState();
      render();
      prefetchUpcomingAudio();
      return true;
    }
    return false;
  }

  function jumpToOriginal(originalIdx) {
    const displayIdx = state.displayOrder.indexOf(originalIdx);
    if (displayIdx !== -1 && displayIdx !== state.currentIndex) {
      stopAudioPlayback();
      state.currentIndex = displayIdx;
      stateManager.saveState();
      render();
      prefetchUpcomingAudio();
      return true;
    }
    return false;
  }

  return {
    recordError,
    nextCard,
    prevCard,
    handleRecall,
    confirmRecall,
    handleSentenceRecall,
    jumpTo,
    jumpToOriginal
  };
}
