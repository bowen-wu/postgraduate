import { STATE } from '../../config.js';

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSentenceWithBlank(sentence, fallbackOptions, cardId, itemIndex) {
  const match = String(sentence || '').match(/<ins>(.*?)<\/ins>/i);
  const blankId = `contrast-blank-${cardId}-${itemIndex}`;
  const options = match
    ? match[1].split('/').map((item) => item.trim()).filter(Boolean)
    : fallbackOptions;

  const placeholder = `<span id="${blankId}" class="blur-target" style="padding:0 0.35rem;border-bottom:1px dashed #94a3b8;color:#64748b;">[ 选择 ]</span>`;
  const sentenceHtml = match
    ? sentence.replace(/<ins>.*?<\/ins>/i, placeholder)
    : `${escapeHtml(sentence)} ${placeholder}`;

  const optionsHtml = options.map((opt) => `
    <button class="btn-ghost" data-action="select-contrast-option" data-target-id="${blankId}" data-choice="${encodeURIComponent(opt)}" style="padding:0.15rem 0.45rem;font-size:0.8rem;">
      ${escapeHtml(opt)}
    </button>
  `).join('');

  return { sentenceHtml, optionsHtml };
}

export function renderContrastItems(ui, card, stats) {
  const itemCount = card.items?.length || 0;
  const optionLabel = Array.isArray(card.contrastOptions) ? card.contrastOptions.join(' vs. ') : card.word;

  const wrapper = document.createElement('div');
  wrapper.className = 'phrase-header-wrapper';
  wrapper.innerHTML = `
    <div class="phrase-title">Contrast: ${escapeHtml(optionLabel)}</div>
  `;
  ui.list.appendChild(wrapper);

  for (let idx = 0; idx < itemCount; idx++) {
    const item = card.items[idx];
    const li = document.createElement('li');
    li.className = 'item';
    const { sentenceHtml, optionsHtml } = renderSentenceWithBlank(
      item.en,
      item.blankOptions?.length ? item.blankOptions : (card.contrastOptions || []),
      card.id,
      idx
    );
    li.innerHTML = `
      <div class="${STATE.mode === 'recall' ? 'en-text blur-target' : 'en-text'}">${sentenceHtml}</div>
      <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.5rem;">
        ${optionsHtml}
      </div>
    `;
    ui.list.appendChild(li);
  }
}
