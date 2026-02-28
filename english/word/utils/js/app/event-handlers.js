/**
 * Event Handlers Module
 * Handles all user interaction events and file operations
 */

import { CONFIG, STATE } from '../config.js';
import { GitHubApi } from '../api/github.js';
import { MarkdownParser } from '../parser/index.js';
import * as StateManager from './state-manager.js';
import * as UiRenderer from './ui-renderer.js';

/**
 * Set application mode
 */
export function setMode(newMode) {
  STATE.mode = newMode;
  UiRenderer.updateModeButtons(window.app.ui);
  UiRenderer.updateBodyModeClass();
  StateManager.saveState();
  window.app.render();
}

/**
 * Set order mode (sequential, randomByType, randomAll)
 */
export function setOrderMode(mode) {
  if (mode === STATE.orderMode) return;

  StateManager.setOrderMode(mode);
  UiRenderer.updateOrderModeSelect(window.app.ui);
  window.app.render();
  StateManager.updateStatsUI(window.app.ui);

  const modeNames = {
    'sequential': '顺序',
    'randomByType': '随机(按类型)',
    'randomAll': '完全随机'
  };
  UiRenderer.showToast(window.app.ui, `顺序模式: ${modeNames[mode]}`);
}

/**
 * Toggle auto-play
 */
export function toggleAutoPlay() {
  STATE.autoPlay = !STATE.autoPlay;
  UiRenderer.updateAutoPlayButton(window.app.ui);
  StateManager.saveState();
  UiRenderer.showToast(window.app.ui, STATE.autoPlay ? '自动播放已开启' : '自动播放已关闭');
}

/**
 * Handle recall in recall mode
 */
export function handleRecall(claimedKnown) {
  // Always reveal definitions first
  UiRenderer.revealAll();
  if (!claimedKnown) {
    recordError();
    UiRenderer.showToast(window.app.ui, '已记录不记得');
    UiRenderer.renderNextAction(window.app.ui);
  } else {
    UiRenderer.renderConfirmationActions(window.app.ui);
  }
}

/**
 * Confirm recall result
 */
export function confirmRecall(actuallyCorrect) {
  if (actuallyCorrect) {
    UiRenderer.showToast(window.app.ui, '正确！');
  } else {
    recordError();
    UiRenderer.showToast(window.app.ui, '已记录错误');
  }
  nextCard();
}

/**
 * Record error for current card
 */
export function recordError() {
  const card = StateManager.getCurrentCard();
  if (!card) return;

  if (!STATE.stats[card.id]) STATE.stats[card.id] = {errors: 0};
  STATE.stats[card.id].errors++;
  StateManager.saveState();
  StateManager.updateStatsUI(window.app.ui);

  const stats = STATE.stats[card.id] || {errors: 0};
  let bHtml = document.getElementById('displayBadges').innerHTML;
  if (!bHtml.includes('错')) {
    bHtml += `<span class="badge badge-err">错 ${stats.errors}</span>`;
    document.getElementById('displayBadges').innerHTML = bHtml;
  }
}

/**
 * Handle sentence recall
 */
export function handleSentenceRecall(understood) {
  if (!understood) {
    recordError();
    UiRenderer.showToast(window.app.ui, '已记录不理解');
  } else {
    UiRenderer.showToast(window.app.ui, '已确认理解');
  }
  nextCard();
}

/**
 * Go to next card
 */
export function nextCard() {
  // Record current card as studied
  const currentCard = StateManager.getCurrentCard();
  if (currentCard) {
    StateManager.recordCardStudied(currentCard.id);
  }

  if (STATE.currentIndex < STATE.displayOrder.length - 1) {
    STATE.currentIndex++;
    StateManager.saveState();
    window.app.render();
    StateManager.updateStatsUI(window.app.ui);
  } else {
    UiRenderer.showCompletionScreen(window.app.ui);
  }
}

/**
 * Go to previous card
 */
