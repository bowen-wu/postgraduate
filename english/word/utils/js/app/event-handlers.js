/**
 * Event Handlers Module
 * Handles all user interaction events and file operations
 */

import { CONFIG, STATE } from '../config.js';
import { GitHubApi } from '../api/github.js';
import { MarkdownParser } from '../parser/index.js';
import { createStudyUseCases } from '../application/study-use-cases.js';
import * as StateManager from './state-manager.js';
import * as UiRenderer from './ui-renderer.js';
import { playWordWithFallback, prewarmSpeechSynthesis as prewarmSpeechSynthesisService } from '../infrastructure/audio-service.js';
import { translateTextWithFallback } from '../infrastructure/translation-service.js';

let appContext = null;
let studyUseCases = null;

export function setAppContext(app) {
  appContext = app;
}

function getApp() {
  return appContext || window.app;
}

function getUi(ui = null) {
  return ui || getApp().ui;
}

function getStudyUseCases() {
  if (!studyUseCases) {
    studyUseCases = createStudyUseCases({
      state: STATE,
      stateManager: StateManager,
      uiRenderer: UiRenderer,
      getUi: () => getApp().ui,
      render: () => getApp().render(),
      getBadgesElement: () => document.getElementById('displayBadges')
    });
  }
  return studyUseCases;
}

/**
 * Set application mode
 */
export function setMode(newMode) {
  STATE.mode = newMode;
  UiRenderer.updateModeButtons(getApp().ui);
  UiRenderer.updateBodyModeClass();
  StateManager.saveState();
  getApp().render();
}

/**
 * Set order mode (sequential, randomByType, randomAll)
 */
export function setOrderMode(mode) {
  if (mode === STATE.orderMode) return;

  StateManager.setOrderMode(mode);
  UiRenderer.updateOrderModeSelect(getApp().ui);
  getApp().render();
  StateManager.updateStatsUI(getApp().ui);

  const modeNames = {
    'sequential': '顺序',
    'randomByType': '随机(按类型)',
    'randomAll': '完全随机'
  };
  UiRenderer.showToast(getApp().ui, `顺序模式: ${modeNames[mode]}`);
}

/**
 * Toggle auto-play
 */
export function toggleAutoPlay() {
  STATE.autoPlay = !STATE.autoPlay;
  UiRenderer.updateAutoPlayButton(getApp().ui);
  StateManager.saveState();
  UiRenderer.showToast(getApp().ui, STATE.autoPlay ? '自动播放已开启' : '自动播放已关闭');
}

/**
 * Handle recall in recall mode
 */
export function handleRecall(claimedKnown) {
  getStudyUseCases().handleRecall(claimedKnown);
}

/**
 * Confirm recall result
 */
export function confirmRecall(actuallyCorrect) {
  getStudyUseCases().confirmRecall(actuallyCorrect);
}

/**
 * Record error for current card
 */
export function recordError() {
  getStudyUseCases().recordError();
}

/**
 * Handle sentence recall
 */
export function handleSentenceRecall(understood) {
  getStudyUseCases().handleSentenceRecall(understood);
}

/**
 * Go to next card
 */
export function nextCard() {
  getStudyUseCases().nextCard();
}

/**
 * Go to previous card
 */
export function prevCard() {
  getStudyUseCases().prevCard();
}

/**
 * Jump to specific card by display index
 */
export function jumpTo(idx) {
  if (getStudyUseCases().jumpTo(idx)) {
    toggleStats(getApp().ui);
  }
}

/**
 * Jump to specific card by original index (for learning list clicks)
 */
export function jumpToOriginal(originalIdx) {
  if (getStudyUseCases().jumpToOriginal(originalIdx)) {
    toggleStats(getApp().ui);
  }
}

/**
 * Toggle file panel
 */
