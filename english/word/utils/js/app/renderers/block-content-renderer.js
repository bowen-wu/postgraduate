export function renderBlockItems(ui, card) {
  const lines = Array.isArray(card.items) ? card.items : [];
  lines.forEach((line, index) => {
    const li = document.createElement('li');
    li.className = 'item block-item';
    const indent = Number(line.indentLevel || 0);
    const text = String(line.cleanText || line.en || '').trim();
    const cn = String(line.cn || '').trim();
    const playButtonId = `play-btn-block-${card.id}-${index}`;
    const audioText = String(line.audioText || line.en || text || '').trim();
    const encoded = encodeURIComponent(audioText);

    li.style.marginLeft = `${Math.max(0, indent) * 14}px`;
    li.innerHTML = `
      <div class="block-line-row">
        <div class="en-text">${text}</div>
        <button id="${playButtonId}" class="btn-ghost audio-play-btn" data-action="play-word" data-word-encoded="${encoded}" data-word="${audioText}" data-button-id="${playButtonId}" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" title="Play line audio">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span class="btn-spinner"></span>
        </button>
      </div>
      ${cn ? `<div class="cn-text" data-has-cn="true">${cn}</div>` : ''}
    `;
    ui.list.appendChild(li);
  });
}