export function prevCard() {
  if (STATE.currentIndex > 0) {
    STATE.currentIndex--;
    StateManager.saveState();
    window.app.render();
    StateManager.updateStatsUI(window.app.ui);
  } else {
    UiRenderer.showToast(window.app.ui, '已经是第一个卡片了');
  }
}

/**
 * Jump to specific card by display index
 */
export function jumpTo(idx) {
  if (idx >= 0 && idx < STATE.displayOrder.length) {
    STATE.currentIndex = idx;
    StateManager.saveState();
    window.app.render();
    toggleStats(window.app.ui);
  }
}

/**
 * Jump to specific card by original index (for learning list clicks)
 */
export function jumpToOriginal(originalIdx) {
  // Find the position of this card in the display order
  const displayIdx = STATE.displayOrder.indexOf(originalIdx);
  if (displayIdx !== -1) {
    STATE.currentIndex = displayIdx;
    StateManager.saveState();
    window.app.render();
    toggleStats(window.app.ui);
  }
}

/**
 * Toggle file panel
 */
export async function toggleFiles(forceOpen = null, ui = null) {
  if (!ui) ui = window.app.ui;
  const isOpening = forceOpen === true || (forceOpen === null && !ui.filePanel.classList.contains('open'));

  if (forceOpen === true) {
    ui.filePanel.classList.add('open');
  } else if (forceOpen === false) {
    ui.filePanel.classList.remove('open');
  } else {
    ui.filePanel.classList.toggle('open');
  }

  // If panel is being opened, check if file list needs to be loaded
  if (isOpening) {
    // Check if the file list is empty (only has loading message)
    const currentContent = ui.fileListContainer.innerHTML;
    if (!currentContent ||
        currentContent.includes('加载中') ||
        currentContent.includes('加载文件夹') ||
        currentContent.includes('正在加载文件列表')) {
      await loadRootFolders(false, ui);
    }
  }
}

/**
 * Toggle stats panel
 */
export function toggleStats(ui = null) {
  if (!ui) ui = window.app.ui;
  ui.statsPanel.classList.toggle('open');
}

/**
 * Toggle shortcuts dialog
 */
export function toggleShortcuts() {
  const dialog = document.getElementById('shortcutsDialog');
  if (dialog.classList.contains('show')) {
    dialog.classList.remove('show');
  } else {
    dialog.classList.add('show');
  }
}

/**
 * Load root folders
 */
export async function loadRootFolders(forceRefresh = false, ui = null) {
  if (!ui) ui = window.app.ui;
  try {
    // Show loading state in file list container
    ui.fileListContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--secondary);">正在加载文件列表...</div>';

    const {folders, files} = await GitHubApi.fetchFolderContents('', forceRefresh);

    let html = '<div style="padding: 0.5rem;"><strong>📚 选择文件夹:</strong></div>';

    if (folders.length > 0) {
      html += folders.map(folder => `
        <div class="file-item" onclick="app.loadFolder('${folder.name}')">
          <span class="file-icon">📁</span>
          <span class="file-name">${folder.name}</span>
        </div>
      `).join('');
    }

    if (files.length > 0) {
      html += '<div style="padding: 0.5rem; margin-top: 0.5rem; border-top: 1px solid #e2e8f0;"><strong>📄 文件:</strong></div>';
      html += files.map(file => `
        <div class="file-item" onclick="app.selectFile('${file.name}', '${file.name}')">
          <span class="file-icon">📄</span>
          <span class="file-name">${file.name}</span>
        </div>
      `).join('');
    }

    ui.fileListContainer.innerHTML = html;
  } catch (e) {
    ui.fileListContainer.innerHTML = `
      <div style="padding: 1rem; text-align: center; color: var(--danger);">
        <p>加载失败: ${e.message}</p>
        <button class="btn-primary" onclick="app.loadRootFolders()" style="margin-top: 1rem;">重试</button>
      </div>
    `;
  }
}

