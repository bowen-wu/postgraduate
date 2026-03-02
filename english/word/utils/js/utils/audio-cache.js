/**
 * Audio Cache Module
 * IndexedDB-based audio cache with LRU eviction policy
 */

import { CONFIG } from '../config.js';

const DB_NAME = 'vocab_audio_cache';
const DB_VERSION = 1;
const STORE_NAME = 'audio';

let db = null;

/**
 * Initialize IndexedDB
 */
async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('lastAccess', 'lastAccess', { unique: false });
        store.createIndex('size', 'size', { unique: false });
      }
    };
  });
}

/**
 * Generate cache key from text and source
 * @param {string} text - Audio text content
 * @param {string} source - Audio source name (youdao, azure, google)
 * @returns {string} Cache key
 */
function generateKey(text, source) {
  // Simple hash to shorten key length
  const hash = text.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  return `${source}:${hash}:${text.slice(0, 50)}`;
}

/**
 * Get current cache size
 * @param {IDBDatabase} database
 * @returns {Promise<number>}
 */
async function getCacheSize(database) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const total = request.result.reduce((sum, item) => sum + (item.size || 0), 0);
      resolve(total);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Evict oldest entries until we have enough space
 * @param {IDBDatabase} database
 * @param {number} neededSize - Size needed for new entry
 */
async function evictLRU(database, neededSize) {
  const maxSize = CONFIG.audio.cache.maxSize;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('lastAccess');
    const request = index.openCursor();

    let freedSize = 0;

    request.onsuccess = async (event) => {
      const cursor = event.target.result;
      if (cursor && freedSize < neededSize) {
        const item = cursor.value;
        freedSize += item.size || 0;
        cursor.delete();
        cursor.continue();
      } else {
        resolve(freedSize);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get audio from cache
 * @param {string} text - Audio text content
 * @param {string} source - Audio source name
 * @returns {Promise<Blob|null>} Cached audio blob or null
 */
export async function getAudio(text, source) {
  // Skip if caching is disabled for this source
  if (!shouldCache(source)) return null;

  try {
    const database = await initDB();
    const key = generateKey(text, source);

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          // Update last access time (LRU)
          item.lastAccess = Date.now();
          store.put(item);
          resolve(item.blob);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Audio cache get error:', error);
    return null;
  }
}

/**
 * Check if caching should be used for this source
 * @param {string} source - Audio source name
 * @returns {boolean}
 */
function shouldCache(source) {
  return CONFIG.audio.cache.enabled &&
         CONFIG.audio.cache.sources.includes(source);
}

/**
 * Store audio in cache
 * @param {string} text - Audio text content
 * @param {string} source - Audio source name
 * @param {Blob} blob - Audio blob
 */
export async function setAudio(text, source, blob) {
  // Skip if caching is disabled for this source
  if (!shouldCache(source)) return;

  try {
    const database = await initDB();
    const key = generateKey(text, source);
    const size = blob.size || 0;

    // Check if we need to evict
    const currentSize = await getCacheSize(database);
    if (currentSize + size > CONFIG.audio.cache.maxSize) {
      await evictLRU(database, size);
    }

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const item = {
        key,
        blob,
        size,
        lastAccess: Date.now(),
        createdAt: Date.now()
      };

      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Audio cache set error:', error);
  }
}

/**
 * Clear all cached audio
 */
export async function clearCache() {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Audio cache clear error:', error);
  }
}

/**
 * Get cache statistics
 * @returns {Promise<{count: number, size: number}>}
 */
export async function getCacheStats() {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result;
        const size = items.reduce((sum, item) => sum + (item.size || 0), 0);
        resolve({
          count: items.length,
          size,
          sizeMB: (size / 1024 / 1024).toFixed(2)
        });
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Audio cache stats error:', error);
    return { count: 0, size: 0, sizeMB: '0.00' };
  }
}
