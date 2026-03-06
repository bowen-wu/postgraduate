import { restoreParentContext, saveParentContext, setParentContext } from './context.js';
import { matchListIndent, getListContentFromTrimmed } from './line-utils.js';
import {
  finalizePendingAntonymIfNeeded,
  finalizePendingSynonymIfNeeded
} from './pending-relations.js';

export function processChildren(parser, parentIndentLevel, lineIndex, skipLines = [], explicitParentCard = null) {
  const children = [];
  let i = lineIndex + 1;

  const savedParentContext = saveParentContext(parser);
  const actualParentCard = explicitParentCard || savedParentContext.parentCard;

  while (i < parser.lines.length) {
    if (skipLines.includes(i)) {
      i++;
      continue;
    }

    const line = parser.lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }

    const indentMatch = matchListIndent(line);
    if (!indentMatch) {
      finalizePendingSynonymIfNeeded(parser, 0);
      finalizePendingAntonymIfNeeded(parser, 0);
      break;
    }

    const indentLevel = indentMatch[1].length;
    finalizePendingSynonymIfNeeded(parser, indentLevel);
    finalizePendingAntonymIfNeeded(parser, indentLevel);

    if (indentLevel <= parentIndentLevel) {
      finalizePendingSynonymIfNeeded(parser, 0);
      finalizePendingAntonymIfNeeded(parser, 0);
      break;
    }

    const content = getListContentFromTrimmed(trimmed);

    if (parser.isSynonymMarker(content)) {
      if (actualParentCard && (actualParentCard.type === 'word' || actualParentCard.type === 'phrase')) {
        const synonymContent = content.replace(/^===?\s+/, '').trim();
        actualParentCard.synonyms = actualParentCard.synonyms || [];
        const multipleSynonyms = synonymContent.split(/\s*==\s*/).map((item) => item.trim()).filter(Boolean);

        for (const syn of multipleSynonyms) {
          const { word, ipa, pos, cn } = parser.parseWordContent(syn);
          if (pos && cn) {
            const synonym = { word };
            if (ipa) synonym.ipa = ipa;
            if (pos) synonym.pos = pos;
            if (cn) synonym.cn = cn;
            actualParentCard.synonyms.push(synonym);
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
            parser.pendingSynonymOriginalParent = actualParentCard;
            parser.pendingSynonymOriginalLevel = parser.parentLevel;
            parser.parentCard = parser.pendingSynonymCard;
            parser.parentLevel = indentLevel;
          } else {
            const synonym = { word };
            if (ipa) synonym.ipa = ipa;
            actualParentCard.synonyms.push(synonym);
          }
        }
      } else {
        const synonymWord = content.replace(/^===?\s+/, '').trim();
        if (!parser.pendingSynonyms) {
          parser.pendingSynonyms = [];
        }
        parser.pendingSynonyms.push(synonymWord);
      }
      i++;
      continue;
    }

    if (parser.isPurePosLine(content)) {
      if (parser.pendingSynonymCard) {
        const posMatch = content.match(/^([a-z]+\.)\s*(.*)/);
        if (posMatch) {
          const pos = posMatch[1];
          const cn = posMatch[2].trim();
          const placeholderIndex = parser.pendingSynonymCard.items.findIndex(
            (item) => item.en === parser.pendingSynonymCard.word && item.cn === ''
          );
          if (placeholderIndex !== -1) {
            parser.pendingSynonymCard.items.splice(placeholderIndex, 1);
          }
          parser.pendingSynonymCard.items.push({
            type: 'def',
            en: pos,
            cn
          });
        }
      } else if (actualParentCard && actualParentCard.type === 'word') {
        const posMatch = content.match(/^([a-z]+\.)\s*(.*)/);
        if (posMatch) {
          const pos = posMatch[1];
          const cn = posMatch[2].trim();
          const placeholderIndex = actualParentCard.items.findIndex(
            (item) => item.en === actualParentCard.word && item.cn === ''
          );
          if (placeholderIndex !== -1) {
            actualParentCard.items.splice(placeholderIndex, 1);
          }
          actualParentCard.items.push({
            type: 'def',
            en: pos,
            cn
          });
        }
      }
      i++;
      continue;
    }

    if (parser.isPureIpaLine(content)) {
      i++;
      continue;
    }

    setParentContext(parser, actualParentCard, parentIndentLevel);
    const cardType = parser.determineCardType(content, indentLevel, lineIndex);

    if (actualParentCard && actualParentCard.type === 'sentence') {
      const hasChinese = /[\u4e00-\u9fa5\uff08-\uff9e]/.test(content);
      const hasPosMarker = parser.hasPosMarker(content);
      if (hasChinese && !hasPosMarker) {
        const phraseCard = parser.createPhraseCard(content, indentLevel);
        children.push(phraseCard);
        i++;
        continue;
      }
    }

    if (actualParentCard && actualParentCard.type === 'phrase') {
      const hasChinese = /[\u4e00-\u9fa5\uff08-\uff9e]/.test(content);
      const hasEnglish = /[a-zA-Z]/.test(content);
      const hasPosMarker = parser.hasPosMarker(content);
      const isSpecialMarker = parser.isSynonymMarker(content) || parser.isPurePosLine(content) || parser.isPureIpaLine(content);
      const isSameOrLessIndent = indentLevel <= parentIndentLevel;

      if (hasChinese && hasEnglish && !hasPosMarker && !isSpecialMarker && isSameOrLessIndent) {
        break;
      }
    }

    if (cardType === 'word') {
      const card = parser.createWordCard(content, indentLevel);
      const { children: wordChildren, lastLineIndex: wordLastLine } = processChildren(parser, indentLevel, i, [], card);
      if (wordChildren.length > 0) {
        card.children = wordChildren;
      }
      children.push(card);
      if (wordLastLine > i) {
        i = wordLastLine;
      }
    } else if (cardType === 'phrase') {
      const card = parser.createPhraseCard(content, indentLevel);
      const { children: phraseChildren, lastLineIndex: phraseLastLine } = processChildren(parser, indentLevel, i, [], card);
      if (phraseChildren.length > 0) {
        card.children = phraseChildren;
      }
      children.push(card);
      if (phraseLastLine > i) {
        i = phraseLastLine;
      }
    } else if (cardType === 'definition') {
      if (actualParentCard && actualParentCard.type === 'phrase') {
        actualParentCard.items.push({
          type: 'def',
          en: actualParentCard.word,
          cn: content
        });
      }
      i++;
      continue;
    } else if (cardType === 'prefix') {
      const card = parser.createPrefixCard(content, indentLevel, lineIndex);
      children.push(card);
    } else {
      children.push({
        id: `card_${parser.cardCounter++}`,
        word: content,
        type: 'sentence',
        fullText: content,
        items: [{ type: 'sentence', en: content, cn: '' }]
      });
    }

    i++;
  }

  restoreParentContext(parser, savedParentContext);
  finalizePendingSynonymIfNeeded(parser, 0);
  finalizePendingAntonymIfNeeded(parser, 0);

  return { children, lastLineIndex: i - 1 };
}