/**
 * Load folder contents
 */
export async function loadFolder(path, forceRefresh = false, ui = null) {
  if (!ui) ui = window.app.ui;
  try {
    // Show loading state in file list container
    ui.fileListContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--secondary);">正在加载文件列表...</div>';

    const {folders, files} = await GitHubApi.fetchFolderContents(path, forceRefresh);

    let html = '';

    // Add back button
    html += `
      <div class="file-item" onclick="app.loadRootFolders()" style="color: var(--primary);">
        <span class="file-icon">⬅️</span>
        <span class="file-name">返回根目录</span>
      </div>
    `;

    // Add parent folder button if not in root
    if (path.includes('/')) {
      const parentPath = path.split('/').slice(0, -1).join('/');
      html += `
        <div class="file-item" onclick="app.loadFolder('${parentPath}')" style="color: var(--primary);">
          <span class="file-icon">⬆️</span>
          <span class="file-name">上级目录</span>
        </div>
      `;
    }

    html += `<div style="padding: 0.5rem;"><strong>📁 ${path}</strong></div>`;

    if (folders.length > 0) {
      html += folders.map(folder => `
        <div class="file-item" onclick="app.loadFolder('${path}/${folder.name}')">
          <span class="file-icon">📁</span>
          <span class="file-name">${folder.name}</span>
        </div>
      `).join('');
    }

    if (files.length > 0) {
      html += '<div style="padding: 0.5rem; margin-top: 0.5rem; border-top: 1px solid #e2e8f0;"><strong>📄 文件:</strong></div>';
      html += files.map(file => `
        <div class="file-item" onclick="app.selectFile('${path}/${file.name}', '${file.name}')">
          <span class="file-icon">📄</span>
          <span class="file-name">${file.name}</span>
        </div>
      `).join('');
    }

    if (folders.length === 0 && files.length === 0) {
      html += `
        <div style="padding: 1rem; text-align: center; color: var(--secondary);">
          此文件夹为空
        </div>
      `;
    }

    ui.fileListContainer.innerHTML = html;
  } catch (e) {
    ui.fileListContainer.innerHTML = `
      <div style="padding: 1rem; text-align: center; color: var(--danger);">
        <p>加载失败: ${e.message}</p>
        <button class="btn-primary" onclick="app.loadRootFolders()" style="margin-top: 1rem;">返回根目录</button>
      </div>
    `;
  }
}

/**
 * Select file to load
 */
export function selectFile(path, name) {
  if (path === STATE.currentPath) {
    toggleFiles();
    return;
  }

  const hasStarted = STATE.cards.length > 0 && STATE.currentIndex > 0;
  let message = `确定要切换到文件 <span class="highlight">${name}</span> 吗？`;
  if (hasStarted) {
    message += `<br><br>当前文件的学习进度将被保存。`;
  }

  window.app.confirmDialog.show(message, () => confirmSwitchFile(path));
}

/**
 * Confirm and switch file
 */
export async function confirmSwitchFile(path, ui = null) {
  if (!ui) ui = window.app.ui;
  try {
    ui.filePanel.classList.remove('open');

    ui.loader.classList.remove('hidden');
    ui.loader.innerHTML = `
      <div class="spinner"></div>
      <p>正在加载文件...</p>
    `;

    if (STATE.currentPath && STATE.cards.length > 0) {
      StateManager.saveState();
    }

    STATE.cards = [];
    STATE.currentIndex = 0;
    await loadFile(path);

    const fileInfo = document.querySelector('.current-file-info');
    if (fileInfo) {
      fileInfo.innerHTML = `
        <span>📄</span>
        <span>当前文件: <strong>${STATE.currentPath}</strong></span>
      `;
    }
  } catch (e) {
    UiRenderer.showToast(ui, '切换文件失败: ' + e.message);
    ui.filePanel.classList.add('open');
  }
}

