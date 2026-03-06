import { STATE } from '../../config.js';

export function renderWordHeader(ui, card) {
  const encodedWord = encodeURIComponent(card.word);
  const playButtonId = 'play-btn-main';
  const playButton = `<button id="${playButtonId}" class="btn-ghost audio-play-btn" data-action="play-word" data-word-encoded="${encodedWord}" data-button-id="${playButtonId}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" title="播放发音">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
    <span class="btn-spinner"></span>
  </button>`;

  const ipaHtml = (card.ipa && card.ipa.trim())
    ? `<span class="pronunciation-inline ${STATE.mode === 'recall' ? 'blur-target' : ''}" style="margin: 0;padding: 0;">${card.ipa}</span>`
    : '';

  ui.word.innerHTML = `<span>${card.word}</span> ${playButton} ${ipaHtml}`;
  ui.ipa.textContent = '';
  ui.ipa.style.display = 'none';
}

export function renderBadgeHtml(card, stats) {
  let html = '';
  if (card.type === 'word') html += '<span class="badge badge-word">单词</span>';
  else if (card.type === 'phrase') html += '<span class="badge badge-rel">词组</span>';
  else if (card.type === 'prefix') html += '<span class="badge badge-pre">前缀/后缀</span>';
  else if (card.type === 'sentence') html += '<span class="badge badge-sent">例句</span>';
  if (stats.errors > 0) html += `<span class="badge badge-err">错 ${stats.errors}</span>`;
  return html;
}
