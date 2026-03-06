import {
  POS_MARKERS,
  IPA_SYMBOLS,
  isSynonymMarker,
  hasAntonymMarker,
  isPurePosLine,
  isPureIpaLine,
  hasPosMarker,
  hasIpaMarker,
  isValidWordHeader
} from './validators.js';
import { parseWordContent, parsePhraseContent } from './content-parser.js';
import { determineCardTypeRule, isPrefixOrSuffixRule, firstChildHasPosRule } from './rule-engine.js';
import { buildBaseCard, buildWordCard, buildPhraseCard, buildPrefixCard } from './card-builders.js';
import { createParserState } from './context.js';
import { parseLines } from './parse-loop.js';

export class MarkdownParser {
  static POS_MARKERS = POS_MARKERS;
  static IPA_SYMBOLS = IPA_SYMBOLS;

  constructor(text) {
    Object.assign(this, createParserState(text));
    Object.assign(this, {
      isSynonymMarker,
      hasAntonymMarker,
      isPurePosLine,
      isPureIpaLine,
      hasPosMarker,
      hasIpaMarker,
      isValidWordHeader,
      parseWordContent,
      parsePhraseContent
    });
  }

  parse() {
    return parseLines(this);
  }

  determineCardType(content, indentLevel, lineIndex = null) {
    return determineCardTypeRule({
      content,
      indentLevel,
      lineIndex,
      context: {
        parentCard: this.parentCard,
        parentLevel: this.parentLevel,
        inPhraseHeader: this.inPhraseHeader,
        inPhraseList: this.inPhraseList
      },
      hasPosMarker: this.hasPosMarker,
      hasIpaMarker: this.hasIpaMarker,
      isPrefixOrSuffix: (innerContent, innerLineIndex = null) => this.isPrefixOrSuffix(innerContent, innerLineIndex),
      firstChildHasPos: (innerContent, innerIndentLevel, innerParentLineIndex = null) =>
        this.firstChildHasPos(innerContent, innerIndentLevel, innerParentLineIndex)
    });
  }

  isPrefixOrSuffix(content, lineIndex = null) {
    return isPrefixOrSuffixRule(content, this.hasPosMarker, lineIndex);
  }

  firstChildHasPos(content, indentLevel, parentLineIndex = null) {
    return firstChildHasPosRule(this.lines, content, indentLevel, parentLineIndex, this.hasPosMarker);
  }

  createCard(word, type) {
    return buildBaseCard(`card_${this.cardCounter++}`, word, type);
  }

  createWordCard(content, indentLevel) {
    const { card, shouldSetAsParent } = buildWordCard({
      id: `card_${this.cardCounter++}`,
      content,
      parseWordContent: this.parseWordContent,
      parentCard: this.parentCard
    });

    if (shouldSetAsParent) {
      this.parentCard = card;
      this.parentLevel = indentLevel;
    }
    return card;
  }

  createPhraseCard(content, indentLevel) {
    const card = buildPhraseCard(`card_${this.cardCounter++}`, content, this.parsePhraseContent);
    this.parentCard = card;
    this.parentLevel = indentLevel;
    return card;
  }

  createPrefixCard(content, indentLevel) {
    const card = buildPrefixCard(`card_${this.cardCounter++}`, content);
    this.parentCard = card;
    this.parentLevel = indentLevel;
    return card;
  }
}

export function parseMarkdownToCards(text) {
  if (typeof text !== 'string') {
    throw new TypeError('parseMarkdownToCards(text) expects a string');
  }
  const parser = new MarkdownParser(text);
  return parser.parse();
}