/**
 * Load file content
 */
export async function loadFile(path, ui = null) {
  if (!ui) ui = window.app.ui;
  try {
    ui.loader.classList.remove('hidden');
    ui.loader.innerHTML = `
      <div class="spinner"></div>
      <p>正在下载文件...</p>
    `;
    ui.card.classList.add('hidden');

    const relativePath = path.startsWith('english/word/') ? path.substring('english/word/'.length) : path;
    const text = await GitHubApi.fetchFileContent(relativePath);

    if (!text || text.trim().length === 0) {
      throw new Error('数据为空');
    }

    ui.loader.innerHTML = `
      <div class="spinner"></div>
      <p>正在解析内容...</p>
    `;

    const parser = new MarkdownParser(text);
    STATE.cards = parser.parse();

    // Debug: 打印生成的每一个 Card
    console.log('=== 生成的 Cards ===');
    console.log(`共 ${STATE.cards.length} 张卡片`);
    STATE.cards.forEach((card, index) => {
      console.log(`\n--- Card ${index + 1} ---`);
      console.log(JSON.stringify(card, null, 2));
    });
    console.log('=== Cards 打印结束 ===');

    if (STATE.cards.length === 0) {
      throw new Error('解析后没有生成任何卡片，请检查数据格式');
    }

    STATE.currentPath = relativePath;
    StateManager.loadStatsForFile(relativePath);
    // 🔧 FIX: Start a new study session when loading a file
    StateManager.startSession();
    StateManager.saveState();
    UiRenderer.updateOrderModeSelect(ui);
    ui.loader.classList.add('hidden');
    ui.card.classList.remove('hidden');

    // 🔧 FIX: If currentIndex was reset to 0 (file was completed before),
    // use restart() logic to restore card structure and show first card
    if (STATE.currentIndex === 0 && !document.getElementById('displayWord')) {
      UiRenderer.updateCurrentFileDisplay(ui, relativePath);
      window.app.restart();
    } else {
      UiRenderer.updateCurrentFileDisplay(ui, relativePath);
      window.app.render();
    }

    StateManager.updateStatsUI(ui);
    UiRenderer.showToast(ui, `解析完成：${STATE.cards.length} 张卡片`);
  } catch (e) {
    let errorMsg = e.message;
    if (e.name === 'AbortError') {
      errorMsg = '请求超时，请检查网络连接';
    }
    ui.loader.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <p style="color:red; font-size: 1.1rem; margin-bottom: 1rem;">加载失败: ${errorMsg}</p>
        <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">请检查网络连接或数据源</p>
        <p style="color: #999; font-size: 0.8rem; margin-bottom: 1rem;">路径: ${path}</p>
        <button class="btn-primary" onclick="location.reload()" style="margin-top: 1rem;">重新加载</button>
      </div>
    `;
  }
}

/**
 * Refresh file list
 */
export async function refreshFileList() {
  try {
    GitHubApi.clearCache();
    const currentPath = StateManager.getCurrentFolderPath();
    if (currentPath === null) {
      await loadRootFolders(true);
    } else {
      await loadFolder(currentPath, true);
    }
    UiRenderer.showToast(window.app.ui, '✅ 列表已刷新');
  } catch (e) {
    UiRenderer.showToast(window.app.ui, '❌ 刷新失败: ' + e.message);
  }
}

/**
 * Show completion screen
 */
export function showCompletionScreen(ui) {
  ui.card.innerHTML = `
    <div class="completion-screen">
      <h2>🎉 恭喜完成！</h2>
      <p>你已经学习了 ${STATE.cards.length} 张卡片</p>
      <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center;">
        <button class="btn-primary" onclick="app.restart()">重新开始</button>
        <button class="btn-ghost" onclick="app.clearDataAndReload()">清除数据</button>
      </div>
    </div>
  `;
}

/**
 * Clear data and reload
 */
export function clearDataAndReload() {
  if (confirm('确定要清除所有学习数据吗？此操作不可撤销。')) {
    StateManager.resetData();
    location.reload();
  }
}

// ============================================================
// Audio Sources Configuration (函数式 + 责任链模式)
// 增加新音源只需在数组中添加配置项，无需修改其他代码
// ============================================================

/**
 * 音频源配置
 * @typedef {Object} AudioSource
 * @property {string} name - 音源名称 (用于 Toast 提示)
 * @property {Function} play - 播放函数，返回 Promise
 * @property {number} timeout - 超时时间 (ms)，0 表示无超时
 */
const audioSources = [
  { name: '有道', play: playYoudaoAudio, timeout: 3000 },
  { name: 'Google Cloud', play: playGoogleCloudTTS, timeout: 3000 },
  { name: 'Azure', play: playAzureTTS, timeout: 3000 },
  // 以下音源在国内可能不可用，如需启用请取消注释
  // { name: '搜狗', play: playSogouTTS, timeout: 3000 },
];

// ============================================================
// 音频播放器实现
// ============================================================

/**
 * Play word pronunciation (入口函数)
 * Priority: 按 audioSources 数组顺序依次尝试
 */
export async function playWord(word, buttonId = null, showNotification = true) {
  if (!word) return;

  const audioText = word
    .replace(/sth\./g, 'something')
    .replace(/sb\./g, 'somebody');

  setButtonLoading(true, buttonId);

  try {
    const result = await tryAudioChain(audioText, audioSources, 0);
    setButtonLoading(false, buttonId);
    if (showNotification && result.sourceName) {
      UiRenderer.showToast(window.app.ui, `🔊 ${result.sourceName}`);
    }
  } catch (error) {
    // 所有音源都失败，尝试 Web Speech API 作为最后回退
    console.log('All audio sources failed, trying Web Speech API:', error.message);
    try {
      await playWebSpeech(audioText);
      setButtonLoading(false, buttonId);
      if (showNotification) {
        UiRenderer.showToast(window.app.ui, '🔊 TTS播放中');
      }
    } catch (ttsError) {
      setButtonLoading(false, buttonId);
      UiRenderer.showToast(window.app.ui, '❌ 语音播放失败');
    }
  }
}

/**
 * 责任链核心：递归尝试音源
 * @param {string} text - 要播放的文本
 * @param {AudioSource[]} sources - 音源数组
 * @param {number} index - 当前索引
 * @returns {Promise<{sourceName: string}>}
 */
async function tryAudioChain(text, sources, index) {
  if (index >= sources.length) {
    throw new Error('All audio sources failed');
  }

  const source = sources[index];
  try {
    await source.play(text);
    return { sourceName: source.name };
  } catch (error) {
    console.log(`${source.name} failed:`, error.message);
    return tryAudioChain(text, sources, index + 1);
  }
}

/**
 * 设置按钮加载状态
 */
function setButtonLoading(isLoading, btnId) {
  if (!btnId) return;
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.toggle('loading', isLoading);
  btn.disabled = isLoading;
}

// ============================================================
// 音源实现函数
// ============================================================

/**
 * 有道词典音频
 */
export async function playYoudaoAudio(text) {
  const cleanText = removeEmoji(text);
  const urls = [
    `https://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(cleanText)}`, // 美音
    `https://dict.youdao.com/dictvoice?type=1&audio=${encodeURIComponent(cleanText)}`, // 英音
  ];

  for (const url of urls) {
    try {
      return await playAudioUrl(url, 3000);
    } catch {
      continue;
    }
  }
  throw new Error('Youdao audio not available');
}

