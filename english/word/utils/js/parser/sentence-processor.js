import { restoreParentContext, saveParentContext, setParentContext } from './context.js';
import { matchListIndent, getListContentFromTrimmed, mergeListItemContinuations } from './line-utils.js';
import { processChildren } from './children-processor.js';
import { extractItalicWords, extractInsPhrases } from './inline-extractors.js';
import { normalizeInlineStudyText, stripMarkdownMarkers, stripPronunciationHints } from './text-normalizer.js';

export function processSentence(parser, content, indentLevel, lineIndex) {
  const extractedCards = [];
  const merged = mergeListItemContinuations(parser.lines, lineIndex, content);
  content = merged.content;

  const boldPlaceholders = [];
  const protectedContent = content.replace(/\*\*(.*?)\*\*/g, (match, boldContent) => {
    const placeholder = `{{BOLD:${boldPlaceholders.length}}}`;
    boldPlaceholders.push(stripPronunciationHints(boldContent));
    return placeholder;
  });

  let clean = extractItalicWords(parser, protectedContent, extractedCards, indentLevel);
  clean = stripMarkdownMarkers(clean);
  clean = extractInsPhrases(parser, clean, extractedCards, indentLevel, boldPlaceholders);
  clean = stripPronunciationHints(clean);

  const cleanEnWithPlaceholders = clean.replace(/\([^)]*[\u4e00-\u9fa5]+[^)]*\)/g, '').trim();
  const cnMatch = cleanEnWithPlaceholders.match(/[\u4e00-\u9fa5\uff08-\uff9e]/);
  let enWithPlaceholders = cleanEnWithPlaceholders;
  let cn = '';

  if (cnMatch) {
    const cnIndex = cleanEnWithPlaceholders.indexOf(cnMatch[0]);
    enWithPlaceholders = cleanEnWithPlaceholders.substring(0, cnIndex).trim();
    cn = cleanEnWithPlaceholders.substring(cnIndex).trim();
  }

  const cleanEn = enWithPlaceholders.replace(/\{\{BOLD:(\d+)\}\}/g, (match, index) => {
    return boldPlaceholders[index];
  });
  const displayWord = enWithPlaceholders.replace(/\{\{BOLD:(\d+)\}\}/g, (match, index) => {
    return `<strong>${boldPlaceholders[index]}</strong>`;
  });

  const sentenceCard = {
    id: `card_${parser.cardCounter++}`,
    word: cleanEn.substring(0, 50) + (cleanEn.length > 50 ? '...' : ''),
    displayWord,
    type: 'sentence',
    fullText: clean,
    items: [{ type: 'sentence', en: cleanEn, cn }]
  };

  const savedParentContext = saveParentContext(parser);
  setParentContext(parser, sentenceCard, indentLevel);

  parser.pendingSynonyms = [];
  parser.pendingSimilars = [];
  const sentenceChildren = [];
  const promotedChildren = [];

  let i = merged.nextLineIndex;
  let lastProcessedLineIndex = lineIndex;
  while (i < parser.lines.length) {
    const line = parser.lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const indentMatch = matchListIndent(line);
    if (!indentMatch) {
      break;
    }

    const childIndentLevel = indentMatch[1].length;
    if (childIndentLevel <= indentLevel) {
      break;
    }

    const childContent = getListContentFromTrimmed(trimmed);
    const normalizedChildContent = normalizeInlineStudyText(childContent);

    if (parser.isSynonymMarker(childContent)) {
      if (!parser.pendingSynonyms) {
        parser.pendingSynonyms = [];
      }
      const synonymContent = childContent.replace(/^===?\s+/, '').trim();
      const multipleSynonyms = synonymContent.split(/\s*==\s*/).map((item) => item.trim()).filter(Boolean);
      multipleSynonyms.forEach((synonym) => parser.pendingSynonyms.push(synonym));
      lastProcessedLineIndex = i;
      i++;
      continue;
    }

    if (parser.hasSimilarMarker(childContent)) {
      if (!parser.pendingSimilars) {
        parser.pendingSimilars = [];
      }
      const similarContent = childContent.replace(/^Similar:\s*/, '').trim();
      const multipleSimilars = similarContent.split(/\s*==\s*/).map((item) => item.trim()).filter(Boolean);
      multipleSimilars.forEach((similar) => parser.pendingSimilars.push(similar));
      lastProcessedLineIndex = i;
      i++;
      continue;
    }

    if (parser.isPurePosLine(childContent) || parser.isPureIpaLine(childContent)) {
      lastProcessedLineIndex = i;
      i++;
      continue;
    }

    // Sentence child lines with Chinese gloss should stay as phrase cards
    // (sentence children are constrained to word/phrase-like study items).
    const childHasChinese = /[\u4e00-\u9fa5\uff08-\uff9e]/.test(normalizedChildContent);
    const childHasPos = parser.hasPosMarker(normalizedChildContent);
    if (childHasChinese && !childHasPos) {
      const card = parser.createPhraseCard(normalizedChildContent, childIndentLevel);
      const { children: phraseChildren, lastLineIndex: phraseLastLine } = processChildren(parser, childIndentLevel, i, [], card);
      if (phraseChildren.length > 0) {
        card.children = phraseChildren;
      }
      promotedChildren.push(card);
      if (phraseLastLine > lastProcessedLineIndex) {
        lastProcessedLineIndex = phraseLastLine;
      }
      i = Math.max(i + 1, phraseLastLine + 1);
      continue;
    }

    setParentContext(parser, sentenceCard, indentLevel);
    const cardType = parser.determineCardType(childContent, childIndentLevel, i);

    if (cardType === 'word') {
      const card = parser.createWordCard(normalizedChildContent, childIndentLevel);
      const { children: wordChildren, lastLineIndex: wordLastLine } = processChildren(parser, childIndentLevel, i, [], card);
      if (wordChildren.length > 0) {
        card.children = wordChildren;
      }
      promotedChildren.push(card);
      if (wordLastLine > lastProcessedLineIndex) {
        lastProcessedLineIndex = wordLastLine;
      }
      i = Math.max(i + 1, wordLastLine + 1);
      continue;
    }

    if (cardType === 'phrase') {
      const card = parser.createPhraseCard(normalizedChildContent, childIndentLevel);
      const { children: phraseChildren, lastLineIndex: phraseLastLine } = processChildren(parser, childIndentLevel, i, [], card);
      if (phraseChildren.length > 0) {
        card.children = phraseChildren;
      }
      promotedChildren.push(card);
      if (phraseLastLine > lastProcessedLineIndex) {
        lastProcessedLineIndex = phraseLastLine;
      }
      i = Math.max(i + 1, phraseLastLine + 1);
      continue;
    }

    if (cardType === 'prefix') {
      const card = parser.createPrefixCard(normalizedChildContent, childIndentLevel, i);
      const { children: prefixChildren, lastLineIndex: prefixLastLine } = processChildren(parser, childIndentLevel, i, [], card);
      if (prefixChildren.length > 0) {
        card.children = prefixChildren;
      }
      promotedChildren.push(card);
      if (prefixLastLine > lastProcessedLineIndex) {
        lastProcessedLineIndex = prefixLastLine;
      }
      i = Math.max(i + 1, prefixLastLine + 1);
      continue;
    }

    if (cardType === 'sentence') {
      const cleanChildText = normalizeInlineStudyText(childContent);
      const card = {
        id: `card_${parser.cardCounter++}`,
        word: cleanChildText.substring(0, 50) + (cleanChildText.length > 50 ? '...' : ''),
        displayWord: cleanChildText,
        type: 'sentence',
        fullText: cleanChildText,
        items: [{ type: 'sentence', en: cleanChildText, cn: '' }]
      };
      promotedChildren.push(card);
      if (i > lastProcessedLineIndex) {
        lastProcessedLineIndex = i;
      }
      i++;
      continue;
    }

    const card = parser.createPhraseCard(childContent, childIndentLevel);
    const { children: phraseChildren, lastLineIndex: phraseLastLine } = processChildren(parser, childIndentLevel, i, [], card);
    if (phraseChildren.length > 0) {
      card.children = phraseChildren;
    }
    promotedChildren.push(card);
    if (phraseLastLine > lastProcessedLineIndex) {
      lastProcessedLineIndex = phraseLastLine;
    }
    i++;
  }

  restoreParentContext(parser, savedParentContext);
  sentenceCard.children = sentenceChildren;

  let correctLastLineIndex = lineIndex + 1;
  if (promotedChildren.length > 0 || sentenceChildren.length > 0) {
    correctLastLineIndex = lastProcessedLineIndex + 1;
  }

  extractedCards.push(...promotedChildren);
  extractedCards.forEach((card) => {
    parser.cards.push(card);
  });

  if (parser.pendingSynonyms && parser.pendingSynonyms.length > 0) {
    sentenceCard.synonyms = parser.pendingSynonyms.map((word) => ({ word }));
  }
  if (parser.pendingSimilars && parser.pendingSimilars.length > 0) {
    sentenceCard.similars = parser.pendingSimilars.map((word) => ({ word }));
  }

  restoreParentContext(parser, savedParentContext);
  parser.cards.push(sentenceCard);

  return correctLastLineIndex;
}
