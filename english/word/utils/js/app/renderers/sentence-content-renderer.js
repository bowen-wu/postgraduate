const complexSentenceDrafts = new Map();

import { renderSentenceWithBlank } from './contrast-content-renderer.js';

function appendPlainListRow(ui, className, buildContent) {
  const li = document.createElement('li');
  li.className = 'item';
  const node = buildContent();
  if (className) node.classList.add(className);
  li.appendChild(node);
  ui.list.appendChild(li);
  return { li, node };
}

function formatSentenceCnHtml(text) {
  let html = String(text || '');
  html = html
    .replace(/<br\s*\/?>/gi, '<br>')
    .replace(/&emsp;|&#8195;/gi, '&nbsp;&nbsp;')
    .replace(/&nbsp;/gi, '&nbsp;')
    .replace(/<p\s+align=["']right["']\s*>/gi, '<div style="text-align:right;">')
    .replace(/<p[^>]*>/gi, '<div>')
    .replace(/<\/p>/gi, '</div>');

  // Keep only simple line-break/paragraph formatting tags for display.
  html = html.replace(/<(?!\/?(br|div)\b)[^>]+>/gi, '');
  return html;
}

export function renderSentenceItems(ui, card) {
  const isWritingCard = typeof card?.id === 'string' && card.id.startsWith('writing_');

  const stripHtml = (text) => String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const sentenceText = (
    card.items?.[0]?.en ||
    stripHtml(card.displayWord) ||
    card.word ||
    ''
  ).trim();
  const sentenceTextEncoded = encodeURIComponent(sentenceText);
  const playButtonId = 'play-btn-sentence';

  const labelWrapper = document.createElement('div');
  labelWrapper.className = 'sentence-label-wrapper';
  labelWrapper.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';

  const labelDiv = document.createElement('div');
  labelDiv.className = 'sentence-label';
  if (card.type === 'complex-sentence') {
    labelDiv.textContent = 'Complex Sentence';
  } else {
    labelDiv.textContent = 'Example Sentence';
  }
  labelWrapper.appendChild(labelDiv);

  const playButton = document.createElement('button');
  playButton.id = playButtonId;
  playButton.className = 'btn-ghost audio-play-btn';
  playButton.style.cssText = 'padding: 0.15rem 0.4rem; font-size: 0.75rem;';
  playButton.title = 'Play sentence audio';
  playButton.dataset.action = 'play-word';
  playButton.dataset.wordEncoded = sentenceTextEncoded;
  playButton.dataset.word = sentenceText;
  playButton.dataset.buttonId = playButtonId;
  playButton.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
    <span class="btn-spinner"></span>
  `;
  labelWrapper.appendChild(playButton);

  if (card.type === 'complex-sentence') {
    const copyButton = document.createElement('button');
    copyButton.id = 'fill-complex-sentence-draft-btn';
    copyButton.className = 'btn-ghost complex-sentence-copy-btn';
    copyButton.style.cssText = 'padding: 0.15rem 0.4rem; font-size: 0.75rem;';
    copyButton.title = 'Paste sentence to draft';
    copyButton.dataset.action = 'fill-complex-sentence-draft';
    copyButton.dataset.targetId = 'complex-sentence-draft';
    copyButton.dataset.sentenceEncoded = sentenceTextEncoded;
    copyButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `;
    labelWrapper.appendChild(copyButton);
  }

  appendPlainListRow(ui, '', () => labelWrapper);

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
    appendPlainListRow(ui, '', () => patternsDiv);
  }

  const contentDiv = document.createElement('div');
  contentDiv.className = 'sentence-content';
  contentDiv.innerHTML = isWritingCard
    ? formatSentenceCnHtml(card.items?.[0]?.cn || '')
    : (card.displayWord || card.items[0].en);
  appendPlainListRow(ui, '', () => contentDiv);

  const item = card.items[0];
  const hasChinese = item.cn && typeof item.cn.trim === 'function' && item.cn.trim() !== '';
  if (hasChinese) {
    const cnDiv = document.createElement('div');
    cnDiv.className = 'sentence-cn';
    cnDiv.id = 'sentenceCn';
    cnDiv.innerHTML = isWritingCard
      ? (card.displayWord || item.en)
      : formatSentenceCnHtml(item.cn);
    cnDiv.style.display = 'none';
    if (card.type === 'complex-sentence') {
      cnDiv.style.display = 'block';
    }
    appendPlainListRow(ui, '', () => cnDiv);
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
        Translate
        <span class="btn-spinner"></span>
      </button>
    `;
    appendPlainListRow(ui, '', () => translateDiv);
  }

  const inlineQuizItems = Array.isArray(card.inlineQuizItems) ? card.inlineQuizItems : [];
  if (inlineQuizItems.length > 0) {
    const quizLabel = document.createElement('div');
    quizLabel.className = 'sentence-label';
    quizLabel.textContent = 'Sentence Options';
    quizLabel.style.marginTop = '1rem';
    appendPlainListRow(ui, '', () => quizLabel);

    inlineQuizItems.forEach((quizItem, idx) => {
      const li = document.createElement('li');
      li.className = 'item';
      const { sentenceHtml, optionsHtml, playButtonHtml } = renderSentenceWithBlank(
        quizItem.en,
        quizItem.blankOptions || [],
        card.id,
        idx,
        'sentence-blank',
        'play-btn-sentence-inline'
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
    });
  }

  if (card.type === 'complex-sentence') {
    const textareaTitle = document.createElement('div');
    textareaTitle.className = 'complex-sentence-subtitle';
    textareaTitle.textContent = 'Your Draft';
    appendPlainListRow(ui, '', () => textareaTitle);

    const textarea = document.createElement('textarea');
    textarea.id = 'complex-sentence-draft';
    textarea.className = 'complex-sentence-input';
    textarea.placeholder = 'Temporary draft for parsing/splitting sentence (not saved)';
    textarea.value = complexSentenceDrafts.get(card.id) || '';
    textarea.addEventListener('input', () => {
      complexSentenceDrafts.set(card.id, textarea.value);
    });
    appendPlainListRow(ui, '', () => textarea);
  }
}
