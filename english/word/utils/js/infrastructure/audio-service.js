import { CONFIG } from '../config.js';
import * as AudioCache from '../utils/audio-cache.js';
import { runFallbackChain } from './fallback-chain.js';
import { toServiceError } from './service-error.js';

let _playbackInProgress = false;
let _playbackToken = 0;
let _activePlaybackAbort = null;
const _memoryAudioCache = new Map();

function debugAudio(...args) {
  if (!CONFIG.audio?.debugLogging) return;
  console.log('[audio]', ...args);
}

export function isAudioPlaybackInProgress() {
  return _playbackInProgress;
}

function isPlaybackTokenActive(token) {
  return token === _playbackToken;
}

function ensurePlaybackTokenActive(token) {
  if (!isPlaybackTokenActive(token)) {
    throw toServiceError('AUDIO_PLAYBACK_STOPPED', 'Audio playback stopped');
  }
}

function setActivePlaybackAbort(abortFn) {
  _activePlaybackAbort = abortFn;
}

function clearActivePlaybackAbort(abortFn) {
  if (_activePlaybackAbort === abortFn) {
    _activePlaybackAbort = null;
  }
}

function getMemoryAudioCacheKey(text, source) {
  return `${source}:${removeEmoji(normalizeText(text)).toLowerCase()}`;
}

function getMemoryAudioDataUrl(text, source) {
  return _memoryAudioCache.get(getMemoryAudioCacheKey(text, source)) || null;
}

function setMemoryAudioDataUrl(text, source, dataUrl) {
  if (!text || !source || !dataUrl) return;
  _memoryAudioCache.set(getMemoryAudioCacheKey(text, source), dataUrl);
}

export function stopCurrentAudioPlayback() {
  debugAudio('stopCurrentAudioPlayback');
  if (_activePlaybackAbort) {
    try {
      _activePlaybackAbort();
    } catch {}
    _activePlaybackAbort = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  _playbackToken += 1;
  _playbackInProgress = false;
}

const audioSources = [
  { name: '有道', play: playYoudaoAudio, timeout: 3500, options: { urls: ['us', 'uk'] } },
  { name: 'Azure', play: playAzureTTS, timeout: 3500, options: { voice: 'en-US-JennyNeural', region: 'eastasia' } },
  { name: 'Google Cloud', play: playGoogleCloudTTS, timeout: 3500, options: { voice: 'en-US-Neural2-C' } }
];

const sentenceAudioSources = [
  { name: 'Azure', play: playAzureTTS, timeout: 3500, options: { voice: 'en-US-JennyNeural', region: 'eastasia' } },
  { name: 'Google Cloud', play: playGoogleCloudTTS, timeout: 3500, options: { voice: 'en-US-Neural2-C' } }
];

function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|Mobile|HMSCore/i.test(ua);
}

