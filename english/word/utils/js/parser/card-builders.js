export function buildBaseCard(id, word, type) {
  return { id, word, type, items: [] };
}

export function buildWordCard(args) {
  const { id, content, parseWordContent, parentCard } = args;
  const { word, ipa, pos, cn, synonyms } = parseWordContent(content);

  const card = {
    id,
    word,
    type: 'word',
    items: []
  };

  if (ipa) card.ipa = ipa;
  if (pos) {
    card.items.push({ type: 'def', en: pos, cn: cn || '' });
  } else if (cn) {
    card.items.push({ type: 'def', en: word, cn });
  } else if (!ipa) {
    card.items.push({ type: 'def', en: word, cn: '' });
  }

  if (synonyms && synonyms.length > 0) {
    card.synonyms = synonyms;
  }

  const isSimpleDictionaryEntry = ipa && pos && cn &&
    !/[a-zA-Z]/.test(cn) &&
    parentCard &&
    parentCard.type === 'sentence';

  return { card, shouldSetAsParent: !isSimpleDictionaryEntry };
}

export function buildPhraseCard(id, content, parsePhraseContent) {
  const { word, cn } = parsePhraseContent(content);
  return {
    id,
    word,
    type: 'phrase',
    items: [{ type: 'def', en: word, cn: cn || '' }]
  };
}

export function buildPrefixCard(id, content) {
  const trimmed = content.trim();
  const cnMatch = trimmed.match(/[\u4e00-\u9fa5]/);
  const englishPart = cnMatch ? trimmed.substring(0, trimmed.indexOf(cnMatch[0])).trim() : trimmed;
  const chinesePart = cnMatch ? trimmed.substring(trimmed.indexOf(cnMatch[0])).trim() : '';

  return {
    id,
    word: englishPart,
    type: 'prefix',
    items: [{ type: 'def', en: englishPart, cn: chinesePart }]
  };
}
