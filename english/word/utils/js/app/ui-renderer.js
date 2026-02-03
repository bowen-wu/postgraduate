/**
 * UI Renderer Module
 * Handles all UI rendering operations including cards, buttons, and panels
 */

import { STATE } from '../config.js';
import * as StateManager from './state-manager.js';

/**
 * Main render function - renders the current card
 */
export function render(ui) {
  if (STATE.cards.length === 0) return;
  const card = STATE.cards[STATE.currentIndex];

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
  ui.progress.textContent = `${STATE.currentIndex + 1} / ${STATE.cards.length}`;

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
      window.app.playWord(card.word, 'play-btn-main', false, false);
    }, 300);
  }

  // Update prev button disabled state
  ui.btnPrev.disabled = STATE.currentIndex === 0;
}

/**
 * Render word/phrase with play button
 */
function renderWord(ui, card) {
  const wordEscaped = card.word.replace(/'/g, '\\\'');
  const playButtonId = `play-btn-main`;
  const playButton = `<button id="${playButtonId}" class="btn-ghost audio-play-btn" onclick="app.playWord('${wordEscaped}', '${playButtonId}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" title="播放发音">
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
        li.innerHTML = `<div class="cn-text" onclick="app.reveal(this)" data-has-cn="true" style="border-left: none; padding-left: 0;">${cnDisplay}</div>`;
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
      cnHtml = `<div class="cn-text" onclick="app.reveal(this)" data-has-cn="true">${cnDisplay}</div>`;
    }

    if (hasPOS || !hasCn) {
      const isPhraseItself = card.type === 'phrase' && item.en === card.word;

      if (isPhraseItself && !hasCn) {
        return;
      }

      if (isPhraseItself && hasCn) {
        li.innerHTML = `<div class="cn-text" onclick="app.reveal(this)" data-has-cn="true">${cnDisplay}</div>`;
      } else {
        li.innerHTML = `
          <span class="item-tag tag-def ${STATE.mode === 'recall' ? 'blur-target' : ''}"></span>
          <div class="en-text ${STATE.mode === 'recall' ? 'blur-target' : ''}">${cleanEn}</div>
          ${cnHtml}
        `;
      }
    } else {
      li.innerHTML = `<div class="cn-text" onclick="app.reveal(this)" data-has-cn="true" style="border-left: none; padding-left: 0;">${cnDisplay}</div>`;
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
  const wordEscaped = card.word.replace(/'/g, '\\\'');
  // Use a different ID for phrase cards to avoid conflict with header button
  const playButtonId = `play-btn-phrase`;
  const playButton = `<button id="${playButtonId}" class="btn-ghost audio-play-btn" onclick="app.playWord('${wordEscaped}', '${playButtonId}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" title="播放发音">
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

  // Render definitions
  const items = card.items;
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'item';
    const hasCn = item.cn && item.cn.trim && item.cn.trim() !== '';
    if (hasCn) {
      li.innerHTML = `<div class="cn-text" onclick="app.reveal(this)" data-has-cn="true">${item.cn}</div>`;
    }
    ui.list.appendChild(li);
  });

  // 🔧 FIX: Render synonyms and antonyms for phrase cards
  renderSynonymsAndAntonyms(ui, card);
}

/**
 * Render sentence items
 */
function renderSentenceItems(ui, card) {
  const li = document.createElement('li');
  li.className = 'item';

  const labelDiv = document.createElement('div');
  labelDiv.className = 'sentence-label';
  labelDiv.textContent = 'Example Sentence';
  ui.list.appendChild(labelDiv);

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
        const synWordEscaped = syn.word.replace(/'/g, '\\\'');
        const synBtnId = `play-btn-syn-${syn.word.replace(/[^a-zA-Z0-9]/g, '-')}`;
        playBtn.id = synBtnId;
        playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg><span class="btn-spinner"></span>`;
        playBtn.onclick = () => window.app.playWord(synWordEscaped, synBtnId);

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
          const synWordEscaped = syn.word.replace(/'/g, '\\\'');
          const synBtnId = `play-btn-syn-${syn.word.replace(/[^a-zA-Z0-9]/g, '-')}`;
          playBtn.id = synBtnId;
          playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg><span class="btn-spinner"></span>`;
          playBtn.onclick = () => window.app.playWord(synWordEscaped, synBtnId);

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
          const synWordEscaped = syn.word.replace(/'/g, '\\\'');
          const synBtnId = `play-btn-syn-${syn.word.replace(/[^a-zA-Z0-9]/g, '-')}`;
          playBtn.id = synBtnId;
          playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg><span class="btn-spinner"></span>`;
          playBtn.onclick = () => window.app.playWord(synWordEscaped, synBtnId);

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
      const antItem = document.createElement('span');
      antItem.className = 'antonym-item';

      const playBtn = document.createElement('button');
      playBtn.className = 'antonym-play-btn audio-play-btn';
      const antWordEscaped = ant.word.replace(/'/g, '\\\'');
      const antBtnId = `play-btn-ant-${ant.word.replace(/[^a-zA-Z0-9]/g, '-')}`;
      playBtn.id = antBtnId;
      playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg><span class="btn-spinner"></span>`;
      playBtn.onclick = () => window.app.playWord(antWordEscaped, antBtnId);

      const antWord = document.createElement('span');
      antWord.className = 'antonym-word';

      let antDisplay = ant.word;
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
    });

    antSection.appendChild(antList);
    ui.list.appendChild(antSection);
  }
}