function isSentenceLike(text) {
  const normalized = String(text || '').trim();
  if (!normalized) return false;
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  return wordCount >= 8 || /[.!?;:,"]/u.test(normalized);
}

async function getCachedPlayableSource(text, sources, hooks = {}) {
  for (const source of sources) {
    const sourceKey =
      source.name === 'Azure' ? 'azure'
        : source.name === 'Google Cloud' ? 'google'
          : null;
    if (!sourceKey) continue;

    const memoryCached = getMemoryAudioDataUrl(text, sourceKey);
    if (memoryCached) {
      debugAudio('memory-cache-hit', { text, source: sourceKey });
      return async (timeout) => {
        const sourceTimeout = Math.max(timeout, CONFIG.audio?.defaultTimeout || 1200, 2000);
        return playAudioUrl(memoryCached, sourceTimeout, hooks);
      };
    }

    if (isMobileBrowser()) {
      debugAudio('skip-indexeddb-cache-on-mobile', { text, source: sourceKey });
      continue;
    }

    const cached = await AudioCache.getAudio(text, sourceKey);
    if (!cached) continue;
    debugAudio('cache-hit', { text, source: sourceKey });

    return async (timeout) => {
      const sourceTimeout = Math.max(timeout, CONFIG.audio?.defaultTimeout || 1200, 2000);
      try {
        return await playBlobWithFallback(cached, sourceTimeout, hooks);
      } catch (error) {
        throw error;
      }
    };
  }

  return null;
}

async function hasCachedAudioSource(text, sources) {
  for (const source of sources) {
    const sourceKey =
      source.name === 'Azure' ? 'azure'
        : source.name === 'Google Cloud' ? 'google'
          : null;
    if (!sourceKey) continue;

    if (getMemoryAudioDataUrl(text, sourceKey)) {
      debugAudio('prefetch-memory-cache-hit', { text, source: sourceKey });
      return true;
    }

    if (isMobileBrowser()) {
      continue;
    }

    const cached = await AudioCache.getAudio(text, sourceKey);
    if (cached) {
      debugAudio('prefetch-indexeddb-cache-hit', { text, source: sourceKey });
      return true;
    }
  }

  return false;
}

function getPreferredAudioSources(text) {
  if (isSentenceLike(text)) {
    return sentenceAudioSources;
  }

  if (isMobileBrowser()) {
    return [
      audioSources.find((source) => source.name === 'Azure'),
      audioSources.find((source) => source.name === 'Google Cloud'),
      audioSources.find((source) => source.name === '有道')
    ].filter(Boolean);
  }

  return audioSources;
}

function getPrefetchAudioSources(text) {
  const preferredSources = getPreferredAudioSources(text);
  if (!isMobileBrowser()) return preferredSources;
  return preferredSources.filter((source) => source.name !== '有道');
}

export async function playWordWithFallback(word, hooks = {}) {
  if (!word) throw toServiceError('AUDIO_INPUT_EMPTY', 'word is required');
  if (_playbackInProgress) stopCurrentAudioPlayback();

  const playbackToken = _playbackToken + 1;
  _playbackToken = playbackToken;
  _playbackInProgress = true;
  try {
    const audioText = normalizeText(word);
    const isSentence = isSentenceLike(audioText);
    const sources = getPreferredAudioSources(audioText);
    const sourceTimeout = getSourceTimeoutForText(audioText);
    const hooksWithToken = { ...hooks, playbackToken };
    debugAudio('playWordWithFallback:start', { audioText, isSentence, sourceTimeout, playbackToken, mobile: isMobileBrowser() });
    ensurePlaybackTokenActive(playbackToken);
    try {
      const cachedPlayable = await getCachedPlayableSource(removeEmoji(audioText), sources, hooksWithToken);
      if (cachedPlayable) {
        debugAudio('playback-using-cache', audioText);
        await cachedPlayable(sourceTimeout || CONFIG.audio?.defaultTimeout || 1200);
        ensurePlaybackTokenActive(playbackToken);
        return { sourceName: 'Cache' };
      }

      const result = await runFallbackChain(
        sources,
        async (source) => {
          debugAudio('source-attempt', { source: source.name, text: audioText, timeout: sourceTimeout ?? source.timeout });
          const value = await source.play(audioText, sourceTimeout ?? source.timeout, source.options, hooksWithToken);
          debugAudio('source-success', { source: source.name, text: audioText });
          return value;
        },
        'All audio sources failed'
      );
      ensurePlaybackTokenActive(playbackToken);
      return { sourceName: result.sourceName };
    } catch (error) {
      debugAudio('fallback-to-webspeech', {
        text: audioText,
        details: error?.details || error?.message || String(error)
      });
      ensurePlaybackTokenActive(playbackToken);
      const ttsTimeout = Math.max(sourceTimeout || 0, CONFIG.audio?.defaultTimeout || 1200, 4000);
      await playWebSpeech(audioText, ttsTimeout, hooksWithToken);
      ensurePlaybackTokenActive(playbackToken);
      return { sourceName: 'TTS' };
    }
  } finally {
    if (isPlaybackTokenActive(playbackToken)) {
      _playbackInProgress = false;
      debugAudio('playWordWithFallback:end', { playbackToken });
    }
  }
}

export async function prefetchWordAudio(word, options = {}) {
  if (!CONFIG.audio?.prefetch?.enabled) return { skipped: true, reason: 'disabled' };
  const audioText = normalizeText(word);
  if (!audioText) return { skipped: true, reason: 'empty' };

  const cleanText = removeEmoji(audioText);
  const sources = getPrefetchAudioSources(audioText);
  if (!sources.length) return { skipped: true, reason: 'no-sources' };

  const hasCachedSource = await hasCachedAudioSource(cleanText, sources);
  if (hasCachedSource) {
    debugAudio('prefetch-cache-hit', { text: cleanText });
    return { skipped: true, reason: 'cached' };
  }

  const sourceTimeout = Number.isFinite(options.timeout)
    ? options.timeout
    : (isMobileBrowser()
      ? (CONFIG.audio?.prefetch?.mobileTimeout || 2200)
      : (CONFIG.audio?.prefetch?.desktopTimeout || 2800));

  try {
    const result = await runFallbackChain(
      sources,
      async (source) => {
        debugAudio('prefetch-source-attempt', { source: source.name, text: cleanText, timeout: sourceTimeout });
        const value = await prefetchFromSource(source, cleanText, sourceTimeout);
        debugAudio('prefetch-source-success', { source: source.name, text: cleanText });
        return value;
      },
      'All audio prefetch sources failed'
    );
    return { sourceName: result.sourceName };
  } catch (error) {
    debugAudio('prefetch-failed', {
      text: cleanText,
      details: error?.details || error?.message || String(error)
    });
    return { skipped: true, reason: 'failed' };
  }
}

async function prefetchFromSource(source, text, timeout) {
  if (source.name === 'Azure') {
    return prefetchAzureTTS(text, timeout, source.options || {});
  }
  if (source.name === 'Google Cloud') {
    return prefetchGoogleCloudTTS(text, timeout, source.options || {});
  }
  throw toServiceError('AUDIO_PREFETCH_UNSUPPORTED', `Prefetch unsupported for ${source.name}`);
}

function normalizeText(text) {
  return String(text || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<p[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&emsp;|&#8195;|&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/sth\./g, 'something')
    .replace(/sb\./g, 'somebody')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSourceTimeoutForText(text) {
  const normalized = String(text || '').trim();
  if (!normalized) return null;

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const hasSentencePunctuation = /[.!?;:,"]/u.test(normalized);
  const isLikelySentence = wordCount >= 8 || hasSentencePunctuation;
  if (!isLikelySentence) {
    return isMobileBrowser()
      ? (CONFIG.audio?.mobileTtsTimeout || 2800)
      : (CONFIG.audio?.desktopTtsTimeout || 3500);
  }

  // Sentence playback on mobile typically needs a wider timeout window.
  return 9000;
}

function getYoudaoTimeoutForText(text) {
  if (isSentenceLike(text)) return 1200;
  return isMobileBrowser()
    ? (CONFIG.audio?.mobileYoudaoTimeout || 1200)
    : (CONFIG.audio?.desktopYoudaoTimeout || 1800);
}

async function playYoudaoAudio(text, timeout = 1200, _options = {}, hooks = {}) {
  const cleanText = removeEmoji(text);
  const youdaoTimeout = Math.min(timeout, getYoudaoTimeoutForText(cleanText));
  debugAudio('playYoudaoAudio', { cleanText, timeout: youdaoTimeout });
  const urls = [
    `https://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(cleanText)}`,
    `https://dict.youdao.com/dictvoice?type=1&audio=${encodeURIComponent(cleanText)}`
  ];

  for (const url of urls) {
    try {
      return await playAudioUrl(url, youdaoTimeout, hooks);
    } catch {
      continue;
    }
  }
  throw toServiceError('YOUDAO_AUDIO_UNAVAILABLE', 'Youdao audio not available');
}

async function playAzureTTS(text, timeout = 1200, options = {}, hooks = {}) {
  const cleanText = removeEmoji(text);
  const source = 'azure';
  const sourceTimeout = Math.max(timeout, CONFIG.audio?.defaultTimeout || 1200, isMobileBrowser() ? 2800 : 3500);
  const voice = options.voice || CONFIG.audio.defaultVoice;
  const memoryCached = getMemoryAudioDataUrl(cleanText, source);

  if (memoryCached) {
    debugAudio('playAzureTTS:memory-cache-hit', { cleanText });
    return playAudioUrl(memoryCached, sourceTimeout, hooks);
  }

  if (!isMobileBrowser()) {
    const cached = await AudioCache.getAudio(cleanText, source);
    if (cached) {
      debugAudio('playAzureTTS:indexeddb-cache-hit', { cleanText });
      return playBlobWithFallback(cached, sourceTimeout, hooks);
    }
  }

  const apiKey = CONFIG.apiKeys.azureSpeech.key;
  const region = options.region || CONFIG.apiKeys.azureSpeech.region;
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml = `
    <speak version='1.0' xml:lang='en-US'>
      <voice xml:lang='en-US' name='${voice}'>
        ${cleanText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;')}
      </voice>
    </speak>
  `.trim();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), sourceTimeout);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
      },
      body: ssml,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) throw toServiceError('AZURE_TTS_HTTP', `Azure TTS error: ${response.status}`);

  const arrayBuffer = await response.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
  const base64 = arrayBufferToBase64(arrayBuffer);
  const dataUrl = `data:audio/mpeg;base64,${base64}`;
  setMemoryAudioDataUrl(cleanText, source, dataUrl);
  await AudioCache.setAudio(cleanText, source, blob);
  return playBlobWithFallback(blob, sourceTimeout, hooks, arrayBuffer, base64);
}

async function prefetchAzureTTS(text, timeout = 1200, options = {}) {
  const cleanText = removeEmoji(text);
  const source = 'azure';
  if (getMemoryAudioDataUrl(cleanText, source)) {
    return { sourceName: 'Azure', cached: true };
  }

  if (!isMobileBrowser()) {
    const cached = await AudioCache.getAudio(cleanText, source);
    if (cached) {
      const materialized = await materializeBlob(cached);
      const base64 = arrayBufferToBase64(materialized.arrayBuffer);
      setMemoryAudioDataUrl(cleanText, source, `data:audio/mpeg;base64,${base64}`);
      return { sourceName: 'Azure', cached: true };
    }
  }

  const sourceTimeout = Math.max(timeout, CONFIG.audio?.defaultTimeout || 1200, isMobileBrowser() ? 2200 : 2800);
  const voice = options.voice || CONFIG.audio.defaultVoice;
  const apiKey = CONFIG.apiKeys.azureSpeech.key;
  const region = options.region || CONFIG.apiKeys.azureSpeech.region;
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml = `
    <speak version='1.0' xml:lang='en-US'>
      <voice xml:lang='en-US' name='${voice}'>
        ${cleanText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;')}
      </voice>
    </speak>
  `.trim();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), sourceTimeout);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
      },
      body: ssml,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) throw toServiceError('AZURE_TTS_HTTP', `Azure TTS error: ${response.status}`);

  const arrayBuffer = await response.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
  const base64 = arrayBufferToBase64(arrayBuffer);
  setMemoryAudioDataUrl(cleanText, source, `data:audio/mpeg;base64,${base64}`);
  await AudioCache.setAudio(cleanText, source, blob);
  return { sourceName: 'Azure' };
}