/**
 * Google Translate TTS
 */
export async function playGoogleTTS(text) {
  const cleanText = removeEmoji(text);
  const url = `https://translate.google.com/translate_tts?tl=en&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
  return playAudioUrl(url, 3000);
}

/**
 * 搜狗 TTS
 */
export async function playSogouTTS(text) {
  const cleanText = removeEmoji(text);
  const url = `https://fanyi.sogou.com/reventondc/synthesis?text=${encodeURIComponent(cleanText)}&speed=1&lang=en-US`;
  return playAudioUrl(url, 3000);
}

/**
 * Azure Speech TTS
 * Docs: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech
 */
export async function playAzureTTS(text) {
  const cleanText = removeEmoji(text);
  const apiKey = 'AA5SY7nuamSffX7uAkrQNBgrPNDIOzrsp8XkT4Obt8fjUxL6xVFcJQQJ99CBAC3pKaRXJ3w3AAAYACOGrV0Y';
  const region = 'eastasia';
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  // SSML format for Azure TTS
  const ssml = `
    <speak version='1.0' xml:lang='en-US'>
      <voice xml:lang='en-US' name='en-US-JennyNeural'>
        ${cleanText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;')}
      </voice>
    </speak>
  `.trim();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
    },
    body: ssml
  });

  if (!response.ok) {
    throw new Error(`Azure TTS error: ${response.status}`);
  }

  // Response is audio binary
  const arrayBuffer = await response.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
  const audioUrl = URL.createObjectURL(blob);
  return playAudioUrl(audioUrl, 10000);
}

