export function createTranslationUseCases(deps) {
  const {
    stateManager,
    uiRenderer,
    getUi,
    render,
    translateText,
    setButtonLoading,
    revealSentenceTranslation = () => {}
  } = deps;

  async function translatePhrase() {
    const card = stateManager.getCurrentCard();
    if (!card || card.type !== 'phrase') return;

    const buttonIds = ['translate-btn-phrase', 'translate-btn-phrase-action'];

    try {
      buttonIds.forEach((id) => setButtonLoading(true, id));
      uiRenderer.showToast(getUi(), '正在翻译...');
      const result = await translateText(card.word);

      if (!card.items[0]) {
        card.items[0] = { en: card.word, cn: '' };
      }
      card.items[0].cn = result.translation;

      buttonIds.forEach((id) => setButtonLoading(false, id));
      stateManager.saveState();
      render();
      uiRenderer.renderNextAction(getUi());
    } catch (error) {
      buttonIds.forEach((id) => setButtonLoading(false, id));
      uiRenderer.showToast(getUi(), '❌ 翻译失败: ' + error.message);
    }
  }

  async function translateSentence() {
    const card = stateManager.getCurrentCard();
    if (!card || card.type !== 'sentence') return;

    const sentenceText = card.items[0]?.en || card.displayWord || card.word;
    const buttonIds = ['translate-btn-sentence', 'translate-btn-sentence-action'];

    try {
      buttonIds.forEach((id) => setButtonLoading(true, id));
      uiRenderer.showToast(getUi(), '正在翻译...');
      const result = await translateText(sentenceText);

      if (!card.items[0]) {
        card.items[0] = { en: sentenceText, cn: '' };
      }
      card.items[0].cn = result.translation;

      buttonIds.forEach((id) => setButtonLoading(false, id));
      stateManager.saveState();
      render();
      revealSentenceTranslation();

      uiRenderer.renderNextAction(getUi());
    } catch (error) {
      buttonIds.forEach((id) => setButtonLoading(false, id));
      uiRenderer.showToast(getUi(), '❌ 翻译失败: ' + error.message);
    }
  }

  return { translatePhrase, translateSentence };
}