async function playGoogleCloudTTS(text, timeout = 1200, options = {}, hooks = {}) {
  const cleanText = removeEmoji(text);
  const source = 'google';
  const sourceTimeout = Math.max(timeout, CONFIG.audio?.defaultTimeout || 1200, isMobileBrowser() ? 2800 : 3500);
  const voice = options.voice || 'en-US-Neural2-C';
  const memoryCached = getMemoryAudioDataUrl(cleanText, source);

  if (memoryCached) {
    debugAudio('playGoogleCloudTTS:memory-cache-hit', { cleanText });
    return playAudioUrl(memoryCached, sourceTimeout, hooks);
  }

  if (!isMobileBrowser()) {
    const cached = await AudioCache.getAudio(cleanText, source);
    if (cached) {
      debugAudio('playGoogleCloudTTS:indexeddb-cache-hit', { cleanText });
      return playBlobWithFallback(cached, sourceTimeout, hooks);
    }
  }

  const apiKey = CONFIG.apiKeys.googleCloud.tts;
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), sourceTimeout);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: cleanText },
        voice: { languageCode: 'en-US', name: voice },
        audioConfig: { audioEncoding: 'MP3' }
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) throw toServiceError('GOOGLE_TTS_HTTP', `Google Cloud TTS error: ${response.status}`);

  const data = await response.json();
  if (!data.audioContent) throw toServiceError('GOOGLE_TTS_FORMAT', 'No audio content in response');

  const audioData = atob(data.audioContent);
  const arrayBuffer = new ArrayBuffer(audioData.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < audioData.length; i++) {
    view[i] = audioData.charCodeAt(i);
  }
  const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
  const dataUrl = `data:audio/mpeg;base64,${data.audioContent}`;
  setMemoryAudioDataUrl(cleanText, source, dataUrl);
  await AudioCache.setAudio(cleanText, source, blob);
  return playBlobWithFallback(blob, sourceTimeout, hooks, arrayBuffer, data.audioContent);
}

