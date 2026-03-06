import { restoreParentContext, saveParentContext, setParentContext } from './context.js';
import { matchListIndent, getListContentFromTrimmed } from './line-utils.js';
import { processChildren } from './children-processor.js';

function extractItalicWords(parser, text, extractedCards) {
  return text.replace(/[*_]([a-zA-Z'-]+)\(([^*_]*?)\)[*_]/g, (match, word, def) => {
    if (parser.hasPosMarker(def)) {
      const card = parser.createWordCard(`${word} ${def}`, 0);
      extractedCards.push(card);
      return word;
    }
    return word;
  });
}

function extractInsPhrases(parser, text, extractedCards, indentLevel, boldPlaceholders = []) {
  return text.replace(/<ins>(.*?)<\/ins>/g, (match, phrase) => {
    let cleanPhrase = phrase.replace(/\*/g, '').trim();
    cleanPhrase = cleanPhrase.replace(/\{\{BOLD:(\d+)\}\}/g, (placeholderMatch, index) => {
      return boldPlaceholders[index] || placeholderMatch;
    });

    const card = parser.createPhraseCard(cleanPhrase, indentLevel);
    extractedCards.push(card);
    return cleanPhrase;
  });
}

export function processSentence(parser, content, indentLevel, lineIndex) {
  const extractedCards = [];
  let mergedContent = content;
  let nextLineIndex = lineIndex + 1;
  const mergedLines = [];

  while (nextLineIndex < parser.lines.length) {
    const nextLine = parser.lines[nextLineIndex];
    const trimmed = nextLine.trim();

    if (!trimmed) {
      nextLineIndex++;
      continue;
    }

    const indentMatch = matchListIndent(nextLine);
    if (indentMatch) {
      const nextIndentLevel = indentMatch[1].length;
      if (nextIndentLevel <= indentLevel) {
        break;
      }

      const childContent = getListContentFromTrimmed(trimmed);
      const isRealChild =
        parser.isSynonymMarker(childContent) ||
        parser.hasAntonymMarker(childContent) ||
        parser.isPurePosLine(childContent) ||
        parser.isPureIpaLine(childContent) ||
        (/^[a-z]+\./.test(childContent));

      if (isRealChild) {
        break;
      }

      break;
    }

    if (!trimmed.startsWith('-')) {
      if (trimmed.startsWith('##')) {
        break;
      }
      mergedContent += ` ${trimmed}`;
      mergedLines.push(nextLineIndex);
      nextLineIndex++;
      continue;
    }

    break;
  }

  content = mergedContent;

  const boldPlaceholders = [];
  const protectedContent = content.replace(/\*\*(.*?)\*\*/g, (match, boldContent) => {
    const placeholder = `{{BOLD:${boldPlaceholders.length}}}`;
    boldPlaceholders.push(boldContent);
    return placeholder;
  });

  let clean = extractItalicWords(parser, protectedContent, extractedCards);
  clean = clean.replace(/[*_]([a-zA-Z'-]+)[*_]/g, '$1');
  clean = clean.replace(/_([^_]+?)_/g, '$1');
  clean = extractInsPhrases(parser, clean, extractedCards, indentLevel, boldPlaceholders);

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
  const sentenceChildren = [];
  const promotedChildren = [];

  let i = nextLineIndex;
  let lastProcessedLineIndex = lineIndex;
  while (i < parser.lines.length) {
    const line = parser.lines[i];
    const trimmed = line.trim();

    if (mergedLines.includes(i)) {
      i++;
      continue;
    }

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

    if (parser.isPurePosLine(childContent) || parser.isPureIpaLine(childContent)) {
      lastProcessedLineIndex = i;
      i++;
      continue;
    }

    setParentContext(parser, sentenceCard, indentLevel);
    const cardType = parser.determineCardType(childContent, childIndentLevel, i);

    if (cardType === 'word') {
      const card = parser.createWordCard(childContent, childIndentLevel);
      const { children: wordChildren } = processChildren(parser, childIndentLevel, i, [], card);
      if (wordChildren.length > 0) {
        card.children = wordChildren;
      }
      promotedChildren.push(card);
      lastProcessedLineIndex = i;
      i++;
      continue;
    }

    if (cardType === 'phrase') {
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
      continue;
    }

    if (cardType === 'prefix') {
      const card = parser.createPrefixCard(childContent, childIndentLevel, i);
      const { children: prefixChildren, lastLineIndex: prefixLastLine } = processChildren(parser, childIndentLevel, i, [], card);
      if (prefixChildren.length > 0) {
        card.children = prefixChildren;
      }
      promotedChildren.push(card);
      if (prefixLastLine > lastProcessedLineIndex) {
        lastProcessedLineIndex = prefixLastLine;
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

  restoreParentContext(parser, savedParentContext);
  parser.cards.push(sentenceCard);

  return correctLastLineIndex;
}