/**
 * Google Cloud Text-to-Speech API
 * Docs: https://cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize
 */
export async function playGoogleCloudTTS(text) {
  const cleanText = removeEmoji(text);
  const apiKey = 'AIzaSyDzqlegQHUmyHDOJNRkxvHZlz4ueMOunVw';
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: cleanText },
      voice: { languageCode: 'en-US', name: 'en-US-Neural2-C' },
      audioConfig: { audioEncoding: 'MP3' }
    })
  });

  if (!response.ok) {
    throw new Error(`Google Cloud TTS error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.audioContent) {
    throw new Error('No audio content in response');
  }

  // Decode base64 and play
  const audioData = atob(data.audioContent);
  const arrayBuffer = new ArrayBuffer(audioData.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < audioData.length; i++) {
    view[i] = audioData.charCodeAt(i);
  }

  const blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
  const audioUrl = URL.createObjectURL(blob);
  return playAudioUrl(audioUrl, 10000);
}

/**
 * Web Speech API (浏览器内置 TTS)
 */
export async function playWebSpeech(text) {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Web Speech API not supported'));
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => resolve();
    utterance.onerror = (e) => e.error !== 'canceled' && reject(e);
    utterance.onend = () => resolve();

    // 选择美音
    const voices = window.speechSynthesis.getVoices();
    const usVoice = voices.find(v => v.lang === 'en-US') ||
                    voices.find(v => v.lang.startsWith('en'));
    if (usVoice) utterance.voice = usVoice;

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * 播放音频 URL
 */
export async function playAudioUrl(url, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    let resolved = false;
    let canPlay = false;

    const done = (fn, ...args) => {
      if (!resolved) {
        resolved = true;
        fn(...args);
      }
    };

    audio.oncanplaythrough = () => canPlay = true;
    audio.onplay = () => canPlay && done(resolve, { onplay: true });
    audio.onended = () => done(resolve, { onplay: true });
    audio.onerror = () => done(reject, new Error('Audio load failed'));
    audio.onstalled = () => setTimeout(() => {
      if (!resolved && !canPlay) done(reject, new Error('Audio stalled'));
    }, 1500);

    // 超时检测
    if (timeout > 0) {
      setTimeout(() => {
        if (!resolved && !canPlay) done(reject, new Error('Audio timeout'));
      }, timeout);
    }

    audio.play().catch(err => done(reject, err));
  });
}

/**
 * 移除文本中的 emoji
 */
export function removeEmoji(text) {
  if (!text) return '';
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
}

/**
 * 预热 Web Speech API
 */
export function prewarmSpeechSynthesis() {
  try {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
  } catch {}
}