async function prefetchGoogleCloudTTS(text, timeout = 1200, options = {}) {
  const cleanText = removeEmoji(text);
  const source = 'google';
  if (getMemoryAudioDataUrl(cleanText, source)) {
    return { sourceName: 'Google Cloud', cached: true };
  }

  if (!isMobileBrowser()) {
    const cached = await AudioCache.getAudio(cleanText, source);
    if (cached) {
      const materialized = await materializeBlob(cached);
      const base64 = arrayBufferToBase64(materialized.arrayBuffer);
      setMemoryAudioDataUrl(cleanText, source, `data:audio/mpeg;base64,${base64}`);
      return { sourceName: 'Google Cloud', cached: true };
    }
  }

  const sourceTimeout = Math.max(timeout, CONFIG.audio?.defaultTimeout || 1200, isMobileBrowser() ? 2200 : 2800);
  const voice = options.voice || 'en-US-Neural2-C';
  const apiKey = CONFIG.apiKeys.googleCloud.tts;
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), sourceTimeout);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: cleanText },
        voice: { languageCode: 'en-US', name: voice },
        audioConfig: { audioEncoding: 'MP3' }
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) throw toServiceError('GOOGLE_TTS_HTTP', `Google Cloud TTS error: ${response.status}`);

  const data = await response.json();
  if (!data.audioContent) throw toServiceError('GOOGLE_TTS_FORMAT', 'No audio content in response');

  const audioData = atob(data.audioContent);
  const arrayBuffer = new ArrayBuffer(audioData.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < audioData.length; i++) {
    view[i] = audioData.charCodeAt(i);
  }
  const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
  setMemoryAudioDataUrl(cleanText, source, `data:audio/mpeg;base64,${data.audioContent}`);
  await AudioCache.setAudio(cleanText, source, blob);
  return { sourceName: 'Google Cloud' };
}

