import { getComplexSentenceIdsForUnitPath } from '../application/writing-assignment.js';
import { parseMarkdownToCards } from '../parser/index.js';

const RAW_DAILY_SENTENCE_URL = 'https://raw.githubusercontent.com/bowen-wu/postgraduate/refs/heads/master/english/grammar/daily-sentence.md';

let _complexSentenceMapPromise = null;
let _cardCounter = 0;

function normalizeTextBlock(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function normalizeSentenceLine(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function extractSentenceFromRawBlock(rawText) {
  const lines = String(rawText || '').split('\n');
  const firstNonEmptyIndex = lines.findIndex((line) => line.trim() !== '');
  if (firstNonEmptyIndex < 0) return '';

  const firstLine = lines[firstNonEmptyIndex] || '';
  const isListSentence = /^\s*-\s+/.test(firstLine);

  if (!isListSentence) {
    return lines
      .map((line) => normalizeSentenceLine(line))
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  const parts = [normalizeSentenceLine(firstLine.replace(/^\s*-\s+/, ''))];
  for (let i = firstNonEmptyIndex + 1; i < lines.length; i++) {
    const line = lines[i] || '';
    if (!line.trim()) continue;
    if (/^\s*-\s+/.test(line)) break;
    parts.push(normalizeSentenceLine(line));
  }
  return parts.filter(Boolean).join(' ').trim();
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
    const sentenceRaw = extract(sectionText, '原句');
    const sentence = extractSentenceFromRawBlock(sentenceRaw);
    if (!prompt || !sentence) continue;

    result[id] = { id, prompt, sentence, sentenceRaw };
  }

  return result;
}

function parseSentenceBlockWithParser(rawSentenceBlock, sentenceId) {
  const raw = String(rawSentenceBlock || '').trim();
  const lines = raw.split('\n');
  const firstNonEmptyIndex = lines.findIndex((line) => line.trim() !== '');
  if (firstNonEmptyIndex >= 0 && !/^\s*-\s+/.test(lines[firstNonEmptyIndex])) {
    lines[firstNonEmptyIndex] = `- ${lines[firstNonEmptyIndex].trim()}`;
  }
  const normalizedRaw = lines.join('\n');
  const syntheticMarkdown = `## ${sentenceId}\n${normalizedRaw}\n`;
  const parsedCards = parseMarkdownToCards(syntheticMarkdown);
  const sentenceCards = parsedCards.filter((card) => card && card.type === 'sentence');
  const sentenceCard = sentenceCards.sort((a, b) => {
    const aLen = String(a?.items?.[0]?.en || a?.word || '').length;
    const bLen = String(b?.items?.[0]?.en || b?.word || '').length;
    return bLen - aLen;
  })[0] || null;
  const relationCards = parsedCards.filter((card) => card && (card.type === 'word' || card.type === 'phrase'));
  return { sentenceCard, relationCards };
}

function copyCardWithNewId(card, sentenceId) {
  if (!card || !card.type || !card.word) return null;
  const prefix = card.type === 'phrase' ? 'complex_phrase' : 'complex_word';
  return {
    ...card,
    id: nextCardId(`${prefix}_${sentenceId}`)
  };
}

function extractExtraCardsFromRawSentenceBlock(rawSentenceBlock, sentenceId) {
  const { relationCards } = parseSentenceBlockWithParser(rawSentenceBlock, sentenceId);
  return relationCards
    .map((card) => copyCardWithNewId(card, sentenceId))
    .filter(Boolean);
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

function nextCardId(prefix) {
  _cardCounter += 1;
  return `${prefix}_${Date.now()}_${_cardCounter}`;
}

function extractExtraCardsFromSentence(sentence, sentenceId) {
  const cards = [];
  const seenWords = new Set();
  const seenPhrases = new Set();
  const text = String(sentence || '');

  // Extract word cards from markdown italic markers:
  // *townsfolk(n. 镇民; 市民)*
  text.replace(/[*_]([a-zA-Z'-]+)\(([^*_]*?)\)[*_]/g, (_m, word, def) => {
    const cleanWord = String(word || '').trim();
    const cleanDef = String(def || '').trim();
    if (!cleanWord || !cleanDef) return cleanWord;
    const key = cleanWord.toLowerCase();
    if (seenWords.has(key)) return cleanWord;
    seenWords.add(key);
    cards.push({
      id: nextCardId(`complex_word_${sentenceId}`),
      word: cleanWord,
      type: 'word',
      items: [{ type: 'def', en: '', cn: cleanDef }]
    });
    return cleanWord;
  });

  // Extract phrase cards from <ins>...</ins>, keeping optional Chinese note in parentheses.
  text.replace(/<ins>(.*?)<\/ins>/gi, (_m, rawPhrase) => {
    const cleaned = String(rawPhrase || '').replace(/\*\*/g, '').trim();
    if (!cleaned) return cleaned;

    const match = cleaned.match(/^(.+?)\(([^()]*)\)\s*$/);
    const phrase = (match ? match[1] : cleaned).trim();
    const cn = (match ? match[2] : '').trim();
    const key = phrase.toLowerCase();
    if (!phrase || seenPhrases.has(key)) return cleaned;
    seenPhrases.add(key);

    cards.push({
      id: nextCardId(`complex_phrase_${sentenceId}`),
      word: phrase,
      type: 'phrase',
      items: [{ type: 'def', en: phrase, cn }]
    });
    return cleaned;
  });

  return cards;
}

function mergeCardsByTypeAndWord(cards) {
  const seen = new Set();
  const merged = [];
  cards.forEach((card) => {
    const key = `${card.type}:${String(card.word || '').toLowerCase()}`;
    if (!card.word || seen.has(key)) return;
    seen.add(key);
    merged.push(card);
  });
  return merged;
}

export const __testables = {
  parseDailySentenceMarkdown,
  extractExtraCardsFromRawSentenceBlock,
  parseSentenceBlockWithParser
};

export async function buildComplexSentenceCardsForUnit(unitPath) {
  const ids = getComplexSentenceIdsForUnitPath(unitPath);
  if (!ids || ids.length === 0) return [];

  const map = await loadComplexSentenceMap();
  return ids
    .map((id) => {
      const item = map[id];
      if (!item) return null;
      const parsed = parseSentenceBlockWithParser(item.sentenceRaw, id);
      const cleanedSentence = parsed.sentenceCard?.items?.[0]?.en || item.sentence;
      const cleanedDisplayWord = parsed.sentenceCard?.displayWord || cleanedSentence;
      const complexCard = {
        id: `complex_sentence_${id}`,
        word: item.prompt,
        type: 'complex-sentence',
        prompt: item.prompt,
        complexSentenceLabel: `长难句 ${id}`,
        displayWord: cleanedDisplayWord,
        items: [{ type: 'sentence', en: cleanedSentence, cn: '' }]
      };
      const inlineExtraCards = extractExtraCardsFromSentence(item.sentence, id);
      const rawBlockExtraCards = extractExtraCardsFromRawSentenceBlock(item.sentenceRaw, id);
      const extraCards = mergeCardsByTypeAndWord([...rawBlockExtraCards, ...inlineExtraCards]);
      return [...extraCards, complexCard];
    })
    .filter(Boolean)
    .flat();
}
