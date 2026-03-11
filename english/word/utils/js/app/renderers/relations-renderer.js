import { STATE } from '../../config.js';

export function withRecallBlur(className, mode = STATE.mode) {
  if (mode !== 'recall') return className;
  if (className.includes('blur-target')) return className;
  return `${className} blur-target`;
}

export function renderSynonymsAndAntonyms(ui, card) {
  const hasSynonyms = card.synonyms && card.synonyms.length > 0;
  const hasAntonyms = card.antonyms && card.antonyms.length > 0;
  if (!hasSynonyms && !hasAntonyms) return;

  if (hasSynonyms) {
    const synSection = document.createElement('div');
    synSection.className = 'synonyms-section';
    const synLabel = document.createElement('div');
    synLabel.className = withRecallBlur('synonyms-label');
    synLabel.textContent = 'Synonyms';
    synSection.appendChild(synLabel);

    const synList = document.createElement('div');
    synList.className = 'synonyms-list';
    card.synonyms.forEach((syn) => {
      if (syn.items && syn.items.length > 0) {
        const synContainer = document.createElement('div');
        synContainer.className = 'synonym-with-items';
        const synMainItem = document.createElement('div');
        synMainItem.className = withRecallBlur('synonym-main');

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
        synSubList.className = withRecallBlur('synonym-sub-items');
        syn.items.forEach((item) => {
          const subItem = document.createElement('div');
          subItem.className = withRecallBlur('synonym-sub-item');
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
          synMainItem.className = withRecallBlur('synonym-main');

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
          synSubList.className = withRecallBlur('synonym-sub-items');
          const subItem = document.createElement('div');
          subItem.className = withRecallBlur('synonym-sub-item');
          let subText = '';
          if (syn.pos && syn.pos.trim() !== '') subText += syn.pos;
          if (syn.cn && syn.cn.trim() !== '') subText += subText ? ` ${syn.cn}` : syn.cn;
          subItem.textContent = subText;
          synSubList.appendChild(subItem);
          synContainer.appendChild(synSubList);
          synList.appendChild(synContainer);
        } else {
          const synItem = document.createElement('span');
          synItem.className = withRecallBlur('synonym-item');
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
    antLabel.className = withRecallBlur('antonyms-label');
    antLabel.textContent = 'Antonyms';
    antSection.appendChild(antLabel);

    const antList = document.createElement('div');
    antList.className = 'antonyms-list';
    card.antonyms.forEach((ant) => {
      if (ant.items && ant.items.length > 0) {
        const antContainer = document.createElement('div');
        antContainer.className = 'antonym-with-items';
        const antMainItem = document.createElement('div');
        antMainItem.className = withRecallBlur('antonym-main');

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
        antSubList.className = withRecallBlur('antonym-sub-items');
        ant.items.forEach((item) => {
          const subItem = document.createElement('div');
          subItem.className = withRecallBlur('antonym-sub-item');
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
        antItem.className = withRecallBlur('antonym-item');
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
