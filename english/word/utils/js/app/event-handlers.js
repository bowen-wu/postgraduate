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
  const id = STATE.cards[STATE.currentIndex].id;
  if (!STATE.stats[id]) STATE.stats[id] = {errors: 0};
  STATE.stats[id].errors++;
  StateManager.saveState();
  StateManager.updateStatsUI(window.app.ui);

  const card = STATE.cards[STATE.currentIndex];
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
  if (STATE.cards[STATE.currentIndex]) {
    StateManager.recordCardStudied(STATE.cards[STATE.currentIndex].id);
  }

  if (STATE.currentIndex < STATE.cards.length - 1) {
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
 * Jump to specific card
 */
export function jumpTo(idx) {
  STATE.currentIndex = idx;
  window.app.render();
  toggleStats(window.app.ui);
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
    console.error('加载根目录失败:', e);
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
    console.error('加载文件夹失败:', e);
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
    console.error('切换文件失败:', e);
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

    if (STATE.cards.length === 0) {
      throw new Error('解析后没有生成任何卡片，请检查数据格式');
    }

    STATE.currentPath = relativePath;
    StateManager.loadStatsForFile(relativePath);
    // 🔧 FIX: Start a new study session when loading a file
    StateManager.startSession();
    StateManager.saveState();
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
    console.error('加载失败:', e);
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
    console.error('刷新列表失败:', e);
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

/**
 * Play word pronunciation
 */
export async function playWord(word, buttonId = null, useTTSFallback = false, showNotification = true) {
  if (!word) return;

  // 替换缩写为完整单词，用于 TTS 和有道 API
  const audioText = word
    .replace(/sth\./g, 'something')
    .replace(/sb\./g, 'somebody');

  const setButtonLoading = (isLoading, btnId) => {
    if (!btnId) return;
    const btn = document.getElementById(btnId);
    if (btn) {
      if (isLoading) {
        btn.classList.add('loading');
        btn.disabled = true;
      } else {
        btn.classList.remove('loading');
        btn.disabled = false;
      }
    }
  };

  setButtonLoading(true, buttonId);

  if (!useTTSFallback) {
    playCambridgeAudio(audioText).then((result) => {
      if (result && result.onplay) {
        setButtonLoading(false, buttonId);
        if (showNotification) {
          UiRenderer.showToast(window.app.ui, '🔊 播放中');
        }
      }
    }).catch((error) => {
      setButtonLoading(false, buttonId);
      // Retry with TTS fallback
      playWord(word, buttonId, true, showNotification);
    });
    return;
  }

  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      await new Promise(resolve => setTimeout(resolve, 50));

      const utterance = new SpeechSynthesisUtterance(audioText);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => {
        setButtonLoading(false, buttonId);
        if (showNotification) {
          UiRenderer.showToast(window.app.ui, '🔊 TTS播放中');
        }
      };

      utterance.onerror = (event) => {
        console.warn('Speech synthesis error:', event.error);
        setButtonLoading(false, buttonId);
        if (event.error !== 'canceled') {
          UiRenderer.showToast(window.app.ui, '❌ 语音播放失败');
        }
      };

      utterance.onend = () => {
        setButtonLoading(false, buttonId);
      };

      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        window.speechSynthesis.getVoices();
      }

      const usVoice = voices.find(voice => voice.lang === 'en-US') ||
                      voices.find(voice => voice.lang.startsWith('en-US')) ||
                      voices.find(voice => voice.lang.startsWith('en') && voice.localService) ||
                      voices.find(voice => voice.lang.startsWith('en'));

      if (usVoice) {
        utterance.voice = usVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech synthesis exception:', e);
      setButtonLoading(false, buttonId);
      UiRenderer.showToast(window.app.ui, '❌ 语音播放出错');
    }
  } else {
    setButtonLoading(false, buttonId);
    UiRenderer.showToast(window.app.ui, '❌ 浏览器不支持语音播放');
  }
}

/**
 * Play Cambridge audio
 */
export async function playCambridgeAudio(word) {
  try {
    const cleanWord = removeEmoji(word);
    const urlPatterns = [
      `https://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(cleanWord)}`,
      `https://dict.youdao.com/dictvoice?type=1&audio=${encodeURIComponent(cleanWord)}`
    ];

    for (const url of urlPatterns) {
      try {
        const result = await playAudioUrl(url);
        return result;
      } catch (err) {
        continue;
      }
    }

    throw new Error('No Youdao audio available for this word');
  } catch (error) {
    console.error('Youdao audio error:', error);
    throw error;
  }
}

/**
 * Play audio from URL
 */
export async function playAudioUrl(url) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.src = url;

    let resolved = false;
    let canPlayThrough = false;

    // Check if audio can actually be played (not just started)
    audio.oncanplaythrough = () => {
      canPlayThrough = true;
    };

    audio.onplay = () => {
      // Only resolve if we know the audio is playable
      if (!resolved && canPlayThrough) {
        resolved = true;
        resolve({ onplay: true, audio });
      }
    };

    audio.onended = () => {
      if (!resolved) {
        resolved = true;
        resolve({ onplay: true, audio });
      }
    };

    audio.onerror = (e) => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Audio load failed'));
      }
    };

    // Add timeout to detect stuck loading
    const timeoutId = setTimeout(() => {
      if (!resolved && !canPlayThrough) {
        resolved = true;
        reject(new Error('Audio loading timeout'));
      }
    }, 5000); // 5 second timeout

    // Clean up timeout on resolution
    const originalResolve = resolve;
    const originalReject = reject;
    const cleanup = () => clearTimeout(timeoutId);

    resolve = (...args) => {
      cleanup();
      originalResolve(...args);
    };

    reject = (...args) => {
      cleanup();
      originalReject(...args);
    };

    // Start playing
    audio.play().catch((err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });
  });
}

/**
 * Remove emoji from text
 */
export function removeEmoji(text) {
  if (!text) return '';
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
}

/**
 * Prewarm speech synthesis
 */
export function prewarmSpeechSynthesis() {
  try {
    const voices = window.speechSynthesis.getVoices();
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Failed to pre-warm speech synthesis:', e);
  }
}
