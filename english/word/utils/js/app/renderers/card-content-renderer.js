import { STATE } from '../../config.js';
import { renderWordHeader, renderBadgeHtml } from './word-content-renderer.js';
import { renderPhraseItems } from './phrase-content-renderer.js';
import { renderSentenceItems } from './sentence-content-renderer.js';
import { renderContrastItems } from './contrast-content-renderer.js';
import { renderBlockItems } from './block-content-renderer.js';
import { renderTableItems } from './table-content-renderer.js';
import { renderSynonymsAndAntonyms } from './relations-renderer.js';

function renderBadges(ui, card, stats) {
  ui.badges.innerHTML = renderBadgeHtml(card, stats);
}

function renderItems(ui, card, stats) {
  ui.list.innerHTML = '';
  ui.list.classList.remove('block-item-list');
  // Reset recall reveal state between cards so hidden sections don't leak
  // into the next card's first screen in recall mode.
  ui.list.classList.remove('revealed');

  if (card.type === 'phrase') {
    renderPhraseItems(ui, card, stats);
    return;
  }

  if (card.type === 'sentence' || card.type === 'complex-sentence') {
    renderSentenceItems(ui, card);
    return;
  }

  if (card.type === 'contrast') {
    renderContrastItems(ui, card, stats);
    return;
  }
  if (card.type === 'table') {
    renderTableItems(ui, card);
    return;
  }
  if (card.type === 'block') {
    ui.list.classList.add('block-item-list');
    renderBlockItems(ui, card);
    return;
  }

  card.items.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'item';

    if (!item.en) {
      if (item.cn && item.cn.trim && item.cn.trim() !== '') {
        let cnDisplay = item.cn;
        if (idx === 0 && card.emoji) cnDisplay = `${card.emoji} ${cnDisplay}`;
        li.innerHTML = `<div class="cn-text" data-has-cn="true" style="border-left: none; padding-left: 0;">${cnDisplay}</div>`;
        ui.list.appendChild(li);
      }
      return;
    }

    const cleanEn = item.en.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*/g, '');
    const hasPOS = /^[a-z]+\.$/.test(cleanEn.trim());
    const hasCn = item.cn && item.cn.trim && item.cn.trim() !== '';

    let cnHtml = '';
    let cnDisplay = '';
    if (hasCn) {
      cnDisplay = item.cn;
      if (idx === 0 && card.emoji) cnDisplay = `${card.emoji} ${cnDisplay}`;
      cnHtml = `<div class="cn-text" data-has-cn="true">${cnDisplay}</div>`;
    }

    if (hasPOS || !hasCn) {
      const isPhraseItself = card.type === 'phrase' && item.en === card.word;
      if (isPhraseItself && !hasCn) return;
      if (isPhraseItself && hasCn) {
        li.innerHTML = `<div class="cn-text" data-has-cn="true">${cnDisplay}</div>`;
      } else {
        li.innerHTML = `
          <span class="item-tag tag-def ${STATE.mode === 'recall' ? 'blur-target' : ''}"></span>
          <div class="en-text ${STATE.mode === 'recall' ? 'blur-target' : ''}">${cleanEn}</div>
          ${cnHtml}
        `;
      }
    } else {
      li.innerHTML = `<div class="cn-text" data-has-cn="true" style="border-left: none; padding-left: 0;">${cnDisplay}</div>`;
    }
    ui.list.appendChild(li);
  });

  renderSynonymsAndAntonyms(ui, card);
}

export function renderCardContent(ui, card, stats) {
  renderWordHeader(ui, card);
  renderBadges(ui, card, stats);
  renderItems(ui, card, stats);
}
