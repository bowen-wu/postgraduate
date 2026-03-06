export function createStudyUseCases(deps) {
  const {
    state,
    stateManager,
    uiRenderer,
    getUi,
    render,
    getBadgesElement
  } = deps;

  function recordError() {
    const card = stateManager.getCurrentCard();
    if (!card) return false;

    if (!state.stats[card.id]) state.stats[card.id] = { errors: 0 };
    state.stats[card.id].errors += 1;
    stateManager.saveState();
    uiRenderer.updateStatsUI(getUi());

    const badgesEl = getBadgesElement ? getBadgesElement() : null;
    if (badgesEl) {
      const stats = state.stats[card.id] || { errors: 0 };
      let bHtml = badgesEl.innerHTML;
      if (!bHtml.includes('错')) {
        bHtml += `<span class="badge badge-err">错 ${stats.errors}</span>`;
        badgesEl.innerHTML = bHtml;
      }
    }

    return true;
  }

  function nextCard() {
    const currentCard = stateManager.getCurrentCard();
    if (currentCard) {
      stateManager.recordCardStudied(currentCard.id);
    }

    if (state.currentIndex < state.displayOrder.length - 1) {
      state.currentIndex += 1;
      stateManager.saveState();
      render();
      uiRenderer.updateStatsUI(getUi());
      return true;
    }

    uiRenderer.showCompletionScreen(getUi());
    return false;
  }

  function prevCard() {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      stateManager.saveState();
      render();
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
    } else {
      uiRenderer.showToast(getUi(), '已确认理解');
    }
    nextCard();
  }

  function jumpTo(idx) {
    if (idx >= 0 && idx < state.displayOrder.length) {
      state.currentIndex = idx;
      stateManager.saveState();
      render();
      return true;
    }
    return false;
  }

  function jumpToOriginal(originalIdx) {
    const displayIdx = state.displayOrder.indexOf(originalIdx);
    if (displayIdx !== -1) {
      state.currentIndex = displayIdx;
      stateManager.saveState();
      render();
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