let _audioContext = null;
let _audioContextWarmed = false;

export function warmUpAudioContext() {
  if (_audioContextWarmed) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    _audioContext = new AC();
    if (_audioContext.state === 'suspended') {
      _audioContext.resume();
    }
    _audioContextWarmed = true;
  } catch {}
}

function ensureAudioContextResumed() {
  if (_audioContext && _audioContext.state === 'suspended') {
    _audioContext.resume().catch(() => {});
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

async function materializeBlob(blob, fallbackMimeType = 'audio/mpeg') {
  if (!blob) {
    throw toServiceError('AUDIO_BLOB_EMPTY', 'Audio blob is required');
  }

  const buffer = await blob.arrayBuffer();
  return {
    blob: new Blob([buffer], { type: blob.type || fallbackMimeType }),
    arrayBuffer: buffer
  };
}

async function playBlobWithFallback(blob, timeout, hooks = {}, existingArrayBuffer = null, existingBase64 = null) {
  if (!blob) {
    throw toServiceError('AUDIO_BLOB_EMPTY', 'Audio blob is required');
  }

  let workingBlob = blob;
  let workingArrayBuffer = existingArrayBuffer;
  if (!workingArrayBuffer) {
    const materialized = await materializeBlob(blob);
    workingBlob = materialized.blob;
    workingArrayBuffer = materialized.arrayBuffer;
  }

  const preferDataUrl = isMobileBrowser();
  debugAudio('playBlobWithFallback', { preferDataUrl, size: workingBlob.size || 0, timeout });
  if (!preferDataUrl) {
    try {
      return await playAudioUrl(URL.createObjectURL(workingBlob), timeout, hooks);
    } catch {}
  }

  const base64 = existingBase64 || arrayBufferToBase64(workingArrayBuffer);
  const dataUrl = `data:audio/mpeg;base64,${base64}`;

  try {
    return await playAudioUrl(dataUrl, timeout, hooks);
  } catch (error) {
    if (preferDataUrl) {
      throw error;
    }
    return playAudioUrl(URL.createObjectURL(workingBlob), timeout, hooks);
  }
}

async function playAudioUrl(url, timeout = 3000, hooks = {}) {
  const playbackToken = Number.isInteger(hooks.playbackToken) ? hooks.playbackToken : _playbackToken;
  ensurePlaybackTokenActive(playbackToken);
  return new Promise((resolve, reject) => {
    ensurePlaybackTokenActive(playbackToken);
    const audio = new Audio(url);
    audio.preload = 'auto';
    let resolved = false;
    let started = false;
    const startupTimeoutMs = timeout > 0 ? timeout : (CONFIG.audio?.defaultTimeout || 3000);
    const maxPlaybackTimeoutMs = Math.max(startupTimeoutMs * 12, 120000);
    let startupTimeoutId = null;
    let maxPlaybackTimeoutId = null;

    const cleanupMedia = () => {
      audio.onplay = null;
      audio.onplaying = null;
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.pause();
      } catch {}
      try {
        audio.removeAttribute('src');
        audio.load();
      } catch {}
      if (typeof url === 'string' && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
    };

    const done = (fn, ...args) => {
      if (!resolved) {
        resolved = true;
        if (startupTimeoutId) clearTimeout(startupTimeoutId);
        if (maxPlaybackTimeoutId) clearTimeout(maxPlaybackTimeoutId);
        clearActivePlaybackAbort(abortPlayback);
        cleanupMedia();
        fn(...args);
      }
    };

    const abortPlayback = (error = toServiceError('AUDIO_PLAYBACK_STOPPED', 'Audio playback stopped')) => {
      try {
        audio.currentTime = 0;
      } catch {}
      done(reject, error);
    };

    const markStarted = () => {
      if (started) return;
      if (!isPlaybackTokenActive(playbackToken)) {
        abortPlayback();
        return;
      }
      started = true;
      if (typeof hooks.onPlaybackStart === 'function') {
        hooks.onPlaybackStart();
      }
      if (startupTimeoutId) clearTimeout(startupTimeoutId);
      maxPlaybackTimeoutId = setTimeout(() => {
        // If playback has started but no end event arrives (common on some mobile browsers),
        // avoid surfacing a false failure to users.
        done(resolve, { onplay: true, timeout: true });
      }, maxPlaybackTimeoutMs);
    };

    audio.onplay = markStarted;
    audio.onplaying = markStarted;
    audio.onended = () => done(resolve, { onplay: true });
    audio.onerror = () => abortPlayback(toServiceError('AUDIO_PLAYBACK_LOAD_FAILED', 'Audio load failed'));

    startupTimeoutId = setTimeout(() => {
      if (!resolved && !started) {
        abortPlayback(toServiceError('AUDIO_PLAYBACK_TIMEOUT', 'Audio startup timeout'));
      }
    }, startupTimeoutMs);

    ensureAudioContextResumed();
    setActivePlaybackAbort(abortPlayback);
    if (!isPlaybackTokenActive(playbackToken)) {
      abortPlayback();
      return;
    }
    audio.play().catch((err) => done(reject, err));
  });
}

function removeEmoji(text) {
  if (!text) return '';
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
}

export async function playWebSpeech(text, timeout = 4000, hooks = {}) {
  const playbackToken = Number.isInteger(hooks.playbackToken) ? hooks.playbackToken : _playbackToken;
  ensurePlaybackTokenActive(playbackToken);
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Web Speech API not supported'));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    let settled = false;
    let started = false;
    const startupTimeoutMs = Math.max(timeout, 2000);
    const maxPlaybackTimeoutMs = Math.max(startupTimeoutMs * 12, 120000);
    let startupTimeoutId = null;
    let maxPlaybackTimeoutId = null;
    const done = (fn, value) => {
      if (settled) return;
      settled = true;
      if (startupTimeoutId) clearTimeout(startupTimeoutId);
      if (maxPlaybackTimeoutId) clearTimeout(maxPlaybackTimeoutId);
      clearActivePlaybackAbort(abortPlayback);
      fn(value);
    };

    const abortPlayback = () => {
      try {
        window.speechSynthesis.cancel();
      } catch {}
      done(reject, toServiceError('AUDIO_PLAYBACK_STOPPED', 'Audio playback stopped'));
    };

    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => {
      if (!isPlaybackTokenActive(playbackToken)) {
        abortPlayback();
        return;
      }
      started = true;
      if (typeof hooks.onPlaybackStart === 'function') {
        hooks.onPlaybackStart();
      }
      if (startupTimeoutId) clearTimeout(startupTimeoutId);
      maxPlaybackTimeoutId = setTimeout(() => {
        try { window.speechSynthesis.cancel(); } catch {}
        done(reject, toServiceError('WEB_SPEECH_TIMEOUT', 'Web speech playback timeout'));
      }, maxPlaybackTimeoutMs);
    };
    utterance.onerror = (e) => {
      if (e.error !== 'canceled') done(reject, e);
    };
    utterance.onend = () => done(resolve);

    const voices = window.speechSynthesis.getVoices();
    const usVoice = voices.find((v) => v.lang === 'en-US') || voices.find((v) => v.lang.startsWith('en'));
    if (usVoice) utterance.voice = usVoice;
    startupTimeoutId = setTimeout(() => {
      if (!started) done(reject, toServiceError('WEB_SPEECH_TIMEOUT', 'Web speech startup timeout'));
    }, startupTimeoutMs);

    setActivePlaybackAbort(abortPlayback);
    if (!isPlaybackTokenActive(playbackToken)) {
      abortPlayback();
      return;
    }
    window.speechSynthesis.speak(utterance);
  });
}

export function prewarmSpeechSynthesis() {
  try {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
  } catch {}
}
