import { STATE } from '../../config.js';

function renderWord(ui, card) {
  const encodedWord = encodeURIComponent(card.word);
  const playButtonId = 'play-btn-main';
  const playButton = `<button id="${playButtonId}" class="btn-ghost audio-play-btn" data-action="play-word" data-word-encoded="${encodedWord}" data-button-id="${playButtonId}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" title="播放发音">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
    <span class="btn-spinner"></span>
  </button>`;

  const ipaHtml = (card.ipa && card.ipa.trim())
    ? `<span class="pronunciation-inline ${STATE.mode === 'recall' ? 'blur-target' : ''}" style="margin: 0;padding: 0;">${card.ipa}</span>`
    : '';

  ui.word.innerHTML = `<span>${card.word}</span> ${playButton} ${ipaHtml}`;
  ui.ipa.textContent = '';
  ui.ipa.style.display = 'none';
}

function renderBadges(ui, card, stats) {
  let bHtml = '';
  if (card.type === 'word') bHtml += '<span class="badge badge-word">单词</span>';
  else if (card.type === 'phrase') bHtml += '<span class="badge badge-rel">词组</span>';
  else if (card.type === 'prefix') bHtml += '<span class="badge badge-pre">前缀/后缀</span>';
  else if (card.type === 'sentence') bHtml += '<span class="badge badge-sent">例句</span>';
  if (stats.errors > 0) bHtml += `<span class="badge badge-err">错 ${stats.errors}</span>`;
  ui.badges.innerHTML = bHtml;
}

function renderPhraseItems(ui, card) {
  const encodedWord = encodeURIComponent(card.word);
  const playButtonId = 'play-btn-phrase';
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

  const stats = STATE.stats[card.id] || { errors: 0 };
  let bHtml = '';
  if (card.type === 'word') bHtml += '<span class="badge badge-word">单词</span>';
  else if (card.type === 'phrase') bHtml += '<span class="badge badge-rel">词组</span>';
  else if (card.type === 'prefix') bHtml += '<span class="badge badge-pre">前缀/后缀</span>';
  else if (card.type === 'sentence') bHtml += '<span class="badge badge-sent">例句</span>';
  if (stats.errors > 0) bHtml += `<span class="badge badge-err">错 ${stats.errors}</span>`;

  if (bHtml) {
    const badgesDiv = document.createElement('div');
    badgesDiv.className = 'badges-container';
    badgesDiv.innerHTML = bHtml;
    wrapper.appendChild(badgesDiv);
  }

  ui.list.appendChild(wrapper);

  const hasAnyChinese = card.items && card.items.some((item) => item.cn && item.cn.trim && item.cn.trim() !== '');
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

  card.items.forEach((item) => {
    const hasCn = item.cn && item.cn.trim && item.cn.trim() !== '';
    if (hasCn) {
      const li = document.createElement('li');
      li.className = 'item';
      li.innerHTML = `<div class="cn-text" data-action="reveal" data-has-cn="true">${item.cn}</div>`;
      ui.list.appendChild(li);
    }
  });

  renderSynonymsAndAntonyms(ui, card);
}

