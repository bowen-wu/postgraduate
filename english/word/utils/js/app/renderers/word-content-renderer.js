import { STATE } from '../../config.js';

export function renderWordHeader(ui, card) {
  if (card.type === 'contrast') {
    ui.word.textContent = card.word;
    ui.ipa.textContent = '';
    ui.ipa.style.display = 'none';
    return;
  }
  if (card.type === 'analysis') {
    ui.word.textContent = 'Analysis';
    ui.ipa.textContent = '';
    ui.ipa.style.display = 'none';
    return;
  }
  if (card.type === 'block') {
    const firstLine = Array.isArray(card.items) ? card.items[0] : null;
    const encodedWord = encodeURIComponent(firstLine?.audioText || card.word || '');
    const playButtonId = 'play-btn-block-main';
    const playButton = `
      <button id="${playButtonId}" class="btn-ghost audio-play-btn" data-action="play-word" data-word-encoded="${encodedWord}" data-button-id="${playButtonId}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" title="Play audio">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span class="btn-spinner"></span>
      </button>`;
    ui.word.innerHTML = `<span>${card.word || 'Block'}</span> ${playButton}`;
    ui.ipa.textContent = '';
    ui.ipa.style.display = 'none';
    return;
  }

  const encodedWord = encodeURIComponent(card.word);
  const playButtonId = 'play-btn-main';
  const playButton = `<button id="${playButtonId}" class="btn-ghost audio-play-btn" data-action="play-word" data-word-encoded="${encodedWord}" data-button-id="${playButtonId}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" title="Play audio">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
    <span class="btn-spinner"></span>
  </button>`;

  const ipaHtml = (card.ipa && card.ipa.trim())
    ? `<span class="pronunciation-inline ${STATE.mode === 'recall' ? 'blur-target' : ''}" style="margin: 0;padding: 0;">${card.ipa}</span>`
    : '';

  const mainPlayButton = playButton;
  const wordSpanClass = card.type === 'complex-sentence'
    ? 'complex-sentence-title-text'
    : '';
  if (card.type === 'complex-sentence') {
    ui.word.innerHTML = `<span class="${wordSpanClass}">${card.word}</span>`;
  } else {
    ui.word.innerHTML = `
      <span class="word-title-line">
        <span class="${wordSpanClass}">${card.word}</span>
        ${mainPlayButton}
      </span>
      ${ipaHtml}
    `;
  }
  ui.ipa.textContent = '';
  ui.ipa.style.display = 'none';
}

export function renderBadgeHtml(card, stats) {
  let html = '';
  if (card.type === 'word') html += '<span class="badge badge-word">Word</span>';
  else if (card.type === 'phrase') html += '<span class="badge badge-rel">Phrase</span>';
  else if (card.type === 'contrast') html += '<span class="badge badge-rel">Contrast</span>';
  else if (card.type === 'analysis') html += '<span class="badge badge-sent">Analysis</span>';
  else if (card.type === 'prefix') html += '<span class="badge badge-pre">Affix</span>';
  else if (card.type === 'sentence') html += '<span class="badge badge-sent">Sentence</span>';
  else if (card.type === 'complex-sentence') html += '<span class="badge badge-sent complex-sentence-badge">Complex<br>Sentence</span>';
  else if (card.type === 'block') html += '<span class="badge badge-sent">Block</span>';
  if (stats.errors > 0) html += `<span class="badge badge-err">Err ${stats.errors}</span>`;
  return html;
}
