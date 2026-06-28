function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isWritingCard(card) {
  if (!card) return false;
  if (typeof card.id === 'string' && card.id.startsWith('writing_')) return true;
  return false;
}

export function generateDisplayOrder(cards, orderMode) {
  const indices = cards.map((_, i) => i);
  const writingIndices = [];
  const regularIndices = [];
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
        ...shuffle(byType.prefix),
        ...shuffle(byType.word),
        ...shuffle(byType.phrase),
        ...shuffle(byType.sentence),
        ...shuffle(byType.table),
        ...shuffle(byType['complex-sentence']),
        ...shuffle(byType.contrast),
        ...writingIndices
      ];
    }
    case 'randomAll':
      return [...shuffle(regularIndices), ...writingIndices];
    default:
      return [...regularIndices, ...writingIndices];
  }
}
