export function renderBlockItems(ui, card) {
  const lines = Array.isArray(card.items) ? card.items : [];
  lines.forEach((line, index) => {
    const li = document.createElement('li');
    li.className = 'item block-item';
    const indent = Number(line.indentLevel || 0);
    const text = String(line.cleanText || line.en || '').trim();
    const enText = String(line.en || text).trim();
    const pos = line.type === 'word' ? String(line.pos || '').trim() : '';
    const cn = String(line.cn || '').trim();
    const playButtonId = `play-btn-block-${card.id}-${index}`;
    const audioText = String(line.audioText || line.en || text || '').trim();
    const encoded = encodeURIComponent(audioText);

    li.style.marginLeft = `${Math.max(0, indent) * 14}px`;
    const synonyms = Array.isArray(line.synonyms) ? line.synonyms : [];
    const synonymsHtml = synonyms.length > 0
      ? `<div class="synonyms-section block-synonyms">
          <div class="synonyms-label">Synonyms</div>
          ${synonyms.map((syn, synIdx) => {
            const synText = String(syn.word || '').trim();
            const synBtnId = `play-btn-block-syn-${card.id}-${index}-${synIdx}`;
            return `<span class="synonym-item">
              <span class="synonym-word">${synText}</span>
              <button id="${synBtnId}" class="synonym-play-btn audio-play-btn" data-action="play-word" data-word-encoded="${encodeURIComponent(synText)}" data-word="${synText}" data-button-id="${synBtnId}" title="Play synonym">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span class="btn-spinner"></span>
              </button>
            </span>`;
          }).join('')}
        </div>`
      : '';

    li.innerHTML = `
      <div class="block-line-row">
        <div class="en-text">${enText}</div>
        ${pos ? `<div class="block-pos">${pos}</div>` : ''}
        <button id="${playButtonId}" class="btn-ghost audio-play-btn" data-action="play-word" data-word-encoded="${encoded}" data-word="${audioText}" data-button-id="${playButtonId}" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" title="Play line audio">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span class="btn-spinner"></span>
        </button>
        ${cn ? `<div class="cn-text block-cn-inline" data-has-cn="true">${cn}</div>` : ''}
      </div>
      ${synonymsHtml}
    `;
    ui.list.appendChild(li);
  });
}