/**
 * Render action buttons for input mode
 */
export function renderInputActions(ui) {
  const card = STATE.cards[STATE.currentIndex];

  // For sentence cards with Chinese translation
  if (card.type === 'sentence') {
    const hasChinese = card.items[0].cn && typeof card.items[0].cn.trim === 'function' && card.items[0].cn.trim() !== '';

    if (hasChinese) {
      const cnDiv = document.getElementById('sentenceCn');
      const isCnVisible = cnDiv && cnDiv.style.display !== 'none';

      if (!isCnVisible) {
        ui.actionArea.innerHTML = `
          <button class="btn-primary" onclick="app.showSentenceTranslation()">查看译文 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
        `;
      } else {
        ui.actionArea.innerHTML = `<button class="btn-primary" onclick="app.nextCard()">下一个 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>`;
      }
      return;
    }
  }

  // Browse mode: show next button for all card types
  ui.actionArea.innerHTML = `<button class="btn-primary" onclick="app.nextCard()">下一个 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>`;
}

/**
 * Render action buttons for recall mode
 */
export function renderRecallActions(ui) {
  const card = STATE.cards[STATE.currentIndex];

  // For sentence cards with Chinese translation
  if (card.type === 'sentence') {
    const hasChinese = card.items[0].cn && typeof card.items[0].cn.trim === 'function' && card.items[0].cn.trim() !== '';

    if (!hasChinese) {
      renderNextAction(ui);
      return;
    }

    const cnDiv = document.getElementById('sentenceCn');
    const isCnVisible = cnDiv && cnDiv.style.display !== 'none';

    if (!isCnVisible) {
      ui.actionArea.innerHTML = `
        <button class="btn-ghost" onclick="app.nextCard()">跳过</button>
        <button class="btn-primary" onclick="app.showSentenceTranslation()">查看译文</button>
      `;
    } else {
      ui.actionArea.innerHTML = `
        <button class="btn-danger" onclick="app.handleSentenceRecall(false)">理解错误</button>
        <button class="btn-success" onclick="app.handleSentenceRecall(true)">理解正确</button>
      `;
    }
    return;
  }

  // For word cards or phrases
  const hasChinese = card.items && card.items.some(item =>
    item.cn && item.cn.trim && item.cn.trim() !== ''
  );

  if (!hasChinese) {
    renderNextAction(ui);
    return;
  }

  ui.actionArea.innerHTML = `
    <button class="btn-success" onclick="app.handleRecall(true)">记得</button>
    <button class="btn-danger" onclick="app.handleRecall(false)">不记得</button>
  `;
}

/**
 * Render confirmation actions
 */
export function renderConfirmationActions(ui) {
  ui.actionArea.innerHTML = `
    <button class="btn-danger" onclick="app.confirmRecall(false)">其实不会</button>
    <button class="btn-success" onclick="app.confirmRecall(true)">确认掌握</button>
  `;
}

/**
 * Render next action button
 */
