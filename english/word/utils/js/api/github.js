/**
 * GitHub API Module
 * Handles fetching data from GitHub repository
 */

// Import CONFIG from config.js
import { CONFIG } from '../config.js';
import { StorageRepo } from '../infrastructure/storage-repo.js';
import { toServiceError } from '../infrastructure/service-error.js';

export class GitHubApi {
  static getRawFileUrl(path) {
    return `${CONFIG.baseRawUrl}/${path}`;
  }

  static getLocalFileUrl(path) {
    if (typeof window === 'undefined' || !window.location?.href) return null;
    try {
      return new URL(`../${path}`, window.location.href).toString();
    } catch (_error) {
      return null;
    }
  }

  static async sleep(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  static async fetchTextWithRetry(url, options = {}) {
    const {
      retries = 2,
      retryDelayMs = 250
    } = options;

    let lastStatus = null;
    let lastStatusText = '';
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          return await res.text();
        }

        lastStatus = res.status;
        lastStatusText = res.statusText || '';
        const shouldRetry = res.status === 429 || res.status >= 500;
        if (!shouldRetry || attempt === retries) {
          break;
        }
      } catch (error) {
        lastError = error;
        if (attempt === retries) {
          throw error;
        }
      }

      await this.sleep(retryDelayMs * (attempt + 1));
    }

    if (lastError) throw lastError;
    throw toServiceError('GITHUB_RAW_HTTP', `Fetch Error: ${lastStatus}${lastStatusText ? ` ${lastStatusText}` : ''}`);
  }

  static compareUnitAwareName(a, b) {
    const getParts = (name) => {
      const base = String(name || '').replace(/\.md$/i, '');
      const match = base.match(/^Unit(\d+)(?:-(\d+))?$/i);
      if (!match) return null;
      return {
        unit: Number(match[1]),
        sub: match[2] ? Number(match[2]) : null
      };
    };

    const aParts = getParts(a);
    const bParts = getParts(b);
    if (aParts && bParts) {
      if (aParts.unit !== bParts.unit) return aParts.unit - bParts.unit;
      if (aParts.sub === null && bParts.sub !== null) return -1;
      if (aParts.sub !== null && bParts.sub === null) return 1;
      if (aParts.sub !== null && bParts.sub !== null && aParts.sub !== bParts.sub) {
        return aParts.sub - bParts.sub;
      }
      return String(a).localeCompare(String(b), 'en');
    }

    return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
  }

  static getCacheKey(path) {
    return `${CONFIG.cacheKey}_${path || 'root'}`;
  }

  static getCachedData(path) {
    try {
      const cacheKey = this.getCacheKey(path);
      const cached = StorageRepo.getItem(cacheKey);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now - parsed.timestamp < CONFIG.cacheDuration) {
        return parsed.data;  // Return the wrapped data
      } else {
        // Cache expired
        StorageRepo.removeItem(cacheKey);
        return null;
      }
    } catch (e) {
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
      StorageRepo.setJson(cacheKey, cacheData);
    } catch (e) {
    }
  }

  static clearCache() {
    StorageRepo.removeByPrefix(CONFIG.cacheKey);
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

      throw toServiceError(
        'GITHUB_RATE_LIMIT',
        `GitHub API 速率限制已达到。请等待 ${timeRemaining} 分钟后重试，或点击"刷新列表"按钮。`
      );
    }

    if (!res.ok) throw toServiceError('GITHUB_API_HTTP', `GitHub API Error: ${res.status} ${res.statusText}`);

    const data = await res.json();

    // GitHub API returns array for directories, single object for files
    // Ensure we always work with an array
    const contents = Array.isArray(data) ? data : [data];

    // Cache the result
    this.setCachedData(path, contents);

    return contents;
  }

  static async fetchFileContent(path) {
    const candidates = [
      this.getLocalFileUrl(path),
      this.getRawFileUrl(path)
    ].filter(Boolean);

    let lastError = null;
    for (const url of candidates) {
      try {
        return await this.fetchTextWithRetry(url);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || toServiceError('GITHUB_RAW_HTTP', 'Fetch Error');
  }

  static filterMdFiles(items) {
    if (!Array.isArray(items)) {
      return [];
    }
    return items.filter(item =>
      item.type === 'file' &&
      item.name.endsWith('.md') &&
      item.name !== 'template.md' &&
      item.name !== 'basic.md'
    ).sort((a, b) => this.compareUnitAwareName(a.name, b.name));
  }

  static filterFolders(items) {
    if (!Array.isArray(items)) {
      return [];
    }
    return items
      .filter(item => item.type === 'dir')
      .sort((a, b) => this.compareUnitAwareName(a.name, b.name));
  }

  static async fetchFolderContents(path, forceRefresh = false) {
    const contents = await this.fetchContents(path, forceRefresh);
    return {
      folders: this.filterFolders(contents),
      files: this.filterMdFiles(contents)
    };
  }
}
