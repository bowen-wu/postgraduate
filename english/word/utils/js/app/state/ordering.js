function createSeededRandom(seed) {
  let t = Number.isInteger(seed) ? seed : Date.now();
  return function seededRandom() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(array, randomFn = Math.random) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isWritingCard(card) {
  if (!card) return false;
  if (typeof card.id === 'string' && card.id.startsWith('writing_')) return true;
  return false;
}

export function generateDisplayOrder(cards, orderMode, orderSeed = null) {
  const indices = cards.map((_, i) => i);
  const writingIndices = [];
  const regularIndices = [];
  const randomFn = createSeededRandom(orderSeed);
  indices.forEach((idx) => {
    if (isWritingCard(cards[idx])) writingIndices.push(idx);
    else regularIndices.push(idx);
  });

  switch (orderMode) {
    case 'sequential':
      return [...regularIndices, ...writingIndices];
    case 'randomByType': {
      const byType = { prefix: [], word: [], phrase: [], sentence: [], table: [], 'complex-sentence': [], contrast: [] };
      regularIndices.forEach((idx) => {
        const card = cards[idx];
        if (byType[card.type]) byType[card.type].push(idx);
      });
      return [
        ...shuffle(byType.prefix, randomFn),
        ...shuffle(byType.word, randomFn),
        ...shuffle(byType.phrase, randomFn),
        ...shuffle(byType.sentence, randomFn),
        ...shuffle(byType.table, randomFn),
        ...shuffle(byType['complex-sentence'], randomFn),
        ...shuffle(byType.contrast, randomFn),
        ...writingIndices
      ];
    }
    case 'randomAll':
      return [...shuffle(regularIndices, randomFn), ...writingIndices];
    default:
      return [...regularIndices, ...writingIndices];
  }
}
