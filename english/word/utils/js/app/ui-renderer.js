/**
 * UI Renderer Module
 * Coordinates rendering modules and exposes stable UI APIs
 */

import { STATE } from '../config.js';

let _autoPlayFn = null;

export function setAutoPlayFn(fn) {
  _autoPlayFn = fn;
}
import * as StateManager from './state-manager.js';
import {
  renderInputActions as renderInputActionsModule,
  renderRecallActions as renderRecallActionsModule,
  renderConfirmationActions as renderConfirmationActionsModule,
  renderNextAction as renderNextActionModule
} from './renderers/action-renderer.js';
import { renderCompletionScreen } from './renderers/completion-renderer.js';
import { renderCardContent } from './renderers/card-content-renderer.js';
import { buildStatsRows, renderStatsRows } from './presenters/stats-list-presenter.js';
import {
  updateCurrentFileDisplay as updateCurrentFileDisplayModule,
  updateAutoPlayButton as updateAutoPlayButtonModule,
  updateModeButtons as updateModeButtonsModule,
  updateBodyModeClass as updateBodyModeClassModule,
  updateOrderModeSelect as updateOrderModeSelectModule
} from './renderers/ui-state-renderer.js';
import {
  reveal as revealModule,
  revealAll as revealAllModule,
  showSentenceTranslation as showSentenceTranslationModule,
  showToast as showToastModule,
  triggerConfetti as triggerConfettiModule
} from './renderers/feedback-renderer.js';
import { prefetchCurrentCardRelationAudio } from '../infrastructure/audio-prefetch-service.js';

const COMPARE_BASE_URL = 'https://bowen-wu.github.io/postgraduate/english/write/utils/compare-online.html';

function removeWritingComparePanel() {
  const panel = document.getElementById('writingComparePanel');
  if (panel) panel.remove();
}

function updateWritingCompareLayout(card) {
  const workspace = document.querySelector('.workspace');
  if (!workspace) return;

  const isWritingCard = typeof card?.id === 'string' && card.id.startsWith('writing_');
  if (!isWritingCard) {
    workspace.classList.remove('writing-compare-layout');
    removeWritingComparePanel();
    return;
  }

  workspace.classList.add('writing-compare-layout');
  const writingNo = String(card.writingNo || '').trim();
  const query = new URLSearchParams();
  if (writingNo) query.set('no', writingNo);
  query.set('mode', 'Writing');
  query.set('embed', '1');
  const compareUrl = `${COMPARE_BASE_URL}?${query.toString()}`;

  let panel = document.getElementById('writingComparePanel');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'writingComparePanel';
    panel.className = 'card writing-compare-card';
    panel.innerHTML = `
      <div class="writing-compare-card-header">
        <a class="writing-compare-link" target="_blank" rel="noopener noreferrer">Open Compare Tool</a>
      </div>
      <iframe title="Writing Compare Tool" loading="lazy"></iframe>
    `;
    workspace.appendChild(panel);
  }

  const link = panel.querySelector('.writing-compare-link');
  const iframe = panel.querySelector('iframe');
  if (link) link.href = compareUrl;
  if (iframe) iframe.src = compareUrl;
}

export function shouldAutoPlayCard(card, state = STATE) {
  if (!card) return false;
  if (!state.autoPlay) return false;
  if (typeof card.id === 'string' && card.id.startsWith('writing_')) return false;
  if (card.type === 'contrast') return false;
  if (card.type === 'block') return false;
  if (card.type === 'table') return false;
  return state.mode === 'input' || state.mode === 'recall';
}

function getAutoPlayPayload(card) {
  const stripHtml = (text) => String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  if (card.type === 'sentence') {
    const sentenceText = (
      card.items?.[0]?.en ||
      stripHtml(card.displayWord) ||
      card.word ||
      ''
    ).trim();
    return { word: sentenceText, buttonId: 'play-btn-sentence' };
  }

  if (card.type === 'complex-sentence') {
    const sentenceText = (
      card.items?.[0]?.en ||
      stripHtml(card.displayWord) ||
      card.word ||
      ''
    ).trim();
    return { word: sentenceText, buttonId: 'play-btn-sentence' };
  }

  if (card.type === 'phrase') {
    return { word: card.word, buttonId: 'play-btn-phrase' };
  }

  return { word: card.word, buttonId: 'play-btn-main' };
}

