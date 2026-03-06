function hasDuplicateRelation(collection, word) {
  return collection.some((entry) => entry.word === word);
}

export function addSynonymToParent(parser, content, indentLevel) {
  if (!parser.parentCard) {
    return undefined;
  }

  finalizePendingSynonymIfNeeded(parser, indentLevel);

  const synonymContent = content.replace(/^===?\s+/, '').trim();
  parser.parentCard.synonyms = parser.parentCard.synonyms || [];

  const multipleSynonyms = synonymContent.split(/\s*==\s*/).map((item) => item.trim()).filter(Boolean);
  const originalParentCard = parser.parentCard;
  const originalParentLevel = parser.parentLevel;

  for (const syn of multipleSynonyms) {
    parser.parentCard = originalParentCard;
    parser.parentLevel = originalParentLevel;

    const { word, ipa, pos, cn } = parser.parseWordContent(syn);
    if (!word) {
      continue;
    }

    if (pos && cn) {
      const synonym = { word };
      if (ipa) synonym.ipa = ipa;
      if (pos) synonym.pos = pos;
      if (cn) synonym.cn = cn;

      if (!hasDuplicateRelation(parser.parentCard.synonyms, word)) {
        parser.parentCard.synonyms.push(synonym);
      }
      continue;
    }

    const isLastSynonym = multipleSynonyms.indexOf(syn) === multipleSynonyms.length - 1;
    if (isLastSynonym) {
      parser.pendingSynonymCard = {
        word,
        items: []
      };
      if (ipa) {
        parser.pendingSynonymCard.ipa = ipa;
      }
      parser.pendingSynonymLevel = indentLevel;
      parser.pendingSynonymOriginalParent = parser.parentCard;
      parser.pendingSynonymOriginalLevel = parser.parentLevel;
      parser.parentCard = parser.pendingSynonymCard;
      parser.parentLevel = indentLevel;
      continue;
    }

    const synonym = { word };
    if (ipa) synonym.ipa = ipa;

    if (!hasDuplicateRelation(parser.parentCard.synonyms, word)) {
      parser.parentCard.synonyms.push(synonym);
    }
  }

  return undefined;
}

export function addAntonymToParent(parser, content, indentLevel) {
  let wordParentCard = null;

  if (parser.parentCard && parser.parentCard.type === 'word') {
    wordParentCard = parser.parentCard;
  } else {
    for (let i = parser.cards.length - 1; i >= 0; i--) {
      const card = parser.cards[i];
      if (card.type === 'word' || card.type === 'phrase' || card.type === 'prefix') {
        wordParentCard = card;
        break;
      }
      if (card.type === 'sentence') {
        break;
      }
    }
  }

  if (!wordParentCard) {
    return;
  }

  const antonymContent = content.replace(/^Opposite:\s*/, '').trim();
  wordParentCard.antonyms = wordParentCard.antonyms || [];

  const { word, ipa, pos, cn } = parser.parseWordContent(antonymContent);
  const antonym = { word };
  if (ipa) antonym.ipa = ipa;
  if (pos) antonym.pos = pos;
  if (cn) antonym.cn = cn;

  if (!pos && !cn) {
    parser.pendingAntonymCard = {
      word,
      items: []
    };
    if (ipa) {
      parser.pendingAntonymCard.ipa = ipa;
    }
    parser.pendingAntonymLevel = indentLevel;
    parser.pendingAntonymOriginalParent = wordParentCard;
    parser.pendingAntonymOriginalLevel = parser.parentLevel;
    parser.parentCard = parser.pendingAntonymCard;
    parser.parentLevel = indentLevel;
    return;
  }

  wordParentCard.antonyms.push(antonym);
}

export function addPosToParent(parser, content) {
  if (!parser.parentCard) {
    return;
  }

  const posMatch = content.match(/^([a-z]+\.)\s*(.*)/);
  if (!posMatch) {
    return;
  }

  const pos = posMatch[1];
  const cn = posMatch[2].trim();
  const placeholderIndex = parser.parentCard.items.findIndex(
    (item) => item.en === parser.parentCard.word && item.cn === ''
  );

  if (placeholderIndex !== -1) {
    parser.parentCard.items.splice(placeholderIndex, 1);
  }

  parser.parentCard.items.push({
    type: 'def',
    en: pos,
    cn
  });
}

export function addIpaToParent(parser, content) {
  if (parser.parentCard && !parser.parentCard.ipa) {
    parser.parentCard.ipa = content.trim();
  }
}

export function finalizePendingSynonymIfNeeded(parser, currentIndentLevel) {
  if (!parser.pendingSynonymCard || currentIndentLevel > parser.pendingSynonymLevel) {
    return;
  }

  const synonym = {
    word: parser.pendingSynonymCard.word
  };

  if (parser.pendingSynonymCard.ipa) {
    synonym.ipa = parser.pendingSynonymCard.ipa;
  }

  if (parser.pendingSynonymCard.items && parser.pendingSynonymCard.items.length > 0) {
    synonym.items = parser.pendingSynonymCard.items;
  }

  if (parser.pendingSynonymOriginalParent) {
    parser.pendingSynonymOriginalParent.synonyms = parser.pendingSynonymOriginalParent.synonyms || [];
    if (!hasDuplicateRelation(parser.pendingSynonymOriginalParent.synonyms, synonym.word)) {
      parser.pendingSynonymOriginalParent.synonyms.push(synonym);
    }
  }

  parser.parentCard = parser.pendingSynonymOriginalParent;
  parser.parentLevel = parser.pendingSynonymOriginalLevel;
  parser.pendingSynonymCard = null;
  parser.pendingSynonymLevel = -1;
  parser.pendingSynonymOriginalParent = null;
  parser.pendingSynonymOriginalLevel = -1;
}

export function finalizePendingAntonymIfNeeded(parser, currentIndentLevel) {
  if (!parser.pendingAntonymCard || currentIndentLevel > parser.pendingAntonymLevel) {
    return;
  }

  const antonym = {
    word: parser.pendingAntonymCard.word
  };

  if (parser.pendingAntonymCard.ipa) {
    antonym.ipa = parser.pendingAntonymCard.ipa;
  }

  if (parser.pendingAntonymCard.items && parser.pendingAntonymCard.items.length > 0) {
    antonym.items = parser.pendingAntonymCard.items;
  }

  if (parser.pendingAntonymOriginalParent) {
    parser.pendingAntonymOriginalParent.antonyms = parser.pendingAntonymOriginalParent.antonyms || [];
    if (!hasDuplicateRelation(parser.pendingAntonymOriginalParent.antonyms, antonym.word)) {
      parser.pendingAntonymOriginalParent.antonyms.push(antonym);
    }
  }

  parser.parentCard = parser.pendingAntonymOriginalParent;
  parser.parentLevel = parser.pendingAntonymOriginalLevel;
  parser.pendingAntonymCard = null;
  parser.pendingAntonymLevel = -1;
  parser.pendingAntonymOriginalParent = null;
  parser.pendingAntonymOriginalLevel = -1;
}
