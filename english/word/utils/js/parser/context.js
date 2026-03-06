export function createParserState(text) {
  return {
    lines: text.split('\n'),
    cards: [],
    inPhraseList: false,
    inPhraseHeader: false,
    phraseMarkerLevel: -1,
    parentCard: null,
    parentLevel: -1,
    cardCounter: 0,
    pendingSynonyms: [],
    pendingSynonymCard: null,
    pendingSynonymLevel: -1,
    pendingSynonymOriginalParent: null,
    pendingSynonymOriginalLevel: -1,
    pendingAntonymCard: null,
    pendingAntonymLevel: -1,
    pendingAntonymOriginalParent: null,
    pendingAntonymOriginalLevel: -1
  };
}

export function saveParentContext(parser) {
  return {
    parentCard: parser.parentCard,
    parentLevel: parser.parentLevel
  };
}

export function restoreParentContext(parser, savedContext) {
  parser.parentCard = savedContext.parentCard;
  parser.parentLevel = savedContext.parentLevel;
}

export function setParentContext(parser, parentCard, parentLevel) {
  parser.parentCard = parentCard;
  parser.parentLevel = parentLevel;
}
