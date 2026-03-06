/**
 * UI Renderer Module
 * Handles all UI rendering operations including cards, buttons, and panels
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

/**
 * Main render function - renders the current card
 */
export function render(ui) {
  if (STATE.cards.length === 0 || STATE.displayOrder.length === 0) return;

  // Get current card using display order
  const card = StateManager.getCurrentCard();
  if (!card) return;

  // Ensure card has required fields (for backward compatibility)
  if (!card.items) card.items = [];
  if (!card.synonyms) card.synonyms = [];
  if (!card.emoji) card.emoji = '';

  const stats = STATE.stats[card.id] || {errors: 0};

  // Add/remove type-specific classes
  ui.card.classList.remove('is-sentence', 'is-phrase');
  if (card.type === 'sentence') {
    ui.card.classList.add('is-sentence');
  } else if (card.type === 'phrase') {
    ui.card.classList.add('is-phrase');
  }

  // Update progress text
  ui.progress.textContent = `${STATE.currentIndex + 1} / ${STATE.displayOrder.length}`;

  // Render word/phrase with play button
  renderWord(ui, card);

  // Render badges
  renderBadges(ui, card, stats);

  // Render items list
  renderItems(ui, card);

  // Render action buttons based on mode
  if (STATE.mode === 'input') {
    renderInputActions(ui);
  } else {
    renderRecallActions(ui);
  }

  // Auto-play pronunciation if enabled and card is a word
  if (STATE.autoPlay && STATE.mode === 'input' && card.type === 'word') {
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('app:play-word', {
        detail: { word: card.word, buttonId: 'play-btn-main' }
      }));
    }, 300);
  }

  // Update prev button disabled state
  ui.btnPrev.disabled = STATE.currentIndex === 0;
}

/**
 * Render word/phrase with play button
 */
function renderWord(ui, card) {
  const encodedWord = encodeURIComponent(card.word);
  const playButtonId = `play-btn-main`;
  const playButton = `<button id="${playButtonId}" class="btn-ghost audio-play-btn" data-action="play-word" data-word-encoded="${encodedWord}" data-button-id="${playButtonId}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" title="播放发音">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
    <span class="btn-spinner"></span>
  </button>`;

  // Add IPA after the play button with blur-target class for recall mode
  const ipaHtml = (card.ipa && card.ipa.trim())
    ? `<span class="pronunciation-inline ${STATE.mode === 'recall' ? 'blur-target' : ''}" style="margin: 0;padding: 0;">${card.ipa}</span>`
    : '';

  ui.word.innerHTML = `<span>${card.word}</span> ${playButton} ${ipaHtml}`;

  // Hide IPA in header (it's now shown inline with the word)
  ui.ipa.textContent = '';
  ui.ipa.style.display = 'none';
}

/**
 * Render badges
 */
function renderBadges(ui, card, stats) {
  let bHtml = '';
  if (card.type === 'word') bHtml += `<span class="badge badge-word">单词</span>`;
  else if (card.type === 'phrase') bHtml += `<span class="badge badge-rel">词组</span>`;
  else if (card.type === 'prefix') bHtml += `<span class="badge badge-pre">前缀/后缀</span>`;
  else if (card.type === 'sentence') bHtml += `<span class="badge badge-sent">例句</span>`;
  if (stats.errors > 0) bHtml += `<span class="badge badge-err">错 ${stats.errors}</span>`;
  ui.badges.innerHTML = bHtml;
}

/**
 * Render items list
 */
