function hasDuplicateRelation(collection, word) {
  return collection.some((entry) => entry.word === word);
}

function parsePhraseRelationCandidate(parser, candidate) {
  const raw = String(candidate || '').trim();
  const match = raw.match(/^[*_]([a-zA-Z'-]+)\(([^*_]*?)\)[*_]\s+(.+)$/);
  if (!match) return null;

  const [, word, def, tail] = match;
  if (!parser.hasPosMarker(def)) return null;

  const { ipa, pos, cn } = parser.parseWordContent(`${word} ${def}`);
  return {
    word: `${word} ${tail}`.trim(),
    ipa: ipa || '',
    pos: pos || '',
    cn: cn || ''
  };
}

function parseMultipleRelationItems(content, markerRegex) {
  const relationContent = content.replace(markerRegex, '').trim();
  return relationContent.split(/\s*==\s*/).map((item) => item.trim()).filter(Boolean);
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

    if (parser.parentCard && parser.parentCard.type === 'phrase') {
      const phraseRelation = parsePhraseRelationCandidate(parser, syn);
      if (phraseRelation) {
        const synonym = { word: phraseRelation.word };
        if (phraseRelation.ipa) synonym.ipa = phraseRelation.ipa;
        if (phraseRelation.pos) synonym.pos = phraseRelation.pos;
        if (phraseRelation.cn) synonym.cn = phraseRelation.cn;
        if (!hasDuplicateRelation(parser.parentCard.synonyms, synonym.word)) {
          parser.parentCard.synonyms.push(synonym);
        }
        continue;
      }
    }

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

export function addSimilarToParent(parser, content, indentLevel) {
  if (!parser.parentCard) {
    return undefined;
  }

  finalizePendingSimilarIfNeeded(parser, indentLevel);

  parser.parentCard.similars = parser.parentCard.similars || [];
  const multipleSimilars = parseMultipleRelationItems(content, /^Similar:\s*/);
  const originalParentCard = parser.parentCard;
  const originalParentLevel = parser.parentLevel;

  for (const candidate of multipleSimilars) {
    parser.parentCard = originalParentCard;
    parser.parentLevel = originalParentLevel;

    const { word, ipa, pos, cn } = parser.parseWordContent(candidate);
    if (!word) continue;

    if (pos && cn) {
      const similar = { word };
      if (ipa) similar.ipa = ipa;
      if (pos) similar.pos = pos;
      if (cn) similar.cn = cn;
      if (!hasDuplicateRelation(parser.parentCard.similars, word)) {
        parser.parentCard.similars.push(similar);
      }
      continue;
    }

    const isLast = multipleSimilars.indexOf(candidate) === multipleSimilars.length - 1;
    if (isLast) {
      parser.pendingSimilarCard = {
        word,
        items: []
      };
      if (ipa) parser.pendingSimilarCard.ipa = ipa;
      parser.pendingSimilarLevel = indentLevel;
      parser.pendingSimilarOriginalParent = parser.parentCard;
      parser.pendingSimilarOriginalLevel = parser.parentLevel;
      parser.parentCard = parser.pendingSimilarCard;
      parser.parentLevel = indentLevel;
      continue;
    }

    const similar = { word };
    if (ipa) similar.ipa = ipa;
    if (!hasDuplicateRelation(parser.parentCard.similars, word)) {
      parser.parentCard.similars.push(similar);
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

export function finalizePendingSimilarIfNeeded(parser, currentIndentLevel) {
  if (!parser.pendingSimilarCard || currentIndentLevel > parser.pendingSimilarLevel) {
    return;
  }

  const similar = {
    word: parser.pendingSimilarCard.word
  };

  if (parser.pendingSimilarCard.ipa) {
    similar.ipa = parser.pendingSimilarCard.ipa;
  }

  if (parser.pendingSimilarCard.items && parser.pendingSimilarCard.items.length > 0) {
    similar.items = parser.pendingSimilarCard.items;
  }

  if (parser.pendingSimilarOriginalParent) {
    parser.pendingSimilarOriginalParent.similars = parser.pendingSimilarOriginalParent.similars || [];
    if (!hasDuplicateRelation(parser.pendingSimilarOriginalParent.similars, similar.word)) {
      parser.pendingSimilarOriginalParent.similars.push(similar);
    }
  }

  parser.parentCard = parser.pendingSimilarOriginalParent;
  parser.parentLevel = parser.pendingSimilarOriginalLevel;
  parser.pendingSimilarCard = null;
  parser.pendingSimilarLevel = -1;
  parser.pendingSimilarOriginalParent = null;
  parser.pendingSimilarOriginalLevel = -1;
}
