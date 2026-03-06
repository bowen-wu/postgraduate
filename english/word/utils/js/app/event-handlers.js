/**
 * Event Handlers Module
 * Handles all user interaction events and file operations
 */

import { CONFIG, STATE } from '../config.js';
import { GitHubApi } from '../api/github.js';
import { MarkdownParser } from '../parser/index.js';
import { createStudyUseCases } from '../application/study-use-cases.js';
import { createTranslationUseCases } from '../application/translation-use-cases.js';
import * as StateManager from './state-manager.js';
import * as UiRenderer from './ui-renderer.js';
import { playWordWithFallback, prewarmSpeechSynthesis as prewarmSpeechSynthesisService } from '../infrastructure/audio-service.js';
import { translateTextWithFallback } from '../infrastructure/translation-service.js';
import { renderRootFileList, renderFolderFileList, renderFileListError } from './presenters/file-list-presenter.js';

let appContext = null;
let studyUseCases = null;
let translationUseCases = null;

export function setAppContext(app) {
  appContext = app;
  studyUseCases = null;
  translationUseCases = null;
}

function getApp() {
  if (!appContext) {
    throw new Error('App context is not initialized');
  }
  return appContext;
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

function getTranslationUseCases() {
  if (!translationUseCases) {
    translationUseCases = createTranslationUseCases({
      stateManager: StateManager,
      uiRenderer: UiRenderer,
      getUi: () => getApp().ui,
      render: () => getApp().render(),
      translateText: translateTextWithFallback,
      setButtonLoading,
      revealSentenceTranslation: () => UiRenderer.showSentenceTranslation(getApp().ui)
    });
  }
  return translationUseCases;
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

    ui.fileListContainer.innerHTML = renderRootFileList({ folders, files });
  } catch (e) {
    ui.fileListContainer.innerHTML = renderFileListError(e.message, '重试');
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

    ui.fileListContainer.innerHTML = renderFolderFileList({ path, folders, files });
  } catch (e) {
    ui.fileListContainer.innerHTML = renderFileListError(e.message, '返回根目录');
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

/**
 * 翻译当前 Phrase 卡片
 */
export async function translatePhrase() {
  return getTranslationUseCases().translatePhrase();
}

/**
 * 翻译当前 Sentence 卡片
 */
export async function translateSentence() {
  return getTranslationUseCases().translateSentence();
}
