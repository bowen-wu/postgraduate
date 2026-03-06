function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateDisplayOrder(cards, orderMode) {
  const indices = cards.map((_, i) => i);

  switch (orderMode) {
    case 'sequential':
      return indices;
    case 'randomByType': {
      const byType = { prefix: [], word: [], phrase: [], sentence: [] };
      cards.forEach((card, i) => {
        if (byType[card.type]) byType[card.type].push(i);
      });
      return [
        ...shuffle(byType.prefix),
        ...shuffle(byType.word),
        ...shuffle(byType.phrase),
        ...shuffle(byType.sentence)
      ];
    }
    case 'randomAll':
      return shuffle(indices);
    default:
      return indices;
  }
}