export async function toggleFiles(forceOpen = null, ui = null) {
  ui = getUi(ui);
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
  ui = getUi(ui);
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
  ui = getUi(ui);
  try {
    // Show loading state in file list container
    ui.fileListContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--secondary);">正在加载文件列表...</div>';

    const {folders, files} = await GitHubApi.fetchFolderContents('', forceRefresh);

    let html = '<div style="padding: 0.5rem;"><strong>📚 选择文件夹:</strong></div>';

    if (folders.length > 0) {
      html += folders.map(folder => `
        <div class="file-item" data-action="load-folder" data-path="${folder.name}">
          <span class="file-icon">📁</span>
          <span class="file-name">${folder.name}</span>
        </div>
      `).join('');
    }

    if (files.length > 0) {
      html += '<div style="padding: 0.5rem; margin-top: 0.5rem; border-top: 1px solid #e2e8f0;"><strong>📄 文件:</strong></div>';
      html += files.map(file => `
        <div class="file-item" data-action="select-file" data-path="${file.name}" data-name="${file.name}">
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
        <button class="btn-primary" data-action="load-root-folders" style="margin-top: 1rem;">重试</button>
      </div>
    `;
  }
}

/**
 * Load folder contents
 */
export async function loadFolder(path, forceRefresh = false, ui = null) {
  ui = getUi(ui);
  try {
    // Show loading state in file list container
    ui.fileListContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--secondary);">正在加载文件列表...</div>';

    const {folders, files} = await GitHubApi.fetchFolderContents(path, forceRefresh);

    let html = '';

    // Add back button
    html += `
      <div class="file-item" data-action="load-root-folders" style="color: var(--primary);">
        <span class="file-icon">⬅️</span>
        <span class="file-name">返回根目录</span>
      </div>
    `;

    // Add parent folder button if not in root
    if (path.includes('/')) {
      const parentPath = path.split('/').slice(0, -1).join('/');
      html += `
        <div class="file-item" data-action="load-folder" data-path="${parentPath}" style="color: var(--primary);">
          <span class="file-icon">⬆️</span>
          <span class="file-name">上级目录</span>
        </div>
      `;
    }

    html += `<div style="padding: 0.5rem;"><strong>📁 ${path}</strong></div>`;

    if (folders.length > 0) {
      html += folders.map(folder => `
        <div class="file-item" data-action="load-folder" data-path="${path}/${folder.name}">
          <span class="file-icon">📁</span>
          <span class="file-name">${folder.name}</span>
        </div>
      `).join('');
    }

    if (files.length > 0) {
      html += '<div style="padding: 0.5rem; margin-top: 0.5rem; border-top: 1px solid #e2e8f0;"><strong>📄 文件:</strong></div>';
      html += files.map(file => `
        <div class="file-item" data-action="select-file" data-path="${path}/${file.name}" data-name="${file.name}">
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
        <button class="btn-primary" data-action="load-root-folders" style="margin-top: 1rem;">返回根目录</button>
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

  getApp().confirmDialog.show(message, () => confirmSwitchFile(path));
}

/**
 * Confirm and switch file
 */
export async function confirmSwitchFile(path, ui = null) {
  ui = getUi(ui);
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
  ui = getUi(ui);
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
    UiRenderer.updateOrderModeSelect(ui);
    ui.loader.classList.add('hidden');
    ui.card.classList.remove('hidden');

    // 🔧 FIX: If currentIndex was reset to 0 (file was completed before),
    // use restart() logic to restore card structure and show first card
    if (STATE.currentIndex === 0 && !document.getElementById('displayWord')) {
      UiRenderer.updateCurrentFileDisplay(ui, relativePath);
      getApp().restart();
    } else {
      UiRenderer.updateCurrentFileDisplay(ui, relativePath);
      getApp().render();
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
        <button class="btn-primary" data-action="reload-page" style="margin-top: 1rem;">重新加载</button>
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
    UiRenderer.showToast(getApp().ui, '✅ 列表已刷新');
  } catch (e) {
    UiRenderer.showToast(getApp().ui, '❌ 刷新失败: ' + e.message);
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
        <button class="btn-primary" data-action="restart">重新开始</button>
        <button class="btn-ghost" data-action="clear-data-reload">清除数据</button>
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

function setButtonLoading(isLoading, btnId) {
  if (!btnId) return;
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.toggle('loading', isLoading);
  btn.disabled = isLoading;
}

export async function playWord(word, buttonId = null, _useTTSFallback = false, showNotification = true) {
  if (!word) return;
  setButtonLoading(true, buttonId);
  try {
    const result = await playWordWithFallback(word);
    setButtonLoading(false, buttonId);
    if (showNotification && result.sourceName) {
      UiRenderer.showToast(getApp().ui, `🔊 ${result.sourceName}`);
    }
  } catch (_error) {
    setButtonLoading(false, buttonId);
    UiRenderer.showToast(getApp().ui, '❌ 语音播放失败');
  }
}

export function prewarmSpeechSynthesis() {
  prewarmSpeechSynthesisService();
}

export async function translateText(text, buttonId = null) {
  setButtonLoading(true, buttonId);
  try {
    const result = await translateTextWithFallback(text);
    setButtonLoading(false, buttonId);
    return result;
  } catch (error) {
    setButtonLoading(false, buttonId);
    throw error;
  }
}

/**
 * 翻译当前 Phrase 卡片
 */
export async function translatePhrase() {
  const card = StateManager.getCurrentCard();
  if (!card || card.type !== 'phrase') return;

  // Try both button IDs (content area and action area)
  const buttonIds = ['translate-btn-phrase', 'translate-btn-phrase-action'];

  try {
    // Set loading state for all possible buttons
    buttonIds.forEach(id => setButtonLoading(true, id));

    UiRenderer.showToast(getApp().ui, '正在翻译...');
    const result = await translateText(card.word);

    // 更新卡片数据
    if (!card.items[0]) {
      card.items[0] = { en: card.word, cn: '' };
    }
    card.items[0].cn = result.translation;

    // Clear loading state for all possible buttons
    buttonIds.forEach(id => setButtonLoading(false, id));

    // 保存状态并重新渲染
    StateManager.saveState();
    getApp().render();

    // 更新 action area 为"下一个"按钮
    UiRenderer.renderNextAction(getApp().ui);
    // UiRenderer.showToast(getApp().ui, `✅ 翻译完成 (${result.sourceName})`);
  } catch (error) {
    buttonIds.forEach(id => setButtonLoading(false, id));
    UiRenderer.showToast(getApp().ui, '❌ 翻译失败: ' + error.message);
  }
}

/**
 * 翻译当前 Sentence 卡片
 */
export async function translateSentence() {
  const card = StateManager.getCurrentCard();
  if (!card || card.type !== 'sentence') return;

  const sentenceText = card.items[0]?.en || card.displayWord || card.word;
  // Try both button IDs (content area and action area)
  const buttonIds = ['translate-btn-sentence', 'translate-btn-sentence-action'];

  try {
    // Set loading state for all possible buttons
    buttonIds.forEach(id => setButtonLoading(true, id));

    UiRenderer.showToast(getApp().ui, '正在翻译...');
    const result = await translateText(sentenceText);

    // 更新卡片数据
    if (!card.items[0]) {
      card.items[0] = { en: sentenceText, cn: '' };
    }
    card.items[0].cn = result.translation;

    // Clear loading state for all possible buttons
    buttonIds.forEach(id => setButtonLoading(false, id));

    // 保存状态并重新渲染
    StateManager.saveState();
    getApp().render();

    // 直接显示中文译文
    const cnDiv = document.getElementById('sentenceCn');
    if (cnDiv) {
      cnDiv.style.display = 'block';
      cnDiv.classList.add('revealed');
    }

    // 更新 action area 为"下一个"按钮
    UiRenderer.renderNextAction(getApp().ui);
    // UiRenderer.showToast(getApp().ui, `✅ 翻译完成 (${result.sourceName})`);
  } catch (error) {
    buttonIds.forEach(id => setButtonLoading(false, id));
    UiRenderer.showToast(getApp().ui, '❌ 翻译失败: ' + error.message);
  }
}
