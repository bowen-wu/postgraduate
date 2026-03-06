export function renderSentenceItems(ui, card) {
  const li = document.createElement('li');
  li.className = 'item';

  const sentenceText = card.items[0]?.en || card.displayWord || '';
  const sentenceTextEncoded = encodeURIComponent(sentenceText);
  const playButtonId = 'play-btn-sentence';

  const labelWrapper = document.createElement('div');
  labelWrapper.className = 'sentence-label-wrapper';
  labelWrapper.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';

  const labelDiv = document.createElement('div');
  labelDiv.className = 'sentence-label';
  labelDiv.textContent = 'Example Sentence';
  labelWrapper.appendChild(labelDiv);

  const playButton = document.createElement('button');
  playButton.id = playButtonId;
  playButton.className = 'btn-ghost audio-play-btn';
  playButton.style.cssText = 'padding: 0.15rem 0.4rem; font-size: 0.75rem;';
  playButton.title = '播放句子';
  playButton.dataset.action = 'play-word';
  playButton.dataset.wordEncoded = sentenceTextEncoded;
  playButton.dataset.buttonId = playButtonId;
  playButton.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
    <span class="btn-spinner"></span>
  `;
  labelWrapper.appendChild(playButton);
  ui.list.appendChild(labelWrapper);

  if (card.patterns && card.patterns.length > 0) {
    const patternsDiv = document.createElement('div');
    patternsDiv.className = 'sentence-patterns';
    patternsDiv.style.cssText = 'margin-bottom: 1rem; padding: 0.75rem 1rem; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 0.9rem; color: #92400e;';
    card.patterns.forEach((pattern) => {
      const patternP = document.createElement('div');
      patternP.style.cssText = 'margin: 0.25rem 0; line-height: 1.5;';
      patternP.textContent = `📌 ${pattern}`;
      patternsDiv.appendChild(patternP);
    });
    ui.list.appendChild(patternsDiv);
  }

  const contentDiv = document.createElement('div');
  contentDiv.className = 'sentence-content';
  contentDiv.innerHTML = card.displayWord || card.items[0].en;
  ui.list.appendChild(contentDiv);

  const item = card.items[0];
  const hasChinese = item.cn && typeof item.cn.trim === 'function' && item.cn.trim() !== '';
  if (hasChinese) {
    const cnDiv = document.createElement('div');
    cnDiv.className = 'sentence-cn';
    cnDiv.id = 'sentenceCn';
    cnDiv.textContent = item.cn;
    cnDiv.style.display = 'none';
    ui.list.appendChild(cnDiv);
  } else {
    const translateDiv = document.createElement('div');
    translateDiv.className = 'translate-section';
    translateDiv.style.cssText = 'margin-top: 1rem;';
    translateDiv.innerHTML = `
      <button id="translate-btn-sentence" class="btn-ghost translate-btn" data-action="translate-sentence" style="display: inline-flex; align-items: center; gap: 0.4rem;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        翻译
        <span class="btn-spinner"></span>
      </button>
    `;
    ui.list.appendChild(translateDiv);
  }

  ui.list.appendChild(li);
}
