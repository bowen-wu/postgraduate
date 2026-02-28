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
  corsProxy: 'https://corsproxy.io/?',
  // Alternative proxies (uncomment if needed):
  // corsProxy: 'https://api.allorigins.win/raw?url=',
  // corsProxy: 'https://cors-anywhere.herokuapp.com/',

  // ============================================================
  // API Keys Configuration
  // ============================================================
  apiKeys: {
    // Azure Speech Service (TTS)
    azureSpeech: {
      key: 'AA5SY7nuamSffX7uAkrQNBgrPNDIOzrsp8XkT4Obt8fjUxL6xVFcJQQJ99CBAC3pKaRXJ3w3AAAYACOGrV0Y',
      region: 'eastasia'
    },
    // Azure Translator
    azureTranslator: {
      key: '5AP1IXEIjj1bL79Q0FInGJH78v4H5zGlLtG9HizexT1ijqWL9CtZJQQJ99CBAC3pKaRXJ3w3AAAbACOGV2I9',
      region: 'eastasia'
    },
    // Google Cloud Services
    googleCloud: {
      // Cloud Text-to-Speech API
      tts: 'AIzaSyDzqlegQHUmyHDOJNRkxvHZlz4ueMOunVw',
      // Cloud Translation API
      translation: 'AIzaSyAQvS4XOIObOHr4xEz9_2_2U1QeylWieDE'
    }
  },

  // ============================================================
  // Audio Sources Configuration
  // ============================================================
  audio: {
    defaultVoice: 'en-US-JennyNeural',
    defaultTimeout: 1200
  },

  // ============================================================
  // Translation Configuration
  // ============================================================
  translation: {
    defaultTimeout: 8000,
    targetLanguage: 'zh-Hans'
  }
};

export const STATE = {
  cards: [],
  currentIndex: 0,
  mode: 'input',
  orderMode: 'sequential',   // 'sequential' | 'randomByType' | 'randomAll'
  displayOrder: [],          // Array of card indices for display order
  currentCardId: null,       // Current card ID for progress tracking
  stats: {},
  currentPath: null,  // e.g., "core/Unit10-1.md"
  currentFile: null,  // Current file info from GitHub API
  autoPlay: false,    // Auto-play pronunciation for words
  completed: false,   // Whether the current file has been completed
  // Session tracking
  sessionStartTime: null,    // When the current study session started
  sessionEndTime: null,      // When the current study session ended
  sessionCardsStudied: null   // Set of card IDs actually studied in this session
};