function renderSentenceItems(ui, card) {
  const li = document.createElement('li');
  li.className = 'item';

  const sentenceText = card.items[0]?.en || card.displayWord || '';
  const sentenceTextEncoded = encodeURIComponent(sentenceText);
  const playButtonId = 'play-btn-sentence';

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
    ui.list.appendChild(patternsDiv);
  }

  const contentDiv = document.createElement('div');
  contentDiv.className = 'sentence-content';
  contentDiv.innerHTML = card.displayWord || card.items[0].en;
  ui.list.appendChild(contentDiv);

  const item = card.items[0];
  const hasChinese = item.cn && typeof item.cn.trim === 'function' && item.cn.trim() !== '';
  if (hasChinese) {
    const cnDiv = document.createElement('div');
    cnDiv.className = 'sentence-cn';
    cnDiv.id = 'sentenceCn';
    cnDiv.textContent = item.cn;
    cnDiv.style.display = 'none';
    ui.list.appendChild(cnDiv);
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
        翻译
        <span class="btn-spinner"></span>
      </button>
    `;
    ui.list.appendChild(translateDiv);
  }

  ui.list.appendChild(li);
}

function renderSynonymsAndAntonyms(ui, card) {
  const hasSynonyms = card.synonyms && card.synonyms.length > 0;
  const hasAntonyms = card.antonyms && card.antonyms.length > 0;
  if (!hasSynonyms && !hasAntonyms) return;

  if (hasSynonyms) {
    const synSection = document.createElement('div');
    synSection.className = 'synonyms-section';
    const synLabel = document.createElement('div');
    synLabel.className = 'synonyms-label';
    synLabel.textContent = 'Synonyms';
    synSection.appendChild(synLabel);

    const synList = document.createElement('div');
    synList.className = 'synonyms-list';
    card.synonyms.forEach((syn) => {
      if (syn.items && syn.items.length > 0) {
        const synContainer = document.createElement('div');
        synContainer.className = 'synonym-with-items';

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
        playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span class="btn-spinner"></span>';

        const synWord = document.createElement('span');
        synWord.className = 'synonym-word';
        synWord.textContent = syn.word;
        synMainItem.appendChild(playBtn);
        synMainItem.appendChild(synWord);
        synContainer.appendChild(synMainItem);

        const synSubList = document.createElement('div');
        synSubList.className = 'synonym-sub-items';
        syn.items.forEach((item) => {
          const subItem = document.createElement('div');
          subItem.className = 'synonym-sub-item';
          let subText = '';
          if (item.en && item.en.trim() !== '') subText += item.en;
          if (item.cn && item.cn.trim() !== '') subText += subText ? ` ${item.cn}` : item.cn;
          subItem.textContent = subText;
          synSubList.appendChild(subItem);
        });
        synContainer.appendChild(synSubList);
        synList.appendChild(synContainer);
      } else {
        const hasDefinition = (syn.pos && syn.pos.trim() !== '') || (syn.cn && syn.cn.trim() !== '');
        if (hasDefinition) {
          const synContainer = document.createElement('div');
          synContainer.className = 'synonym-with-items';
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
          playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span class="btn-spinner"></span>';

          const synWord = document.createElement('span');
          synWord.className = 'synonym-word';
          synWord.textContent = syn.word;
          synMainItem.appendChild(playBtn);
          synMainItem.appendChild(synWord);
          synContainer.appendChild(synMainItem);

          const synSubList = document.createElement('div');
          synSubList.className = 'synonym-sub-items';
          const subItem = document.createElement('div');
          subItem.className = 'synonym-sub-item';
          let subText = '';
          if (syn.pos && syn.pos.trim() !== '') subText += syn.pos;
          if (syn.cn && syn.cn.trim() !== '') subText += subText ? ` ${syn.cn}` : syn.cn;
          subItem.textContent = subText;
          synSubList.appendChild(subItem);
          synContainer.appendChild(synSubList);
          synList.appendChild(synContainer);
        } else {
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
          playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span class="btn-spinner"></span>';
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

  if (hasAntonyms) {
    const antSection = document.createElement('div');
    antSection.className = 'antonyms-section';
    const antLabel = document.createElement('div');
    antLabel.className = 'antonyms-label';
    antLabel.textContent = 'Antonyms';
    antSection.appendChild(antLabel);

    const antList = document.createElement('div');
    antList.className = 'antonyms-list';
    card.antonyms.forEach((ant) => {
      if (ant.items && ant.items.length > 0) {
        const antContainer = document.createElement('div');
        antContainer.className = 'antonym-with-items';
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
        playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span class="btn-spinner"></span>';

        const antWord = document.createElement('span');
        antWord.className = 'antonym-word';
        antWord.textContent = ant.ipa ? `${ant.word} ${ant.ipa}` : ant.word;
        antMainItem.appendChild(playBtn);
        antMainItem.appendChild(antWord);
        antContainer.appendChild(antMainItem);

        const antSubList = document.createElement('div');
        antSubList.className = 'antonym-sub-items';
        ant.items.forEach((item) => {
          const subItem = document.createElement('div');
          subItem.className = 'antonym-sub-item';
          let subText = '';
          if (item.en && item.en.trim() !== '') subText += item.en;
          if (item.cn && item.cn.trim() !== '') subText += subText ? ` ${item.cn}` : item.cn;
          subItem.textContent = subText;
          antSubList.appendChild(subItem);
        });
        antContainer.appendChild(antSubList);
        antList.appendChild(antContainer);
      } else {
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
        playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span class="btn-spinner"></span>';

        const antWord = document.createElement('span');
        antWord.className = 'antonym-word';
        let antDisplay = ant.word;
        if (ant.ipa && ant.ipa.trim() !== '') antDisplay += ` ${ant.ipa}`;
        if (ant.pos && ant.pos.trim() !== '') antDisplay += ` ${ant.pos}`;
        if (ant.cn && ant.cn.trim() !== '') antDisplay += ` ${ant.cn}`;
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

function renderItems(ui, card) {
  ui.list.innerHTML = '';

  if (card.type === 'phrase') {
    renderPhraseItems(ui, card);
    return;
  }

  if (card.type === 'sentence') {
    renderSentenceItems(ui, card);
    return;
  }

  card.items.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'item';

    if (!item.en) {
      if (item.cn && item.cn.trim && item.cn.trim() !== '') {
        let cnDisplay = item.cn;
        if (idx === 0 && card.emoji) cnDisplay = `${card.emoji} ${cnDisplay}`;
        li.innerHTML = `<div class="cn-text" data-action="reveal" data-has-cn="true" style="border-left: none; padding-left: 0;">${cnDisplay}</div>`;
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
      cnHtml = `<div class="cn-text" data-action="reveal" data-has-cn="true">${cnDisplay}</div>`;
    }

    if (hasPOS || !hasCn) {
      const isPhraseItself = card.type === 'phrase' && item.en === card.word;
      if (isPhraseItself && !hasCn) return;
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

  renderSynonymsAndAntonyms(ui, card);
}

export function renderCardContent(ui, card, stats) {
  renderWord(ui, card);
  renderBadges(ui, card, stats);
  renderItems(ui, card);
}