export function renderNextAction(ui) {
  ui.actionArea.innerHTML = `<button class="btn-primary" onclick="app.nextCard()">下一个</button>`;
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

  const card = STATE.cards[STATE.currentIndex];
  if (card.type === 'sentence') {
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
 * Show toast notification
 */
export function showToast(ui, msg) {
  const t = document.getElementById('toast');
  if (!t) {
    console.warn('Toast element not found, skipping toast notification');
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
  // End session and get statistics
  StateManager.endSession();
  const stats = StateManager.getSessionStats();

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '--';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Store original card content to restore later
  window._originalCardContent = ui.card.innerHTML;

  // Add mobile responsive CSS if not exists
  if (!document.getElementById('completion-mobile-style')) {
    const style = document.createElement('style');
    style.id = 'completion-mobile-style';
    style.textContent = `
      @media (max-width: 480px) {
        .completion-container {
          padding: 1rem !important;
        }
        .completion-emoji {
          font-size: 2.5rem !important;
        }
        .completion-title {
          font-size: 1.25rem !important;
        }
        .completion-stats-grid {
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 0.5rem !important;
        }
        .completion-stats-value {
          font-size: 1.25rem !important;
        }
        .completion-stats-label {
          font-size: 0.7rem !important;
        }
        .completion-progress-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 0.75rem !important;
        }
        .completion-progress-value {
          font-size: 1.1rem !important;
        }
        .completion-time-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 0.75rem !important;
        }
        .completion-time-value {
          font-size: 1.1rem !important;
        }
        .completion-time-detail {
          font-size: 0.65rem !important;
          flex-direction: column !important;
          gap: 0.25rem !important;
        }
        .completion-buttons {
          flex-direction: column !important;
          width: 100% !important;
        }
        .completion-buttons button {
          width: 100% !important;
          padding: 0.75rem !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Show completion screen with enhanced stats - using scrollable container with CSS classes
  ui.card.innerHTML = `
    <div class="completion-container" style="height: 100%; overflow-y: auto; padding: 1.5rem;">
      <div style="text-align: center; padding-bottom: 1rem;">
        <div class="completion-emoji" style="font-size: 3rem; margin-bottom: 0.5rem;">🎉</div>
        <h2 class="completion-title" style="font-size: 1.5rem; color: var(--primary); margin-bottom: 0.5rem;">完结撒花！</h2>
        <p style="font-size: 1rem; color: var(--text-sub); margin-bottom: 1.5rem;">
          恭喜你完成了本单元学习！
        </p>
      </div>

      <!-- Main Stats Grid -->
      <div style="background: var(--card-bg); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
        <div class="completion-stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
          <div style="text-align: center;">
            <div class="completion-stats-value" style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${stats.totalCards}</div>
            <div class="completion-stats-label" style="font-size: 0.75rem; color: var(--text-sub);">总卡片</div>
          </div>
          <div style="text-align: center;">
            <div class="completion-stats-value" style="font-size: 1.5rem; font-weight: 700; color: var(--danger);">${stats.totalErrors}</div>
            <div class="completion-stats-label" style="font-size: 0.75rem; color: var(--text-sub);">错误次数</div>
          </div>
          <div style="text-align: center;">
            <div class="completion-stats-value" style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${stats.accuracy}%</div>
            <div class="completion-stats-label" style="font-size: 0.75rem; color: var(--text-sub);">正确率</div>
          </div>
        </div>
      </div>

      <!-- Learning Progress Stats -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid #bbf7d0;">
        <div class="completion-progress-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
          <div style="text-align: left;">
            <div style="font-size: 0.75rem; color: #166534; margin-bottom: 0.25rem; font-weight: 600;">✅ 一次掌握</div>
            <div class="completion-progress-value" style="font-size: 1.25rem; font-weight: 700; color: #16a34a;">${stats.cardsMastered}</div>
          </div>
          <div style="text-align: left;">
            <div style="font-size: 0.75rem; color: #991b1b; margin-bottom: 0.25rem; font-weight: 600;">🔄 需复习</div>
            <div class="completion-progress-value" style="font-size: 1.25rem; font-weight: 700; color: #dc2626;">${stats.cardsNeedingReview}</div>
          </div>
        </div>
      </div>

      <!-- Time Stats -->
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid #fcd34d;">
        <div class="completion-time-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
          <div style="text-align: left;">
            <div style="font-size: 0.75rem; color: #92400e; margin-bottom: 0.25rem; font-weight: 600;">⏱️ 学习时长</div>
            <div class="completion-time-value" style="font-size: 1.25rem; font-weight: 700; color: #d97706;">${StateManager.formatDuration(stats.duration)}</div>
          </div>
          <div style="text-align: left;">
            <div style="font-size: 0.75rem; color: #92400e; margin-bottom: 0.25rem; font-weight: 600;">📊 平均每卡</div>
            <div class="completion-time-value" style="font-size: 1.25rem; font-weight: 700; color: #d97706;">${StateManager.formatDuration(stats.avgTimePerCard)}</div>
          </div>
        </div>
        <div class="completion-time-detail" style="margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px dashed #fbbf24; font-size: 0.7rem; color: #78350f; display: flex; justify-content: space-between;">
          <span>🕐 ${formatTime(stats.startTime)}</span>
          <span>🏁 ${formatTime(stats.endTime)}</span>
        </div>
      </div>

      <div class="completion-buttons" style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; padding-top: 0.5rem;">
        <button class="btn-primary" onclick="app.restart()" style="font-size: 1rem; padding: 0.6rem 1.5rem;">
          🔄 重新开始
        </button>
        <button class="btn-ghost" onclick="app.clearDataAndReload()" style="font-size: 1rem; padding: 0.6rem 1.5rem;">
          🗑️ 清除进度
        </button>
      </div>
    </div>
  `;

  // Hide action area and update progress (matching review.html)
  ui.actionArea.innerHTML = '';
  ui.progress.textContent = `${stats.totalCards} / ${stats.totalCards}`;

  // Trigger confetti animation
  triggerConfetti();
}
