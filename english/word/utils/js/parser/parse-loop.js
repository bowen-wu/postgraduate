import { processChildren } from './children-processor.js';
import { processSentence } from './sentence-processor.js';
import { matchListIndent, getListContentFromTrimmed } from './line-utils.js';
import { parseContrastHeader, parseContrastChildren } from './contrast-parser.js';
import { extractItalicWords } from './inline-extractors.js';
import { normalizeInlineStudyText, stripMarkdownMarkers } from './text-normalizer.js';
import { getListIndentLevel } from './line-utils.js';
import {
  addAntonymToParent,
  addIpaToParent,
  addPosToParent,
  addSimilarToParent,
  addSynonymToParent,
  finalizePendingAntonymIfNeeded,
  finalizePendingSimilarIfNeeded,
  finalizePendingSynonymIfNeeded
} from './pending-relations.js';

export function processListItem(parser, line, indentLevel, content, lineIndex) {
  const normalizedContent = normalizeInlineStudyText(content);

  finalizePendingSynonymIfNeeded(parser, indentLevel);
  finalizePendingAntonymIfNeeded(parser, indentLevel);
  finalizePendingSimilarIfNeeded(parser, indentLevel);

  if (parser.isSynonymMarker(content)) {
    return addSynonymToParent(parser, content, indentLevel);
  }

  if (parser.hasAntonymMarker(content)) {
    addAntonymToParent(parser, content, indentLevel);
    return undefined;
  }

  if (parser.hasSimilarMarker(content)) {
    addSimilarToParent(parser, content, indentLevel);
    return undefined;
  }

  if (/^Block:\s*/.test(content)) {
    const blockLines = [];
    const firstLineRaw = content.replace(/^Block:\s*/, '').trim();
    const firstLineClean = normalizeInlineStudyText(firstLineRaw);
    const firstLineIsWord = parser.hasPosMarker(firstLineClean);
    const firstLineParsed = firstLineIsWord
      ? parser.parseWordContent(firstLineClean)
      : parser.parsePhraseContent(firstLineClean);
    let lastPhraseLine = null;
    blockLines.push({
      id: `block_line_${parser.cardCounter}`,
      indentLevel: 0,
      type: firstLineIsWord ? 'word' : 'phrase',
      rawText: firstLineRaw,
      cleanText: firstLineClean,
      en: firstLineIsWord ? firstLineParsed.word : (firstLineParsed.word || firstLineClean),
      cn: firstLineParsed.cn || '',
      audioText: firstLineIsWord ? firstLineParsed.word : (firstLineParsed.word || firstLineClean)
    });
    if (!firstLineIsWord) {
      lastPhraseLine = blockLines[blockLines.length - 1];
    }

    let i = lineIndex + 1;
    while (i < parser.lines.length) {
      const current = parser.lines[i];
      const trimmed = current.trim();
      if (!trimmed) {
        i++;
        continue;
      }
      if (trimmed.startsWith('##')) break;
      const childIndent = getListIndentLevel(current);
      if (!trimmed.startsWith('-') || childIndent <= indentLevel) break;

      const childRaw = trimmed.substring(1).trim();
      if (parser.isSynonymMarker(childRaw) && lastPhraseLine) {
        const synonymContent = childRaw.replace(/^===?\s+/, '').trim();
        const synonyms = synonymContent.split(/\s*==\s*/).map((item) => item.trim()).filter(Boolean);
        if (synonyms.length > 0) {
          lastPhraseLine.synonyms = lastPhraseLine.synonyms || [];
          synonyms.forEach((word) => lastPhraseLine.synonyms.push({ word }));
        }
        i++;
        continue;
      }

      const childClean = normalizeInlineStudyText(childRaw);
      const isWordLine = parser.hasPosMarker(childClean);
      const childParsed = isWordLine
        ? parser.parseWordContent(childClean)
        : parser.parsePhraseContent(childClean);
      const blockLine = {
        id: `block_line_${parser.cardCounter}_${i}`,
        indentLevel: Math.max(0, childIndent - indentLevel),
        type: isWordLine ? 'word' : 'phrase',
        rawText: childRaw,
        cleanText: childClean,
        en: isWordLine ? childParsed.word : (childParsed.word || childClean),
        cn: childParsed.cn || '',
        audioText: isWordLine ? childParsed.word : (childParsed.word || childClean)
      };
      blockLines.push(blockLine);
      if (!isWordLine) {
        lastPhraseLine = blockLine;
      }
      i++;
    }

    parser.cards.push({
      id: `card_${parser.cardCounter++}`,
      word: blockLines[0]?.en || 'Block',
      type: 'block',
      items: blockLines
    });
    return i;
  }

  if (parser.hasContrastMarker && parser.hasContrastMarker(content)) {
    const header = parseContrastHeader(content);
    const card = {
      id: `card_${parser.cardCounter++}`,
      word: header.word,
      type: 'contrast',
      contrastOptions: header.options,
      items: []
    };
    const { items, extras, lastLineIndex } = parseContrastChildren(parser.lines, lineIndex, indentLevel, header.options);
    card.items = items.map((item) => ({
      ...item,
      en: normalizeInlineStudyText(item.en)
    }));
    parser.cards.push(card);

    // Extract inline word cards from contrast sentences, e.g. *profession(n. 职业)*.
    items.forEach((item) => {
      const sentence = String(item.en || '');
      sentence.replace(/[*_]([a-zA-Z'-]+)\(([^*_]*?)\)[*_]/g, (_m, word, def) => {
        if (parser.hasPosMarker(def)) {
          parser.cards.push(parser.createWordCard(`${word} ${def}`, indentLevel + 2));
        }
        return word;
      });
    });

    extras.forEach((extra) => {
      const cardType = parser.determineCardType(extra.content, extra.indentLevel, extra.lineIndex);
      if (cardType === 'word') {
        parser.cards.push(parser.createWordCard(extra.content, extra.indentLevel));
        return;
      }
      if (cardType === 'prefix') {
        parser.cards.push(parser.createPrefixCard(extra.content, extra.indentLevel, extra.lineIndex));
        return;
      }
      if (cardType === 'phrase') {
        const phraseCard = parser.createPhraseCard(extra.content, extra.indentLevel);
        parser.cards.push(phraseCard);
        return;
      }

      // Fallback: treat explanatory contrast child lines as phrases.
      parser.cards.push(parser.createPhraseCard(extra.content, extra.indentLevel));
    });

    return lastLineIndex;
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
    const extractedCards = [];
    let normalizedContent = extractItalicWords(parser, content, extractedCards, indentLevel);
    normalizedContent = stripMarkdownMarkers(normalizedContent).trim();

    const isAffix = parser.isPrefixOrSuffix(content, lineIndex);
    const card = isAffix
      ? parser.createPrefixCard(normalizedContent, indentLevel, lineIndex)
      : parser.createPhraseCard(normalizedContent, indentLevel);
    const { children: phraseChildren, lastLineIndex: phraseLastLine } = processChildren(parser, indentLevel, lineIndex, [], card);
    if (phraseChildren.length > 0) {
      card.children = phraseChildren;
    }
    extractedCards.forEach((extracted) => parser.cards.push(extracted));
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
    const card = parser.createPhraseCard(normalizedContent, indentLevel);
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
      finalizePendingSimilarIfNeeded(parser, 0);

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
  finalizePendingSimilarIfNeeded(parser, 0);
  return parser.cards;
}
