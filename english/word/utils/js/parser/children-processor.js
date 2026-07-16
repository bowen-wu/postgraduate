import { restoreParentContext, saveParentContext, setParentContext } from './context.js';
import { matchListIndent, getListContentFromTrimmed } from './line-utils.js';
import {
  addAntonymToParent,
  finalizePendingAntonymIfNeeded,
  finalizePendingSimilarIfNeeded,
  finalizePendingSynonymIfNeeded
} from './pending-relations.js';
import { normalizeInlineStudyText } from './text-normalizer.js';

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
      finalizePendingSimilarIfNeeded(parser, 0);
      break;
    }

    const indentLevel = indentMatch[1].length;
    finalizePendingSynonymIfNeeded(parser, indentLevel);
    finalizePendingAntonymIfNeeded(parser, indentLevel);
    finalizePendingSimilarIfNeeded(parser, indentLevel);

    if (indentLevel <= parentIndentLevel) {
      finalizePendingSynonymIfNeeded(parser, 0);
      finalizePendingAntonymIfNeeded(parser, 0);
      finalizePendingSimilarIfNeeded(parser, 0);
      break;
    }

    const content = getListContentFromTrimmed(trimmed);
    const normalizedContent = normalizeInlineStudyText(content);
    const activeRelationCard =
      (parser.pendingSimilarCard && indentLevel > parser.pendingSimilarLevel)
        ? parser.pendingSimilarCard
        : ((parser.pendingSynonymCard && indentLevel > parser.pendingSynonymLevel)
            ? parser.pendingSynonymCard
            : null);

    if (parser.hasAntonymMarker(content)) {
      setParentContext(parser, actualParentCard, parentIndentLevel);
      addAntonymToParent(parser, content, indentLevel);
      i++;
      continue;
    }

    if (activeRelationCard) {
      if (parser.isPurePosLine(content)) {
        const posMatch = content.match(/^([a-z]+\.)\s*(.*)/);
        if (posMatch) {
          const pos = posMatch[1];
          const cn = posMatch[2].trim();
          const placeholderIndex = activeRelationCard.items.findIndex(
            (item) => item.en === activeRelationCard.word && item.cn === ''
          );
          if (placeholderIndex !== -1) {
            activeRelationCard.items.splice(placeholderIndex, 1);
          }
          activeRelationCard.items.push({
            type: 'def',
            en: pos,
            cn
          });
        }
        i++;
        continue;
      }

      if (parser.isSynonymMarker(content)) {
        const synonymContent = content.replace(/^===?\s+/, '').trim();
        activeRelationCard.synonyms = activeRelationCard.synonyms || [];
        const multipleSynonyms = synonymContent.split(/\s*==\s*/).map((item) => item.trim()).filter(Boolean);
        multipleSynonyms.forEach((syn) => {
          const { word, ipa, pos, cn } = parser.parseWordContent(syn);
          if (!word) return;
          const synonym = { word };
          if (ipa) synonym.ipa = ipa;
          if (pos) synonym.pos = pos;
          if (cn) synonym.cn = cn;
          if (!activeRelationCard.synonyms.some((entry) => entry.word === word)) {
            activeRelationCard.synonyms.push(synonym);
          }
        });
        i++;
        continue;
      }

      if (/^===?\s+/.test(content)) {
        const synonymContent = content.replace(/^===?\s+/, '').trim();
        activeRelationCard.synonyms = activeRelationCard.synonyms || [];
        const multipleSynonyms = synonymContent.split(/\s*==\s*/).map((item) => item.trim()).filter(Boolean);
        multipleSynonyms.forEach((syn) => {
          const { word, ipa, pos, cn } = parser.parseWordContent(syn);
          if (!word) return;
          const synonym = { word };
          if (ipa) synonym.ipa = ipa;
          if (pos) synonym.pos = pos;
          if (cn) synonym.cn = cn;
          if (!activeRelationCard.synonyms.some((entry) => entry.word === word)) {
            activeRelationCard.synonyms.push(synonym);
          }
        });
        i++;
        continue;
      }

      if (parser.hasSimilarMarker(content)) {
        const similarContent = content.replace(/^Similar:\s*/, '').trim();
        activeRelationCard.similars = activeRelationCard.similars || [];
        const multipleSimilars = similarContent.split(/\s*==\s*/).map((item) => item.trim()).filter(Boolean);
        multipleSimilars.forEach((sim) => {
          const { word, ipa, pos, cn } = parser.parseWordContent(sim);
          if (!word) return;
          const similar = { word };
          if (ipa) similar.ipa = ipa;
          if (pos) similar.pos = pos;
          if (cn) similar.cn = cn;
          if (!activeRelationCard.similars.some((entry) => entry.word === word)) {
            activeRelationCard.similars.push(similar);
          }
        });
        i++;
        continue;
      }

      if (parser.isPureIpaLine(content)) {
        if (!activeRelationCard.ipa) {
          activeRelationCard.ipa = content.trim();
        }
        i++;
        continue;
      }

      const relationCardType = parser.determineCardType(content, indentLevel, i);
      if (relationCardType === 'sentence') {
        activeRelationCard.children = activeRelationCard.children || [];
        activeRelationCard.children.push({
          id: `card_${parser.cardCounter++}`,
          word: normalizedContent,
          type: 'sentence',
          fullText: normalizedContent,
          items: [{ type: 'sentence', en: normalizedContent, cn: '' }]
        });
        i++;
        continue;
      }
    }

    if (parser.isSynonymMarker(content)) {
      if (actualParentCard && (actualParentCard.type === 'word' || actualParentCard.type === 'phrase' || actualParentCard.type === 'prefix')) {
        const synonymContent = content.replace(/^===?\s+/, '').trim();
        actualParentCard.synonyms = actualParentCard.synonyms || [];
        const multipleSynonyms = synonymContent.split(/\s*==\s*/).map((item) => item.trim()).filter(Boolean);

        for (const syn of multipleSynonyms) {
          if (actualParentCard.type === 'phrase') {
            const phraseRelation = parsePhraseRelationCandidate(parser, syn);
            if (phraseRelation) {
              const synonym = { word: phraseRelation.word };
              if (phraseRelation.ipa) synonym.ipa = phraseRelation.ipa;
              if (phraseRelation.pos) synonym.pos = phraseRelation.pos;
              if (phraseRelation.cn) synonym.cn = phraseRelation.cn;
              actualParentCard.synonyms.push(synonym);
              continue;
            }
          }

          const { word, ipa, pos, cn } = parser.parseWordContent(syn);
          if (cn) {
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

    if (parser.hasSimilarMarker(content)) {
      if (actualParentCard && (actualParentCard.type === 'word' || actualParentCard.type === 'phrase' || actualParentCard.type === 'prefix' || actualParentCard.type === 'sentence')) {
        finalizePendingSynonymIfNeeded(parser, indentLevel);
        finalizePendingAntonymIfNeeded(parser, indentLevel);
        const similarContent = content.replace(/^Similar:\s*/, '').trim();
        actualParentCard.similars = actualParentCard.similars || [];
        const multipleSimilars = similarContent.split(/\s*==\s*/).map((item) => item.trim()).filter(Boolean);
        const originalParentCard = actualParentCard;
        const originalParentLevel = parser.parentLevel;

        for (const sim of multipleSimilars) {
          parser.parentCard = originalParentCard;
          parser.parentLevel = originalParentLevel;
          const { word, ipa, pos, cn } = parser.parseWordContent(sim);
          if (!word) continue;

          if (pos && cn) {
            const similar = { word };
            if (ipa) similar.ipa = ipa;
            if (pos) similar.pos = pos;
            if (cn) similar.cn = cn;
            actualParentCard.similars.push(similar);
            continue;
          }

          const isLastSimilar = multipleSimilars.indexOf(sim) === multipleSimilars.length - 1;
          if (isLastSimilar) {
            parser.pendingSimilarCard = {
              word,
              items: []
            };
            if (ipa) {
              parser.pendingSimilarCard.ipa = ipa;
            }
            parser.pendingSimilarLevel = indentLevel;
            parser.pendingSimilarOriginalParent = originalParentCard;
            parser.pendingSimilarOriginalLevel = originalParentLevel;
            parser.parentCard = parser.pendingSimilarCard;
            parser.parentLevel = indentLevel;
          } else {
            const similar = { word };
            if (ipa) similar.ipa = ipa;
            actualParentCard.similars.push(similar);
          }
        }
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
    const cardType = parser.determineCardType(content, indentLevel, i);

    if (actualParentCard && actualParentCard.type === 'sentence') {
      const hasChinese = /[\u4e00-\u9fa5\uff08-\uff9e]/.test(normalizedContent);
      const hasPosMarker = parser.hasPosMarker(normalizedContent);
      if (hasChinese && !hasPosMarker) {
        const phraseCard = parser.createPhraseCard(normalizedContent, indentLevel);
        children.push(phraseCard);
        i++;
        continue;
      }
    }

    if (actualParentCard && actualParentCard.type === 'phrase') {
      const hasChinese = /[\u4e00-\u9fa5\uff08-\uff9e]/.test(normalizedContent);
      const hasEnglish = /[a-zA-Z]/.test(normalizedContent);
      const hasLeadingEnglish = /^[a-zA-Z]/.test(normalizedContent);
      const hasPosMarker = parser.hasPosMarker(normalizedContent);
      const isSpecialMarker = parser.isSynonymMarker(content) || parser.isPurePosLine(content) || parser.isPureIpaLine(content);
      const isSameOrLessIndent = indentLevel <= parentIndentLevel;

      if (hasChinese && hasEnglish && !hasPosMarker && !isSpecialMarker && isSameOrLessIndent) {
        break;
      }

      if (hasChinese && hasEnglish && hasLeadingEnglish && !hasPosMarker && !isSpecialMarker) {
        const phraseCard = parser.createPhraseCard(normalizedContent, indentLevel);
        children.push(phraseCard);
        i++;
        continue;
      }
    }

    if (cardType === 'word') {
      const card = parser.createWordCard(normalizedContent, indentLevel);
      const { children: wordChildren, lastLineIndex: wordLastLine } = processChildren(parser, indentLevel, i, [], card);
      if (wordChildren.length > 0) {
        card.children = wordChildren;
      }
      children.push(card);
      if (wordLastLine > i) {
        i = wordLastLine;
      }
    } else if (cardType === 'phrase') {
      const card = parser.createPhraseCard(normalizedContent, indentLevel);
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
          cn: normalizedContent
        });
      }
      i++;
      continue;
    } else if (cardType === 'prefix') {
      const card = parser.createPrefixCard(normalizedContent, indentLevel, i);
      children.push(card);
    } else {
      children.push({
        id: `card_${parser.cardCounter++}`,
        word: normalizedContent,
        type: 'sentence',
        fullText: normalizedContent,
        items: [{ type: 'sentence', en: normalizedContent, cn: '' }]
      });
    }

    i++;
  }

  restoreParentContext(parser, savedParentContext);
  finalizePendingSynonymIfNeeded(parser, 0);
  finalizePendingAntonymIfNeeded(parser, 0);
  finalizePendingSimilarIfNeeded(parser, 0);

  return { children, lastLineIndex: i - 1 };
}
