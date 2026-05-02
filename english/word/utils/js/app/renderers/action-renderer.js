import { STATE } from '../../config.js';
import * as StateManager from '../state-manager.js';

export function renderInputActions(ui) {
  const card = StateManager.getCurrentCard();
  if (!card) return;

  if (card.type === 'complex-sentence') {
    ui.actionArea.innerHTML = `
      <button class="btn-ghost translate-btn" id="translate-btn-sentence-action" data-action="translate-sentence">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        Translate
        <span class="btn-spinner"></span>
      </button>
      <button class="btn-primary" data-action="next-card">Next</button>
    `;
    return;
  }

  if (card.type === 'sentence') {
    const hasChinese = card.items[0].cn && typeof card.items[0].cn.trim === 'function' && card.items[0].cn.trim() !== '';

    if (hasChinese) {
      const cnDiv = document.getElementById('sentenceCn');
      const isCnVisible = cnDiv && cnDiv.style.display !== 'none';

      if (!isCnVisible) {
        ui.actionArea.innerHTML = `
          <button class="btn-primary" data-action="show-sentence-translation">Show Translation <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
        `;
      } else {
        ui.actionArea.innerHTML = `<button class="btn-primary" data-action="next-card">Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>`;
      }
      return;
    }

    ui.actionArea.innerHTML = `
      <button class="btn-ghost translate-btn" id="translate-btn-sentence-action" data-action="translate-sentence">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        Translate
        <span class="btn-spinner"></span>
      </button>
      <button class="btn-primary" data-action="next-card">Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
    `;
    return;
  }

  if (card.type === 'phrase') {
    const hasAnyChinese = card.items && card.items.some((item) =>
      item.cn && item.cn.trim && item.cn.trim() !== ''
    );

    if (!hasAnyChinese) {
      ui.actionArea.innerHTML = `
        <button class="btn-ghost translate-btn" id="translate-btn-phrase-action" data-action="translate-phrase">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          Translate
          <span class="btn-spinner"></span>
        </button>
        <button class="btn-primary" data-action="next-card">Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
      `;
      return;
    }
  }

  ui.actionArea.innerHTML = `<button class="btn-primary" data-action="next-card">Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>`;
}

export function renderRecallActions(ui) {
  const card = StateManager.getCurrentCard();
  if (!card) return;

  if (card.type === 'complex-sentence') {
    ui.actionArea.innerHTML = `
      <button class="btn-ghost translate-btn" id="translate-btn-sentence-action" data-action="translate-sentence">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        Translate
        <span class="btn-spinner"></span>
      </button>
      <button class="btn-primary" data-action="next-card">Next</button>
    `;
    return;
  }

  if (card.type === 'sentence') {
    const hasChinese = card.items[0].cn && typeof card.items[0].cn.trim === 'function' && card.items[0].cn.trim() !== '';

    if (!hasChinese) {
      ui.actionArea.innerHTML = `
        <button class="btn-ghost translate-btn" id="translate-btn-sentence-action" data-action="translate-sentence">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          Translate
          <span class="btn-spinner"></span>
        </button>
        <button class="btn-primary" data-action="next-card">Next</button>
      `;
      return;
    }

    const cnDiv = document.getElementById('sentenceCn');
    const isCnVisible = cnDiv && cnDiv.style.display !== 'none';

    if (!isCnVisible) {
      ui.actionArea.innerHTML = `
        <button class="btn-ghost" data-action="next-card">Skip</button>
        <button class="btn-primary" data-action="show-sentence-translation">Show Translation</button>
      `;
    } else {
      ui.actionArea.innerHTML = `
        <button class="btn-danger" data-action="handle-sentence-recall" data-understood="false">Incorrect</button>
        <button class="btn-success" data-action="handle-sentence-recall" data-understood="true">Correct</button>
      `;
    }
    return;
  }

  if (card.type === 'phrase') {
    const hasAnyChinese = card.items && card.items.some((item) =>
      item.cn && item.cn.trim && item.cn.trim() !== ''
    );

    if (!hasAnyChinese) {
      ui.actionArea.innerHTML = `
        <button class="btn-ghost translate-btn" id="translate-btn-phrase-action" data-action="translate-phrase">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          Translate
          <span class="btn-spinner"></span>
        </button>
        <button class="btn-primary" data-action="next-card">Next</button>
      `;
      return;
    }
  }

  const hasChinese = card.items && card.items.some((item) =>
    item.cn && item.cn.trim && item.cn.trim() !== ''
  );

  if (!hasChinese) {
    renderNextAction(ui);
    return;
  }

  ui.actionArea.innerHTML = `
    <button class="btn-success" data-action="handle-recall" data-claimed-known="true">Know</button>
    <button class="btn-danger" data-action="handle-recall" data-claimed-known="false">不Know</button>
  `;
}

export function renderConfirmationActions(ui) {
  ui.actionArea.innerHTML = `
    <button class="btn-danger" data-action="confirm-recall" data-actually-correct="false">Incorrect</button>
    <button class="btn-success" data-action="confirm-recall" data-actually-correct="true">Confirmed</button>
  `;
}

export function renderNextAction(ui) {
  ui.actionArea.innerHTML = '<button class="btn-primary" data-action="next-card">Next</button>';
}