function renderItems(ui, card) {
  ui.list.innerHTML = '';

  // Special rendering for phrase cards
  if (card.type === 'phrase') {
    renderPhraseItems(ui, card);
    return;
  }

  // Special rendering for sentence cards
  if (card.type === 'sentence') {
    renderSentenceItems(ui, card);
    return;
  }

  // Normal rendering for word cards
  const items = card.items;

  items.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'item';

    // Skip if no en field (only Chinese definition)
    if (!item.en) {
      if (item.cn && item.cn.trim && item.cn.trim() !== '') {
        let cnDisplay = item.cn;
        if (idx === 0 && card.emoji) {
          cnDisplay = card.emoji + ' ' + cnDisplay;
        }
        li.innerHTML = `<div class="cn-text" data-action="reveal" data-has-cn="true" style="border-left: none; padding-left: 0;">${cnDisplay}</div>`;
        ui.list.appendChild(li);
      }
      return;
    }

    const cleanEn = item.en
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*/g, '');

    const hasPOS = /^[a-z]+\.$/.test(cleanEn.trim());
    const hasCn = item.cn && item.cn.trim && item.cn.trim() !== '';

    let cnHtml = '';
    let cnDisplay = '';
    if (hasCn) {
      cnDisplay = item.cn;
      if (idx === 0 && card.emoji) {
        cnDisplay = card.emoji + ' ' + cnDisplay;
      }
      cnHtml = `<div class="cn-text" data-action="reveal" data-has-cn="true">${cnDisplay}</div>`;
    }

    if (hasPOS || !hasCn) {
      const isPhraseItself = card.type === 'phrase' && item.en === card.word;

      if (isPhraseItself && !hasCn) {
        return;
      }

      if (isPhraseItself && hasCn) {
        li.innerHTML = `<div class="cn-text" data-action="reveal" data-has-cn="true">${cnDisplay}</div>`;
      } else {
        li.innerHTML = `
          <span class="item-tag tag-def ${STATE.mode === 'recall' ? 'blur-target' : ''}"></span>
          <div class="en-text ${STATE.mode === 'recall' ? 'blur-target' : ''}">${cleanEn}</div>
          ${cnHtml}
        `;
      }
    } else {
      li.innerHTML = `<div class="cn-text" data-action="reveal" data-has-cn="true" style="border-left: none; padding-left: 0;">${cnDisplay}</div>`;
    }
    ui.list.appendChild(li);
  });

  // Add synonyms and antonyms sections
  renderSynonymsAndAntonyms(ui, card);
}

/**
 * Render phrase items
 */
function renderPhraseItems(ui, card) {
  const encodedWord = encodeURIComponent(card.word);
  // Use a different ID for phrase cards to avoid conflict with header button
  const playButtonId = `play-btn-phrase`;
  const playButton = `<button id="${playButtonId}" class="btn-ghost audio-play-btn" data-action="play-word" data-word-encoded="${encodedWord}" data-button-id="${playButtonId}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" title="播放发音">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
    <span class="btn-spinner"></span>
  </button>`;

  const wrapper = document.createElement('div');
  wrapper.className = 'phrase-header-wrapper';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'phrase-title';
  titleDiv.innerHTML = `${card.word} ${playButton}`;
  wrapper.appendChild(titleDiv);

  // Get badge HTML
  const stats = STATE.stats[card.id] || {errors: 0};
  let bHtml = '';
  if (card.type === 'word') bHtml += `<span class="badge badge-word">单词</span>`;
  else if (card.type === 'phrase') bHtml += `<span class="badge badge-rel">词组</span>`;
  else if (card.type === 'prefix') bHtml += `<span class="badge badge-pre">前缀/后缀</span>`;
  else if (card.type === 'sentence') bHtml += `<span class="badge badge-sent">例句</span>`;
  if (stats.errors > 0) bHtml += `<span class="badge badge-err">错 ${stats.errors}</span>`;

  if (bHtml) {
    const badgesDiv = document.createElement('div');
    badgesDiv.className = 'badges-container';
    badgesDiv.innerHTML = bHtml;
    wrapper.appendChild(badgesDiv);
  }

  ui.list.appendChild(wrapper);

  // Check if phrase has any Chinese translation
  const hasAnyChinese = card.items && card.items.some(item =>
    item.cn && item.cn.trim && item.cn.trim() !== ''
  );

  // If no Chinese translation, add translate button
  if (!hasAnyChinese) {
    const translateDiv = document.createElement('div');
    translateDiv.className = 'translate-section';
    translateDiv.style.cssText = 'margin-top: 0.5rem; margin-bottom: 1rem;';
    translateDiv.innerHTML = `
      <button id="translate-btn-phrase" class="btn-ghost translate-btn" data-action="translate-phrase" style="display: inline-flex; align-items: center; gap: 0.4rem;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        翻译
        <span class="btn-spinner"></span>
      </button>
    `;
    ui.list.appendChild(translateDiv);
  }

  // Render definitions
  const items = card.items;
  items.forEach((item) => {
    const hasCn = item.cn && item.cn.trim && item.cn.trim() !== '';
    // Only render if has Chinese content
    if (hasCn) {
      const li = document.createElement('li');
      li.className = 'item';
      li.innerHTML = `<div class="cn-text" data-action="reveal" data-has-cn="true">${item.cn}</div>`;
      ui.list.appendChild(li);
    }
  });

  // Render synonyms and antonyms for phrase cards
  renderSynonymsAndAntonyms(ui, card);
}

