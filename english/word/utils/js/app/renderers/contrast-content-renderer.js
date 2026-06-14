function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderSentenceWithBlank(sentence, fallbackOptions, cardId, itemIndex, blankPrefix = 'contrast-blank', playPrefix = 'play-btn-contrast') {
  const text = String(sentence || '');
  const bracketMatch = text.match(/\[\[(.*?)\]\]/);
  const insMatch = text.match(/<ins>(.*?)<\/ins>/i);
  const match = bracketMatch || insMatch;
  const blankId = `${blankPrefix}-${cardId}-${itemIndex}`;
  const playButtonId = `${playPrefix}-${cardId}-${itemIndex}`;
  const splitOptions = (raw) => String(raw || '')
    .split(/[\/|]/)
    .map((item) => item.replace(/\*\*/g, '').trim())
    .filter(Boolean);
  const options = match
    ? splitOptions(match[1])
    : (fallbackOptions || []).flatMap((opt) => splitOptions(opt));

  const placeholder = `<span id="${blankId}" style="padding:0 0.35rem;border-bottom:1px dashed #94a3b8;color:#64748b;">[ 选择 ]</span>`;
  const sentenceTemplate = bracketMatch
    ? sentence.replace(/\[\[(.*?)\]\]/, '__BLANK__')
    : (insMatch ? sentence.replace(/<ins>.*?<\/ins>/i, '__BLANK__') : `${text.trim()} __BLANK__`);
  const sentenceHtml = bracketMatch
    ? sentence.replace(/\[\[(.*?)\]\]/, placeholder)
    : (insMatch ? sentence.replace(/<ins>.*?<\/ins>/i, placeholder) : `${escapeHtml(sentence)} ${placeholder}`);

  const optionsHtml = options.map((opt, idx) => `
    <button class="btn-ghost contrast-option-btn" data-action="select-contrast-option" data-target-id="${blankId}" data-choice="${encodeURIComponent(opt)}" style="padding:0.15rem 0.45rem;font-size:0.8rem;">
      ${escapeHtml(opt)}
    </button>
    ${idx < options.length - 1 ? '<span class="contrast-option-separator">|</span>' : ''}
  `).join('');

  const playButtonHtml = `
    <button
      id="${playButtonId}"
      class="btn-ghost audio-play-btn"
      data-action="play-word"
      data-button-id="${playButtonId}"
      data-target-id="${blankId}"
      data-sentence-template="${encodeURIComponent(sentenceTemplate)}"
      style="padding:0.15rem 0.4rem;font-size:0.75rem;"
      title="播放句子"
      disabled
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
      <span class="btn-spinner"></span>
    </button>
  `;

  return { sentenceHtml, optionsHtml, playButtonHtml };
}

export function renderContrastItems(ui, card, stats) {
  const itemCount = card.items?.length || 0;

  for (let idx = 0; idx < itemCount; idx++) {
    const item = card.items[idx];
    const li = document.createElement('li');
    li.className = 'item';
    const { sentenceHtml, optionsHtml, playButtonHtml } = renderSentenceWithBlank(
      item.en,
      item.blankOptions?.length ? item.blankOptions : (card.contrastOptions || []),
      card.id,
      idx
    );
    li.innerHTML = `
      <div class="en-text" style="display:flex;align-items:center;gap:0.45rem;">
        <span>${sentenceHtml}</span>
        ${playButtonHtml}
      </div>
      <div class="contrast-options-row" style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.5rem;">
        ${optionsHtml}
      </div>
    `;
    ui.list.appendChild(li);
  }
}
