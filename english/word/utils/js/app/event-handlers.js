/**
 * Event Handlers Module
 * Handles all user interaction events and file operations
 */

import { STATE } from '../config.js';
import { GitHubApi } from '../api/github.js';
import { MarkdownParser } from '../parser/index.js';
import { createStudyUseCases } from '../application/study-use-cases.js';
import { createTranslationUseCases } from '../application/translation-use-cases.js';
import { createFileUseCases } from '../application/file-use-cases.js';
import * as StateManager from './state-manager.js';
import * as UiRenderer from './ui-renderer.js';
import { playWordWithFallback, prewarmSpeechSynthesis as prewarmSpeechSynthesisService } from '../infrastructure/audio-service.js';
import { translateTextWithFallback } from '../infrastructure/translation-service.js';
import { renderRootFileList, renderFolderFileList, renderFileListError } from './presenters/file-list-presenter.js';

let appContext = null;
let studyUseCases = null;
let translationUseCases = null;
let fileUseCases = null;

export function setAppContext(app) {
  appContext = app;
  studyUseCases = null;
  translationUseCases = null;
  fileUseCases = null;
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

function getFileUseCases() {
  if (!fileUseCases) {
    fileUseCases = createFileUseCases({
      state: STATE,
      stateManager: StateManager,
      uiRenderer: UiRenderer,
      gitHubApi: GitHubApi,
      ParserClass: MarkdownParser,
      renderRootFileList,
      renderFolderFileList,
      renderFileListError,
      getApp,
      getUi
    });
  }
  return fileUseCases;
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
  UiRenderer.updateStatsUI(getApp().ui);

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
  return getFileUseCases().toggleFiles(forceOpen, ui);
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
  return getFileUseCases().loadRootFolders(forceRefresh, ui);
}

/**
 * Load folder contents
 */
export async function loadFolder(path, forceRefresh = false, ui = null) {
  return getFileUseCases().loadFolder(path, forceRefresh, ui);
}

/**
 * Select file to load
 */
export function selectFile(path, name) {
  return getFileUseCases().selectFile(path, name);
}

/**
 * Confirm and switch file
 */
export async function confirmSwitchFile(path, ui = null) {
  return getFileUseCases().confirmSwitchFile(path, ui);
}

/**
 * Load file content
 */
export async function loadFile(path, ui = null) {
  return getFileUseCases().loadFile(path, ui);
}

/**
 * Refresh file list
 */
export async function refreshFileList() {
  return getFileUseCases().refreshFileList();
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
