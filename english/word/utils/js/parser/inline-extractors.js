export function extractItalicWords(parser, text, extractedCards, indentLevel = 0) {
  return String(text || '').replace(/[*_]([a-zA-Z'-]+)\(([^*_]*?)\)[*_]/g, (_match, word, def) => {
    if (parser.hasPosMarker(def)) {
      const card = parser.createWordCard(`${word} ${def}`, indentLevel);
      extractedCards.push(card);
      return word;
    }
    return word;
  });
}

export function extractInsPhrases(parser, text, extractedCards, indentLevel, boldPlaceholders = []) {
  return String(text || '').replace(/<ins>(.*?)<\/ins>/g, (_match, phrase) => {
    let cleanPhrase = String(phrase || '').replace(/\*/g, '').trim();
    cleanPhrase = cleanPhrase.replace(/\{\{BOLD:(\d+)\}\}/g, (placeholderMatch, index) => {
      return boldPlaceholders[index] || placeholderMatch;
    });

    const card = parser.createPhraseCard(cleanPhrase, indentLevel);
    extractedCards.push(card);
    return cleanPhrase;
  });
}