export function render(ui) {
  if (STATE.cards.length === 0 || STATE.displayOrder.length === 0) return;

  const card = StateManager.getCurrentCard();
  if (!card) return;

  if (!card.items) card.items = [];
  if (!card.synonyms) card.synonyms = [];
  if (!card.emoji) card.emoji = '';

  const stats = STATE.stats[card.id] || { errors: 0 };

  ui.card.classList.remove('is-sentence', 'is-phrase', 'is-contrast', 'is-complex-sentence', 'is-table');
  if (card.type === 'sentence') ui.card.classList.add('is-sentence');
  else if (card.type === 'complex-sentence') ui.card.classList.add('is-complex-sentence');
  else if (card.type === 'phrase') ui.card.classList.add('is-phrase');
  else if (card.type === 'contrast') ui.card.classList.add('is-contrast');
  else if (card.type === 'table') ui.card.classList.add('is-table');

  updateWritingCompareLayout(card);

  ui.progress.textContent = `${STATE.currentIndex + 1} / ${STATE.displayOrder.length}`;
  renderCardContent(ui, card, stats);

  if (STATE.mode === 'input') renderInputActions(ui);
  else renderRecallActions(ui);

  if (shouldAutoPlayCard(card, STATE)) {
    setTimeout(() => {
      const payload = getAutoPlayPayload(card);
      if (typeof _autoPlayFn === 'function') {
        _autoPlayFn(payload).catch(() => {});
      } else {
        document.dispatchEvent(new CustomEvent('app:play-word', {
          detail: payload
        }));
      }
    }, 300);
  }

  ui.btnPrev.disabled = STATE.currentIndex === 0;
  updateStatsUI(ui);

  setTimeout(() => {
    prefetchCurrentCardRelationAudio(STATE).catch(() => {});
  }, 0);
}

export function renderInputActions(ui) {
  renderInputActionsModule(ui);
}

export function renderRecallActions(ui) {
  renderRecallActionsModule(ui);
}

export function renderConfirmationActions(ui) {
  renderConfirmationActionsModule(ui);
}

export function renderNextAction(ui) {
  renderNextActionModule(ui);
}

export function reveal(el) {
  revealModule(el);
}

export function revealAll() {
  revealAllModule();
}

export function showSentenceTranslation(ui) {
  const card = StateManager.getCurrentCard();
  if (!card || (card.type !== 'sentence' && card.type !== 'complex-sentence')) return;

  showSentenceTranslationModule(ui, STATE.mode, (mode, targetUi) => {
    if (mode === 'input') renderInputActions(targetUi);
    else renderRecallActions(targetUi);
  });
}

export function updateCurrentFileDisplay(ui, path) {
  updateCurrentFileDisplayModule(ui, path);
}

export function updateAutoPlayButton(ui) {
  updateAutoPlayButtonModule(ui);
}

export function updateModeButtons(ui) {
  updateModeButtonsModule(ui);
}

export function updateBodyModeClass() {
  updateBodyModeClassModule();
}

export function updateOrderModeSelect() {
  updateOrderModeSelectModule();
}

export function showToast(_ui, msg) {
  showToastModule(msg);
}

export function triggerConfetti() {
  triggerConfettiModule();
}

export function showCompletionScreen(ui) {
  const workspace = document.querySelector('.workspace');
  if (workspace) workspace.classList.remove('writing-compare-layout');
  removeWritingComparePanel();
  renderCompletionScreen(ui, {
    state: STATE,
    stateManager: StateManager,
    triggerConfetti
  });
}

export function updateStatsUI(ui) {
  const rows = buildStatsRows({
    cards: STATE.cards,
    displayOrder: STATE.displayOrder,
    currentIndex: STATE.currentIndex,
    stats: STATE.stats
  });
  ui.statsList.innerHTML = renderStatsRows(rows);
  const active = ui.statsList.querySelector('.active');
  if (active) active.scrollIntoView({ block: 'center' });
}
