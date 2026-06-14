import { renderSentenceItems } from './sentence-content-renderer.js';
import { renderContrastItems } from './contrast-content-renderer.js';

export function renderAnalysisItems(ui, card, stats) {
  renderSentenceItems(ui, card);

  const items = Array.isArray(card.analysisItems) ? card.analysisItems : [];
  if (items.length === 0) return;

  const divider = document.createElement('div');
  divider.className = 'sentence-label';
  divider.textContent = 'Analysis Options';
  divider.style.marginTop = '1rem';
  ui.list.appendChild(divider);

  renderContrastItems(ui, {
    ...card,
    items
  }, stats);
}
