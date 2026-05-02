import { getComplexSentenceIdsForUnitPath } from '../application/writing-assignment.js';

const RAW_DAILY_SENTENCE_URL = 'https://raw.githubusercontent.com/bowen-wu/postgraduate/refs/heads/master/english/grammar/daily-sentence.md';

let _complexSentenceMapPromise = null;

function normalizeTextBlock(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function parseDailySentenceMarkdown(markdownText) {
  const result = {};
  const sectionPattern = /^##\s*(\d{3})\s*$/gm;
  const sections = [...String(markdownText || '').matchAll(sectionPattern)];

  const extract = (text, startHeading, endHeading = null) => {
    const startPattern = new RegExp(`^###\\s*${startHeading}\\s*$`, 'm');
    const startMatch = text.match(startPattern);
    if (!startMatch || startMatch.index === undefined) return '';

    const afterStart = text.slice(startMatch.index + startMatch[0].length);
    if (!endHeading) return afterStart;

    const endPattern = new RegExp(`^###\\s*${endHeading}\\s*$`, 'm');
    const endMatch = afterStart.match(endPattern);
    return endMatch ? afterStart.slice(0, endMatch.index) : afterStart;
  };

  for (let i = 0; i < sections.length; i++) {
    const id = sections[i][1];
    const start = sections[i].index + sections[i][0].length;
    const end = i + 1 < sections.length ? sections[i + 1].index : markdownText.length;
    const sectionText = markdownText.slice(start, end);

    const prompt = normalizeTextBlock(extract(sectionText, '思考', '原句'));
    const sentence = normalizeTextBlock(extract(sectionText, '原句'));
    if (!prompt || !sentence) continue;

    result[id] = { id, prompt, sentence };
  }

  return result;
}

async function loadComplexSentenceMap() {
  if (_complexSentenceMapPromise) return _complexSentenceMapPromise;

  _complexSentenceMapPromise = (async () => {
    const response = await fetch(RAW_DAILY_SENTENCE_URL);
    if (!response.ok) {
      throw new Error(`Failed to load daily sentence source (${response.status})`);
    }
    const markdown = await response.text();
    return parseDailySentenceMarkdown(markdown);
  })();

  return _complexSentenceMapPromise;
}

export async function buildComplexSentenceCardsForUnit(unitPath) {
  const ids = getComplexSentenceIdsForUnitPath(unitPath);
  if (!ids || ids.length === 0) return [];

  const map = await loadComplexSentenceMap();
  return ids
    .map((id) => {
      const item = map[id];
      if (!item) return null;
      return {
        id: `complex_sentence_${id}`,
        word: `长难句 ${id}`,
        type: 'complex-sentence',
        prompt: item.prompt,
        displayWord: item.sentence,
        items: [{ type: 'sentence', en: item.sentence, cn: '' }]
      };
    })
    .filter(Boolean);
}
