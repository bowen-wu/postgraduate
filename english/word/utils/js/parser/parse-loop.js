import { processChildren } from './children-processor.js';
import { processSentence } from './sentence-processor.js';
import { matchListIndent, getListContentFromTrimmed } from './line-utils.js';
import {
  addAntonymToParent,
  addIpaToParent,
  addPosToParent,
  addSynonymToParent,
  finalizePendingAntonymIfNeeded,
  finalizePendingSynonymIfNeeded
} from './pending-relations.js';

export function processListItem(parser, line, indentLevel, content, lineIndex) {
  finalizePendingSynonymIfNeeded(parser, indentLevel);
  finalizePendingAntonymIfNeeded(parser, indentLevel);

  if (parser.isSynonymMarker(content)) {
    return addSynonymToParent(parser, content, indentLevel);
  }

  if (parser.hasAntonymMarker(content)) {
    addAntonymToParent(parser, content, indentLevel);
    return undefined;
  }

  if (parser.isPurePosLine(content)) {
    addPosToParent(parser, content);
    return undefined;
  }

  if (parser.isPureIpaLine(content)) {
    addIpaToParent(parser, content);
    return undefined;
  }

  if (content === '词组') {
    parser.inPhraseList = true;
    parser.phraseMarkerLevel = indentLevel;
    return undefined;
  }

  if (parser.inPhraseList && indentLevel > parser.phraseMarkerLevel) {
    const card = parser.createPhraseCard(content, indentLevel);
    const { children: phraseChildren, lastLineIndex: phraseLastLine } = processChildren(parser, indentLevel, lineIndex, [], card);
    if (phraseChildren.length > 0) {
      card.children = phraseChildren;
    }
    parser.cards.push(card);
    return phraseLastLine;
  }

  const cardType = parser.determineCardType(content, indentLevel, lineIndex);

  if (cardType === 'sentence') {
    return processSentence(parser, content, indentLevel, lineIndex);
  }

  if (cardType === 'word') {
    parser.cards.push(parser.createWordCard(content, indentLevel));
    return undefined;
  }

  if (cardType === 'phrase') {
    const card = parser.createPhraseCard(content, indentLevel);
    const { children: phraseChildren, lastLineIndex: phraseLastLine } = processChildren(parser, indentLevel, lineIndex, [], card);
    if (phraseChildren.length > 0) {
      card.children = phraseChildren;
    }
    parser.cards.push(card);
    return phraseLastLine;
  }

  if (cardType === 'prefix') {
    parser.cards.push(parser.createPrefixCard(content, indentLevel, lineIndex));
  }

  return undefined;
}

export function parseLines(parser) {
  let startIndex = 0;
  for (let i = 0; i < parser.lines.length; i++) {
    if (parser.lines[i].trim().startsWith('##')) {
      startIndex = i;
      break;
    }
  }

  let i = startIndex;
  while (i < parser.lines.length) {
    const line = parser.lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }

    const indentLevel = matchListIndent(line)?.[1].length || 0;
    const content = trimmed.startsWith('-') ? getListContentFromTrimmed(trimmed) : trimmed;

    if (trimmed.startsWith('##')) {
      const headerWord = trimmed.substring(2).trim();
      finalizePendingSynonymIfNeeded(parser, 0);
      finalizePendingAntonymIfNeeded(parser, 0);

      if (parser.isValidWordHeader(headerWord)) {
        parser.inPhraseHeader = headerWord.includes('词组');
        const card = parser.createCard(headerWord, 'word');
        parser.cards.push(card);
        parser.parentCard = card;
        parser.parentLevel = 0;
      } else {
        parser.inPhraseHeader = headerWord.includes('词组');
        parser.parentCard = null;
        parser.parentLevel = -1;
      }
      i++;
      continue;
    }

    if (trimmed.startsWith('-')) {
      if (/^(vt?|vi|adj|adv|prep|conj|int|pron|art|num)\.?\s*=/.test(content)) {
        i++;
        continue;
      }
      if (/^[\[\d／→]/.test(content) && content.length < 20 && !parser.isPureIpaLine(content)) {
        i++;
        continue;
      }

      if (parser.inPhraseList && indentLevel <= parser.phraseMarkerLevel) {
        parser.inPhraseList = false;
        parser.phraseMarkerLevel = -1;
      }

      const lastLineIndex = processListItem(parser, line, indentLevel, content, i);
      if (lastLineIndex !== null && lastLineIndex !== undefined) {
        if (lastLineIndex > i) {
          i = lastLineIndex;
        } else {
          i++;
        }
      } else {
        i++;
      }
      continue;
    }

    i++;
  }

  finalizePendingSynonymIfNeeded(parser, 0);
  finalizePendingAntonymIfNeeded(parser, 0);
  return parser.cards;
}
