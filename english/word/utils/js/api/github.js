/**
 * GitHub API Module
 * Handles fetching data from GitHub repository
 */

// Import CONFIG from config.js
import { CONFIG } from '../config.js';

export class GitHubApi {
  static getCacheKey(path) {
    return `${CONFIG.cacheKey}_${path || 'root'}`;
  }

  static getCachedData(path) {
    try {
      const cacheKey = this.getCacheKey(path);
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now - parsed.timestamp < CONFIG.cacheDuration) {
        console.log(`✅ Using cached data for: ${path || 'root'}`);
        return parsed.data;  // Return the wrapped data
      } else {
        // Cache expired
        localStorage.removeItem(cacheKey);
        return null;
      }
    } catch (e) {
      console.warn('Cache read error:', e);
      return null;
    }
  }

  static setCachedData(path, data) {
    try {
      const cacheKey = this.getCacheKey(path);
      // Don't use spread operator on arrays!
      const cacheData = {
        data: data,  // Wrap data properly
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`💾 Cached data for: ${path || 'root'}`);
    } catch (e) {
      console.warn('Cache write error:', e);
    }
  }

  static clearCache() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CONFIG.cacheKey)) {
        localStorage.removeItem(key);
      }
    });
    console.log('🗑️ All cache cleared');
  }

  static async fetchContents(path = '', forceRefresh = false) {
    const url = path ? `${CONFIG.baseApiUrl}/${path}` : CONFIG.baseApiUrl;

    // Try cache first
    if (!forceRefresh) {
      const cached = this.getCachedData(path);
      if (cached) return cached;
    }

    // Fetch from API
    const res = await fetch(url);

    // Handle rate limiting
    if (res.status === 403) {
      const resetTime = res.headers.get('X-RateLimit-Reset');
      const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
      const timeRemaining = resetDate ? Math.ceil((resetDate - Date.now()) / 60000) : 60;

      throw new Error(
        `GitHub API 速率限制已达到。请等待 ${timeRemaining} 分钟后重试，或点击"刷新列表"按钮。`
      );
    }

    if (!res.ok) throw new Error(`GitHub API Error: ${res.status} ${res.statusText}`);

    const data = await res.json();
    console.log('GitHub API Response:', data);

    // GitHub API returns array for directories, single object for files
    // Ensure we always work with an array
    const contents = Array.isArray(data) ? data : [data];

    // Cache the result
    this.setCachedData(path, contents);

    return contents;
  }

  static async fetchFileContent(path) {
    const url = `${CONFIG.baseRawUrl}/${path}`;
    console.log('📥 Fetching file content from URL:', url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch Error: ${res.status}`);
    return await res.text();
  }

  static filterMdFiles(items) {
    if (!Array.isArray(items)) {
      console.error('filterMdFiles - items is not an array:', items);
      return [];
    }
    return items.filter(item =>
      item.type === 'file' &&
      item.name.endsWith('.md') &&
      item.name !== 'template.md' &&
      item.name !== 'basic.md'
    );
  }

  static filterFolders(items) {
    if (!Array.isArray(items)) {
      console.error('filterFolders - items is not an array:', items);
      return [];
    }
    return items.filter(item => item.type === 'dir');
  }

  static async fetchFolderContents(path, forceRefresh = false) {
    const contents = await this.fetchContents(path, forceRefresh);
    return {
      folders: this.filterFolders(contents),
      files: this.filterMdFiles(contents)
    };
  }
}