/**
 * Render sentence items
 */
function renderSentenceItems(ui, card) {
  const li = document.createElement('li');
  li.className = 'item';

  // Add play button for sentence (plays pure English sentence)
  const sentenceText = card.items[0]?.en || card.displayWord || '';
  const sentenceTextEncoded = encodeURIComponent(sentenceText);
  const playButtonId = 'play-btn-sentence';

  // Create label wrapper with text and play button
  const labelWrapper = document.createElement('div');
  labelWrapper.className = 'sentence-label-wrapper';
  labelWrapper.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';

  const labelDiv = document.createElement('div');
  labelDiv.className = 'sentence-label';
  labelDiv.textContent = 'Example Sentence';
  labelWrapper.appendChild(labelDiv);

  const playButton = document.createElement('button');
  playButton.id = playButtonId;
  playButton.className = 'btn-ghost audio-play-btn';
  playButton.style.cssText = 'padding: 0.15rem 0.4rem; font-size: 0.75rem;';
  playButton.title = '播放句子';
  playButton.dataset.action = 'play-word';
  playButton.dataset.wordEncoded = sentenceTextEncoded;
  playButton.dataset.buttonId = playButtonId;
  playButton.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
    <span class="btn-spinner"></span>
  `;
  labelWrapper.appendChild(playButton);

  ui.list.appendChild(labelWrapper);

  // Display sentence patterns
  if (card.patterns && card.patterns.length > 0) {
    const patternsDiv = document.createElement('div');
    patternsDiv.className = 'sentence-patterns';
    patternsDiv.style.cssText = 'margin-bottom: 1rem; padding: 0.75rem 1rem; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 0.9rem; color: #92400e;';

    card.patterns.forEach(pattern => {
      const patternP = document.createElement('div');
      patternP.style.cssText = 'margin: 0.25rem 0; line-height: 1.5;';
      patternP.textContent = `📌 ${pattern}`;
      patternsDiv.appendChild(patternP);
    });

    ui.list.appendChild(patternsDiv);
  }

  // Display sentence content (no blur-target for sentences, even in recall mode)
  const contentDiv = document.createElement('div');
  contentDiv.className = 'sentence-content';
  // Use displayWord for bold formatting, fallback to items[0].en for backward compatibility
  contentDiv.innerHTML = card.displayWord || card.items[0].en;
  ui.list.appendChild(contentDiv);

  // Add Chinese translation if exists
  const item = card.items[0];
  const hasChinese = item.cn && typeof item.cn.trim === 'function' && item.cn.trim() !== '';

  if (hasChinese) {
    const cnDiv = document.createElement('div');
    cnDiv.className = 'sentence-cn';
    cnDiv.id = 'sentenceCn';
    cnDiv.textContent = item.cn;
    // IMPORTANT: Always hide Chinese initially for sentences (regardless of mode)
    // User must click "查看译文" button to reveal it
    cnDiv.style.display = 'none';
    ui.list.appendChild(cnDiv);
  } else {
    // No Chinese translation - add translate button
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
        翻译
        <span class="btn-spinner"></span>
      </button>
    `;
    ui.list.appendChild(translateDiv);
  }

  ui.list.appendChild(li);
}

/**
 * Render synonyms and antonyms sections
 */
