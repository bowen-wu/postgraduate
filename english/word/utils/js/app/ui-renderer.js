/**
 * UI Renderer Module
 * Coordinates rendering modules and exposes stable UI APIs
 */

import { STATE } from '../config.js';
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

export function render(ui) {
  if (STATE.cards.length === 0 || STATE.displayOrder.length === 0) return;

  const card = StateManager.getCurrentCard();
  if (!card) return;

  if (!card.items) card.items = [];
  if (!card.synonyms) card.synonyms = [];
  if (!card.emoji) card.emoji = '';

  const stats = STATE.stats[card.id] || { errors: 0 };

  ui.card.classList.remove('is-sentence', 'is-phrase');
  if (card.type === 'sentence') ui.card.classList.add('is-sentence');
  else if (card.type === 'phrase') ui.card.classList.add('is-phrase');

  ui.progress.textContent = `${STATE.currentIndex + 1} / ${STATE.displayOrder.length}`;
  renderCardContent(ui, card, stats);

  if (STATE.mode === 'input') renderInputActions(ui);
  else renderRecallActions(ui);

  if (STATE.autoPlay && STATE.mode === 'input' && card.type === 'word') {
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('app:play-word', {
        detail: { word: card.word, buttonId: 'play-btn-main' }
      }));
    }, 300);
  }

  ui.btnPrev.disabled = STATE.currentIndex === 0;
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
  if (!card || card.type !== 'sentence') return;

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
