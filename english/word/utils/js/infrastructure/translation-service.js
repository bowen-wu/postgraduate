import { CONFIG } from '../config.js';

const translationSources = [
  { name: 'Google', translate: translateWithGoogle, timeout: CONFIG.translation.defaultTimeout, options: {} },
  { name: 'Azure', translate: translateWithAzure, timeout: CONFIG.translation.defaultTimeout, options: { region: CONFIG.apiKeys.azureTranslator.region } }
];

export async function translateTextWithFallback(text) {
  if (!text || !text.trim()) {
    throw new Error('No text to translate');
  }

  const cleanText = normalizeText(text);
  if (!cleanText) {
    throw new Error('No text to translate after cleaning');
  }

  return tryTranslationChain(cleanText, translationSources, 0);
}

function normalizeText(text) {
  return text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/sth\./gi, 'something')
    .replace(/sb\./gi, 'somebody')
    .trim();
}

async function tryTranslationChain(text, sources, index) {
  if (index >= sources.length) {
    throw new Error('All translation services failed');
  }

  const source = sources[index];
  try {
    const translation = await source.translate(text, source.timeout, source.options);
    return { translation, sourceName: source.name };
  } catch (_error) {
    return tryTranslationChain(text, sources, index + 1);
  }
}

async function translateWithAzure(text, timeout, options = {}) {
  const apiKey = CONFIG.apiKeys.azureTranslator.key;
  const region = options.region || CONFIG.apiKeys.azureTranslator.region;
  const targetLang = CONFIG.translation.targetLanguage;
  const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${targetLang}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{ Text: text }]),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`Azure Translator error: ${response.status}`);

    const data = await response.json();
    if (!data || !data[0] || !data[0].translations || !data[0].translations[0]) {
      throw new Error('Invalid Azure response format');
    }
    return data[0].translations[0].text;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function translateWithGoogle(text, timeout) {
  const apiKey = CONFIG.apiKeys.googleCloud.translation;
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: 'zh-CN',
        format: 'text'
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`Google Translate error: ${response.status}`);

    const data = await response.json();
    if (!data || !data.data || !data.data.translations || !data.data.translations[0]) {
      throw new Error('Invalid Google response format');
    }
    return data.data.translations[0].translatedText;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
