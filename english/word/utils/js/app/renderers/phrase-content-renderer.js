import { renderBadgeHtml } from './word-content-renderer.js';
import { renderSynonymsAndAntonyms } from './relations-renderer.js';

export function renderPhraseItems(ui, card, stats) {
  const encodedWord = encodeURIComponent(card.word);
  const playButtonId = 'play-btn-phrase';
  const playButton = `<button id="${playButtonId}" class="btn-ghost audio-play-btn" data-action="play-word" data-word-encoded="${encodedWord}" data-button-id="${playButtonId}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" title="播放发音">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
    <span class="btn-spinner"></span>
  </button>`;

  const wrapper = document.createElement('div');
  wrapper.className = 'phrase-header-wrapper';
  const titleDiv = document.createElement('div');
  titleDiv.className = 'phrase-title';
  titleDiv.innerHTML = `${card.word} ${playButton}`;
  wrapper.appendChild(titleDiv);

  const badgeHtml = renderBadgeHtml(card, stats);
  if (badgeHtml) {
    const badgesDiv = document.createElement('div');
    badgesDiv.className = 'badges-container';
    badgesDiv.innerHTML = badgeHtml;
    wrapper.appendChild(badgesDiv);
  }
  ui.list.appendChild(wrapper);

  const hasAnyChinese = card.items && card.items.some((item) => item.cn && item.cn.trim && item.cn.trim() !== '');
  if (!hasAnyChinese) {
    const translateDiv = document.createElement('div');
    translateDiv.className = 'translate-section';
    translateDiv.style.cssText = 'margin-top: 0.5rem; margin-bottom: 1rem;';
    translateDiv.innerHTML = `
      <button id="translate-btn-phrase" class="btn-ghost translate-btn" data-action="translate-phrase" style="display: inline-flex; align-items: center; gap: 0.4rem;">
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

  card.items.forEach((item) => {
    const hasCn = item.cn && item.cn.trim && item.cn.trim() !== '';
    if (!hasCn) return;
    const li = document.createElement('li');
    li.className = 'item';
    li.innerHTML = `<div class="cn-text" data-action="reveal" data-has-cn="true">${item.cn}</div>`;
    ui.list.appendChild(li);
  });

  renderSynonymsAndAntonyms(ui, card);
}