function renderSynonymsAndAntonyms(ui, card) {
  const hasSynonyms = card.synonyms && card.synonyms.length > 0;
  const hasAntonyms = card.antonyms && card.antonyms.length > 0;

  if (!hasSynonyms && !hasAntonyms) return;

  // Render synonyms
  if (hasSynonyms) {
    const synSection = document.createElement('div');
    synSection.className = 'synonyms-section';

    const synLabel = document.createElement('div');
    synLabel.className = 'synonyms-label';
    synLabel.textContent = 'Synonyms';
    synSection.appendChild(synLabel);

    const synList = document.createElement('div');
    synList.className = 'synonyms-list';

    card.synonyms.forEach(syn => {
      // Check if synonym has items (multiple definitions like == curb)
      if (syn.items && syn.items.length > 0) {
        // Create container for the whole synonym with items
        const synContainer = document.createElement('div');
        synContainer.className = 'synonym-with-items';

        // Create main synonym item (word only)
        const synMainItem = document.createElement('div');
        synMainItem.className = 'synonym-main';

        const playBtn = document.createElement('button');
        playBtn.className = 'synonym-play-btn audio-play-btn';
        const synWordEncoded = encodeURIComponent(syn.word);
        const synBtnId = `play-btn-syn-${syn.word.replace(/[^a-zA-Z0-9]/g, '-')}`;
        playBtn.id = synBtnId;
        playBtn.dataset.action = 'play-word';
        playBtn.dataset.wordEncoded = synWordEncoded;
        playBtn.dataset.buttonId = synBtnId;
        playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg><span class="btn-spinner"></span>`;

        const synWord = document.createElement('span');
        synWord.className = 'synonym-word';
        synWord.textContent = syn.word;

        synMainItem.appendChild(playBtn);
        synMainItem.appendChild(synWord);
        synContainer.appendChild(synMainItem);

        // Create sub-items for each definition (indented)
        const synSubList = document.createElement('div');
        synSubList.className = 'synonym-sub-items';

        syn.items.forEach(item => {
          const subItem = document.createElement('div');
          subItem.className = 'synonym-sub-item';

          let subText = '';
          if (item.en && item.en.trim() !== '') {
            subText += item.en;
          }
          if (item.cn && item.cn.trim() !== '') {
            if (subText) subText += ' ';
            subText += item.cn;
          }

          subItem.textContent = subText;
          synSubList.appendChild(subItem);
        });

        synContainer.appendChild(synSubList);
        synList.appendChild(synContainer);
      } else {
        // Simple synonym - check if it has any definition
        const hasDefinition = (syn.pos && syn.pos.trim() !== '') || (syn.cn && syn.cn.trim() !== '');

        if (hasDefinition) {
          // Has definition - use multi-line structure with divider and dots
          const synContainer = document.createElement('div');
          synContainer.className = 'synonym-with-items';

          // Create main synonym item (word only)
          const synMainItem = document.createElement('div');
          synMainItem.className = 'synonym-main';

          const playBtn = document.createElement('button');
          playBtn.className = 'synonym-play-btn audio-play-btn';
          const synWordEncoded = encodeURIComponent(syn.word);
          const synBtnId = `play-btn-syn-${syn.word.replace(/[^a-zA-Z0-9]/g, '-')}`;
          playBtn.id = synBtnId;
          playBtn.dataset.action = 'play-word';
          playBtn.dataset.wordEncoded = synWordEncoded;
          playBtn.dataset.buttonId = synBtnId;
          playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg><span class="btn-spinner"></span>`;

          const synWord = document.createElement('span');
          synWord.className = 'synonym-word';
          synWord.textContent = syn.word;

          synMainItem.appendChild(playBtn);
          synMainItem.appendChild(synWord);
          synContainer.appendChild(synMainItem);

          // Create sub-items with single definition
          const synSubList = document.createElement('div');
          synSubList.className = 'synonym-sub-items';

          const subItem = document.createElement('div');
          subItem.className = 'synonym-sub-item';

          let subText = '';
          if (syn.pos && syn.pos.trim() !== '') {
            subText += syn.pos;
          }
          if (syn.cn && syn.cn.trim() !== '') {
            if (subText) subText += ' ';
            subText += syn.cn;
          }

          subItem.textContent = subText;
          synSubList.appendChild(subItem);

          synContainer.appendChild(synSubList);
          synList.appendChild(synContainer);
        } else {
          // No definition - single line with word only, no divider or dots
          const synItem = document.createElement('span');
          synItem.className = 'synonym-item';

          const playBtn = document.createElement('button');
          playBtn.className = 'synonym-play-btn audio-play-btn';
          const synWordEncoded = encodeURIComponent(syn.word);
          const synBtnId = `play-btn-syn-${syn.word.replace(/[^a-zA-Z0-9]/g, '-')}`;
          playBtn.id = synBtnId;
          playBtn.dataset.action = 'play-word';
          playBtn.dataset.wordEncoded = synWordEncoded;
          playBtn.dataset.buttonId = synBtnId;
          playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg><span class="btn-spinner"></span>`;

          const synWord = document.createElement('span');
          synWord.className = 'synonym-word';
          synWord.textContent = syn.word;

          synItem.appendChild(playBtn);
          synItem.appendChild(synWord);
          synList.appendChild(synItem);
        }
      }
    });

    synSection.appendChild(synList);
    ui.list.appendChild(synSection);
  }

  // Render antonyms
  if (hasAntonyms) {
    const antSection = document.createElement('div');
    antSection.className = 'antonyms-section';

    const antLabel = document.createElement('div');
    antLabel.className = 'antonyms-label';
    antLabel.textContent = 'Antonyms';
    antSection.appendChild(antLabel);

    const antList = document.createElement('div');
    antList.className = 'antonyms-list';

    card.antonyms.forEach(ant => {
      // Check if antonym has items (multiple definitions)
      if (ant.items && ant.items.length > 0) {
        // Create container for the whole antonym with items
        const antContainer = document.createElement('div');
        antContainer.className = 'antonym-with-items';

        // Create main antonym item (word only)
        const antMainItem = document.createElement('div');
        antMainItem.className = 'antonym-main';

        const playBtn = document.createElement('button');
        playBtn.className = 'antonym-play-btn audio-play-btn';
        const antWordEncoded = encodeURIComponent(ant.word);
        const antBtnId = `play-btn-ant-${ant.word.replace(/[^a-zA-Z0-9]/g, '-')}`;
        playBtn.id = antBtnId;
        playBtn.dataset.action = 'play-word';
        playBtn.dataset.wordEncoded = antWordEncoded;
        playBtn.dataset.buttonId = antBtnId;
        playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg><span class="btn-spinner"></span>`;

        const antWord = document.createElement('span');
        antWord.className = 'antonym-word';
        if (ant.ipa) {
          antWord.textContent = `${ant.word} ${ant.ipa}`;
        } else {
          antWord.textContent = ant.word;
        }

        antMainItem.appendChild(playBtn);
        antMainItem.appendChild(antWord);
        antContainer.appendChild(antMainItem);

        // Create sub-items for each definition (indented)
        const antSubList = document.createElement('div');
        antSubList.className = 'antonym-sub-items';

        ant.items.forEach(item => {
          const subItem = document.createElement('div');
          subItem.className = 'antonym-sub-item';

          let subText = '';
          if (item.en && item.en.trim() !== '') {
            subText += item.en;
          }
          if (item.cn && item.cn.trim() !== '') {
            if (subText) subText += ' ';
            subText += item.cn;
          }

          subItem.textContent = subText;
          antSubList.appendChild(subItem);
        });

        antContainer.appendChild(antSubList);
        antList.appendChild(antContainer);
      } else {
        // Simple antonym - single line
        const antItem = document.createElement('span');
        antItem.className = 'antonym-item';

        const playBtn = document.createElement('button');
        playBtn.className = 'antonym-play-btn audio-play-btn';
        const antWordEncoded = encodeURIComponent(ant.word);
        const antBtnId = `play-btn-ant-${ant.word.replace(/[^a-zA-Z0-9]/g, '-')}`;
        playBtn.id = antBtnId;
        playBtn.dataset.action = 'play-word';
        playBtn.dataset.wordEncoded = antWordEncoded;
        playBtn.dataset.buttonId = antBtnId;
        playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg><span class="btn-spinner"></span>`;

        const antWord = document.createElement('span');
        antWord.className = 'antonym-word';

        let antDisplay = ant.word;
        if (ant.ipa && ant.ipa.trim() !== '') {
          antDisplay += ` ${ant.ipa}`;
        }
        if (ant.pos && ant.pos.trim() !== '') {
          antDisplay += ` ${ant.pos}`;
        }
        if (ant.cn && ant.cn.trim() !== '') {
          antDisplay += ` ${ant.cn}`;
        }

        antWord.textContent = antDisplay;
        antItem.appendChild(playBtn);
        antItem.appendChild(antWord);
        antList.appendChild(antItem);
      }
    });

    antSection.appendChild(antList);
    ui.list.appendChild(antSection);
  }
}

/**
 * Render action buttons for input mode
 */
export function renderInputActions(ui) {
  renderInputActionsModule(ui);
}

/**
 * Render action buttons for recall mode
 */
export function renderRecallActions(ui) {
  renderRecallActionsModule(ui);
}

/**
 * Render confirmation actions
 */
export function renderConfirmationActions(ui) {
  renderConfirmationActionsModule(ui);
}

/**
 * Render next action button
 */
export function renderNextAction(ui) {
  renderNextActionModule(ui);
}

/**
 * Reveal Chinese text
 */
export function reveal(el) {
  if (STATE.mode === 'recall') {
    el.classList.add('revealed');
  }
}

/**
 * Reveal all Chinese texts
 */
export function revealAll() {
  document.querySelectorAll('.cn-text, .en-text, .blur-target').forEach(el => el.classList.add('revealed'));
  const synonymsSection = document.querySelector('.synonyms-section');
  if (synonymsSection) {
    synonymsSection.classList.add('revealed');
  }
  const itemList = document.querySelector('.item-list');
  if (itemList) {
    itemList.classList.add('revealed');
  }
}

/**
 * Show sentence translation
 */
export function showSentenceTranslation(ui) {
  const cnDiv = document.getElementById('sentenceCn');
  if (cnDiv) {
    cnDiv.style.display = 'block';
    // Add 'revealed' class to remove blur and opacity effects in recall mode
    cnDiv.classList.add('revealed');
  }

  const card = StateManager.getCurrentCard();
  if (card && card.type === 'sentence') {
    if (STATE.mode === 'input') {
      renderInputActions(ui);
    } else {
      renderRecallActions(ui);
    }
  }
}

/**
 * Update current file display in header
 */
export function updateCurrentFileDisplay(ui, path) {
  const pathParts = path.split('/');
  const fileName = pathParts.pop().replace('.md', '');
  const directory = pathParts.length > 0 ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1) : '';
  const displayText = directory ? `${directory} / ${fileName}` : fileName;

  ui.currentFileDisplay.textContent = displayText;

  const fileTitleText = document.getElementById('fileTitleText');
  if (fileTitleText) {
    fileTitleText.textContent = displayText;
  }
}

/**
 * Update auto-play button state
 */
export function updateAutoPlayButton(ui) {
  if (STATE.autoPlay) {
    ui.btnAutoPlay.classList.add('active');
    ui.iconAutoPlayOff.classList.add('hidden');
    ui.iconAutoPlayOn.classList.remove('hidden');
  } else {
    ui.btnAutoPlay.classList.remove('active');
    ui.iconAutoPlayOff.classList.remove('hidden');
    ui.iconAutoPlayOn.classList.add('hidden');
  }
}

/**
 * Update mode button state
 */
export function updateModeButtons(ui) {
  if (STATE.mode === 'input') {
    ui.btnInput.classList.add('active');
    ui.btnRecall.classList.remove('active');
  } else {
    ui.btnInput.classList.remove('active');
    ui.btnRecall.classList.add('active');
  }
}

/**
 * Update body class for recall mode styling
 */
export function updateBodyModeClass() {
  if (STATE.mode === 'recall') {
    document.body.classList.add('mode-recall');
  } else {
    document.body.classList.remove('mode-recall');
  }
}

/**
 * Update order mode select dropdown
 */
export function updateOrderModeSelect(ui) {
  const select = document.getElementById('orderModeSelect');
  const label = document.getElementById('orderModeLabel');
  if (!select || !label) return;

  const options = select.querySelectorAll('.custom-select-option');
  const activeOption = select.querySelector(`[data-value="${STATE.orderMode}"]`);
  if (!activeOption) return;

  label.textContent = activeOption.textContent;
  options.forEach((opt) => opt.classList.remove('selected'));
  activeOption.classList.add('selected');
}

/**
 * Show toast notification
 */
export function showToast(ui, msg) {
  const t = document.getElementById('toast');
  if (!t) {
    return;
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

/**
 * Trigger confetti animation
 */
export function triggerConfetti() {
  // Simple confetti effect using emojis
  const emojis = ['🎉', '🎊', '✨', '⭐', '🌟', '💫', '🎈', '🎁'];

  // Use the main workspace as container (not body, to avoid position issues)
  const container = document.querySelector('main');
  if (!container) return;

  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      confetti.style.cssText = `
        position: absolute;
        font-size: ${Math.random() * 20 + 15}px;
        left: ${Math.random() * 100}%;
        top: 0px;
        animation: fall-new ${Math.random() * 2 + 2}s linear forwards;
        pointer-events: none;
        z-index: 1000;
      `;
      container.appendChild(confetti);

      setTimeout(() => confetti.remove(), 4000);
    }, i * 50);
  }

  // Add animation keyframes if not exists
  if (!document.getElementById('confetti-style-fixed')) {
    const style = document.createElement('style');
    style.id = 'confetti-style-fixed';
    style.textContent = `
      @keyframes fall-new {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(80vh) rotate(720deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Show completion screen when all cards are finished
 */
export function showCompletionScreen(ui) {
  renderCompletionScreen(ui, {
    state: STATE,
    stateManager: StateManager,
    triggerConfetti
  });
}
