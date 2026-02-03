/**
 * Configuration Module
 * Central configuration for the VocabMaster application
 */

export const CONFIG = {
  baseApiUrl: 'https://api.github.com/repos/bowen-wu/postgraduate/contents/english/word',
  baseRawUrl: 'https://raw.githubusercontent.com/bowen-wu/postgraduate/refs/heads/master/english/word',
  storageKey: 'vocab_master_v8_data',
  cacheKey: 'vocab_master_v8_cache',
  cacheDuration: 24 * 60 * 60 * 1000,  // 24 hours in ms
  version: 5,  // V2: Refactored card types (word|phrase|sentence)
  // Audio sources priority (youdao → TTS)
  localAudioBaseUrl: 'https://bowen-wu.github.io/postgraduate/english/audio',  // Reserved (not used currently)
  corsProxy: 'https://corsproxy.io/?'
  // Alternative proxies (uncomment if needed):
  // corsProxy: 'https://api.allorigins.win/raw?url=',
  // corsProxy: 'https://cors-anywhere.herokuapp.com/',
};

export const STATE = {
  cards: [],
  currentIndex: 0,
  mode: 'input',
  stats: {},
  currentPath: null,  // e.g., "core/Unit10-1.md"
  currentFile: null,  // Current file info from GitHub API
  autoPlay: false,    // Auto-play pronunciation for words
  // Session tracking
  sessionStartTime: null,    // When the current study session started
  sessionEndTime: null,      // When the current study session ended
  sessionCardsStudied: null   // Set of card IDs actually studied in this session
};
