import { CONFIG } from '../config.js';
import { prefetchWordAudio } from './audio-service.js';

const prefetchedKeys = new Set();
const inflightKeys = new Set();
let queuePrefetchSessionId = 0;
let relationPrefetchSessionId = 0;

function normalizePrefetchKey(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function extractCardAudioText(card) {
  if (!card) return '';

  if (card.type === 'sentence' || card.type === 'complex-sentence') {
    return String(card.items?.[0]?.en || card.word || '').trim();
  }

  if (card.type === 'word' || card.type === 'phrase') {
    return String(card.word || '').trim();
  }

  return '';
}

function collectRelationTexts(entries = [], seen = new Set()) {
  const texts = [];

  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;

    const word = String(entry.word || '').trim();
    const key = normalizePrefetchKey(word);
    if (key && !seen.has(key)) {
      seen.add(key);
      texts.push(word);
    }

    texts.push(...collectRelationTexts(entry.synonyms || [], seen));
    texts.push(...collectRelationTexts(entry.antonyms || [], seen));
    texts.push(...collectRelationTexts(entry.similars || [], seen));
  });

  return texts;
}

export function extractCurrentCardRelationAudioTexts(card) {
  if (!card) return [];
  if (card.type !== 'word' && card.type !== 'phrase' && card.type !== 'prefix') {
    return [];
  }

  const seen = new Set();
  return [
    ...collectRelationTexts(card.synonyms, seen),
    ...collectRelationTexts(card.antonyms, seen),
    ...collectRelationTexts(card.similars, seen)
  ];
}

function getUpcomingCards(state, startIndex, count) {
  const cards = [];
  for (let offset = 0; offset < count; offset += 1) {
    const displayIndex = startIndex + offset;
    if (displayIndex < 0 || displayIndex >= state.displayOrder.length) break;
    const cardIndex = state.displayOrder[displayIndex];
    const card = state.cards[cardIndex];
    if (card) cards.push(card);
  }
  return cards;
}

async function prefetchText(text) {
  const key = normalizePrefetchKey(text);
  if (!key || prefetchedKeys.has(key) || inflightKeys.has(key)) return;

  inflightKeys.add(key);
  try {
    const result = await prefetchWordAudio(text);
    if (!result?.skipped || result?.reason === 'cached') {
      prefetchedKeys.add(key);
    }
  } finally {
    inflightKeys.delete(key);
  }
}

export function resetAudioPrefetchSession() {
  queuePrefetchSessionId += 1;
  relationPrefetchSessionId += 1;
}

export async function prefetchUpcomingCardAudio(state, options = {}) {
  if (!CONFIG.audio?.prefetch?.enabled) return;
  if (!state?.cards?.length || !state?.displayOrder?.length) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

  const count = Number.isInteger(options.count)
    ? options.count
    : (CONFIG.audio?.prefetch?.count || 3);
  const startIndex = Number.isInteger(options.startIndex)
    ? options.startIndex
    : state.currentIndex;
  const delayMs = Number.isInteger(options.delayMs)
    ? options.delayMs
    : (CONFIG.audio?.prefetch?.delayMs || 120);

  const sessionId = ++queuePrefetchSessionId;
  const cards = getUpcomingCards(state, startIndex, count);

  for (const card of cards) {
    if (sessionId !== queuePrefetchSessionId) return;
    const text = extractCardAudioText(card);
    if (!text) continue;
    await prefetchText(text);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function prefetchCurrentCardRelationAudio(state) {
  if (!CONFIG.audio?.prefetch?.enabled) return;
  if (!state?.cards?.length || !state?.displayOrder?.length) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

  const cardIndex = state.displayOrder[state.currentIndex];
  const card = state.cards[cardIndex];
  const relationTexts = extractCurrentCardRelationAudioTexts(card);
  if (!relationTexts.length) return;

  const sessionId = ++relationPrefetchSessionId;

  await Promise.all(
    relationTexts.map(async (text) => {
      if (sessionId !== relationPrefetchSessionId) return;
      await prefetchText(text);
    })
  );
}
