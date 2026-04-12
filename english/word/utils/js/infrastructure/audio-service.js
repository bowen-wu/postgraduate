import { CONFIG } from '../config.js';
import * as AudioCache from '../utils/audio-cache.js';
import { runFallbackChain } from './fallback-chain.js';
import { toServiceError } from './service-error.js';

const audioSources = [
  { name: '有道', play: playYoudaoAudio, timeout: 3500, options: { urls: ['us', 'uk'] } },
  { name: 'Azure', play: playAzureTTS, timeout: 3500, options: { voice: 'en-US-JennyNeural', region: 'eastasia' } },
  { name: 'Google Cloud', play: playGoogleCloudTTS, timeout: 3500, options: { voice: 'en-US-Neural2-C' } }
];

export async function playWordWithFallback(word) {
  if (!word) throw toServiceError('AUDIO_INPUT_EMPTY', 'word is required');

  const audioText = normalizeText(word);
  try {
    const result = await runFallbackChain(
      audioSources,
      (source) => source.play(audioText, source.timeout, source.options),
      'All audio sources failed'
    );
    return { sourceName: result.sourceName };
  } catch (error) {
    const ttsTimeout = Math.max(CONFIG.audio?.defaultTimeout || 1200, 4000);
    await playWebSpeech(audioText, ttsTimeout);
    return { sourceName: 'TTS' };
  }
}

function normalizeText(text) {
  return text.replace(/sth\./g, 'something').replace(/sb\./g, 'somebody');
}

async function playYoudaoAudio(text, timeout = 1200) {
  const cleanText = removeEmoji(text);
  const urls = [
    `https://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(cleanText)}`,
    `https://dict.youdao.com/dictvoice?type=1&audio=${encodeURIComponent(cleanText)}`
  ];

  for (const url of urls) {
    try {
      return await playAudioUrl(url, timeout);
    } catch {
      continue;
    }
  }
  throw toServiceError('YOUDAO_AUDIO_UNAVAILABLE', 'Youdao audio not available');
}

async function playAzureTTS(text, timeout = 1200, options = {}) {
  const cleanText = removeEmoji(text);
  const source = 'azure';
  const sourceTimeout = Math.max(timeout, CONFIG.audio?.defaultTimeout || 1200, 3500);
  const voice = options.voice || CONFIG.audio.defaultVoice;
  const cached = await AudioCache.getAudio(cleanText, source);

  if (cached) {
    return playAudioUrl(URL.createObjectURL(cached), sourceTimeout);
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
  await AudioCache.setAudio(cleanText, source, blob);
  return playAudioUrl(URL.createObjectURL(blob), sourceTimeout);
}

async function playGoogleCloudTTS(text, timeout = 1200, options = {}) {
  const cleanText = removeEmoji(text);
  const source = 'google';
  const sourceTimeout = Math.max(timeout, CONFIG.audio?.defaultTimeout || 1200, 3500);
  const voice = options.voice || 'en-US-Neural2-C';
  const cached = await AudioCache.getAudio(cleanText, source);

  if (cached) {
    return playAudioUrl(URL.createObjectURL(cached), sourceTimeout);
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
  const blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
  await AudioCache.setAudio(cleanText, source, blob);
  return playAudioUrl(URL.createObjectURL(blob), sourceTimeout);
}

async function playAudioUrl(url, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    let resolved = false;
    let started = false;
    const startupTimeoutMs = timeout > 0 ? timeout : (CONFIG.audio?.defaultTimeout || 3000);
    const maxPlaybackTimeoutMs = Math.max(startupTimeoutMs * 6, 15000);
    let startupTimeoutId = null;
    let maxPlaybackTimeoutId = null;

    const done = (fn, ...args) => {
      if (!resolved) {
        resolved = true;
        if (startupTimeoutId) clearTimeout(startupTimeoutId);
        if (maxPlaybackTimeoutId) clearTimeout(maxPlaybackTimeoutId);
        fn(...args);
      }
    };

    const markStarted = () => {
      if (started) return;
      started = true;
      if (startupTimeoutId) clearTimeout(startupTimeoutId);
      maxPlaybackTimeoutId = setTimeout(() => {
        try { audio.pause(); } catch {}
        done(reject, toServiceError('AUDIO_PLAYBACK_TIMEOUT', 'Audio playback timeout'));
      }, maxPlaybackTimeoutMs);
    };

    audio.onplay = markStarted;
    audio.onplaying = markStarted;
    audio.onended = () => done(resolve, { onplay: true });
    audio.onerror = () => done(reject, toServiceError('AUDIO_PLAYBACK_LOAD_FAILED', 'Audio load failed'));

    startupTimeoutId = setTimeout(() => {
      if (!resolved && !started) done(reject, toServiceError('AUDIO_PLAYBACK_TIMEOUT', 'Audio startup timeout'));
    }, startupTimeoutMs);

    audio.play().catch((err) => done(reject, err));
  });
}

function removeEmoji(text) {
  if (!text) return '';
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
}

export async function playWebSpeech(text, timeout = 4000) {
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
    const maxPlaybackTimeoutMs = Math.max(startupTimeoutMs * 6, 15000);
    let startupTimeoutId = null;
    let maxPlaybackTimeoutId = null;
    const done = (fn, value) => {
      if (settled) return;
      settled = true;
      if (startupTimeoutId) clearTimeout(startupTimeoutId);
      if (maxPlaybackTimeoutId) clearTimeout(maxPlaybackTimeoutId);
      fn(value);
    };

    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => {
      started = true;
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
