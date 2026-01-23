/**
 * Markdown Parser Module - Main Entry Point
 * Handles parsing of markdown vocabulary files into card objects
 * This module preserves the original parsing logic from review.html
 */

import { POS_MARKERS, IPA_SYMBOLS, isSynonymMarker, hasAntonymMarker,
         isPurePosLine, isPureIpaLine, hasPosMarker, hasIpaMarker, isValidWordHeader } from './validators.js';
import { parseWordContent, parsePhraseContent } from './content-parser.js';

export class MarkdownParser {
  // Re-export constants for backward compatibility
  static POS_MARKERS = POS_MARKERS;
  static IPA_SYMBOLS = IPA_SYMBOLS;

  constructor(text) {
    this.lines = text.split('\n');
    this.cards = [];
    this.inPhraseList = false;  // Track if we're under "- 词组" marker
    this.inPhraseHeader = false;  // Track if we're under "## 词组" header
    this.phraseMarkerLevel = -1;  // Indent level of the "- 词组" marker
    this.parentCard = null;  // Current parent card for nested items
    this.parentLevel = -1;  // Indent level of parent card
    this.cardCounter = 0;  // For generating unique IDs
    this.pendingSynonyms = [];  // Store synonyms for current sentence
    this.debug = false;  // Set to true for debugging

    // Assign imported pure functions as class methods
    this.isSynonymMarker = isSynonymMarker;
    this.hasAntonymMarker = hasAntonymMarker;
    this.isPurePosLine = isPurePosLine;
    this.isPureIpaLine = isPureIpaLine;
    this.hasPosMarker = hasPosMarker;
    this.hasIpaMarker = hasIpaMarker;
    this.isValidWordHeader = isValidWordHeader;
    this.parseWordContent = parseWordContent;
    this.parsePhraseContent = parsePhraseContent;
  }

  /**
   * Main parse method - implements the rule-based parsing logic
   * Returns array of parsed cards
   */
  parse() {
    try {
      // Rule: Start from the first ##, ignore everything before
      let startIndex = 0;
      for (let i = 0; i < this.lines.length; i++) {
        if (this.lines[i].trim().startsWith('##')) {
          startIndex = i;
          break;
        }
      }

      let i = startIndex;
      while (i < this.lines.length) {
        const line = this.lines[i];
        const trimmed = line.trim();
        if (!trimmed) {
          i++;
          continue;
        }

        // Get indent level
        const indentMatch = line.match(/^(\s*)-/);
        const indentLevel = indentMatch ? indentMatch[1].length : 0;
        const content = trimmed.substring(1).trim();

        // Handle headers (## word)
        if (trimmed.startsWith('##')) {
          const headerWord = trimmed.substring(2).trim();
          if (this.isValidWordHeader(headerWord)) {
            // Check if this is a phrase header (规则4: ## 词组)
            this.inPhraseHeader = headerWord.includes('词组');

            const card = this.createCard(headerWord, 'word');
            this.cards.push(card);
            this.parentCard = card;
            this.parentLevel = 0;
          }
          i++;
          continue;
        }

        // Handle list items (- ...)
        if (trimmed.startsWith('-')) {
          // Skip special patterns that are not vocabulary cards
          if (/^(vt?|vi|adj|adv|prep|conj|int|pron|art|num)\.?\s*=/.test(content)) {
            i++;
            continue;
          }
          if (/^[\[\d／→]/.test(content) && content.length < 20) {
            i++;
            continue;
          }

          // Check if exiting phrase list (item at or above phrase marker level)
          if (this.inPhraseList && indentLevel <= this.phraseMarkerLevel) {
            this.inPhraseList = false;
            this.phraseMarkerLevel = -1;
          }

          // Process list item
          const lastLineIndex = this.processListItem(line, indentLevel, content, i);
          if (lastLineIndex !== null && lastLineIndex !== undefined && lastLineIndex > i) {
            i = lastLineIndex;  // Skip to last processed line
          } else {
            i++;
          }
          continue;
        }

        i++;
      }

      return this.cards;
    } catch (error) {
      console.error('Error parsing markdown:', error);
      throw error;
    }
  }

  /**
   * Process a list item and determine its type
   * CRITICAL: Returns number | undefined (NOT an object!)
   * - Returns number: the last line index processed (for sentence cards)
   * - Returns undefined: normal processing, continue to next line
   */
  processListItem(line, indentLevel, content, lineIndex) {
    // 规则1: 同义词标记检查 (== word or === word)
    if (this.isSynonymMarker(content)) {
      this.addSynonymToParent(content);
      return undefined;
    }

    // 规则2: 反义词标记检查 (规则9: Opposite: word)
    if (this.hasAntonymMarker(content)) {
      this.addAntonymToParent(content);
      return undefined;
    }

    // 规则3: 纯词性行检查 (n. 中文) - should be added to parent
    if (this.isPurePosLine(content)) {
      this.addPosToParent(content);
      return undefined;
    }

    // 规则4: 纯音标行检查 ([音标]) - should be added to parent
    if (this.isPureIpaLine(content)) {
      this.addIpaToParent(content);
      return undefined;
    }

    // 规则5: "- 词组"标记检查
    if (content === '词组') {
      this.inPhraseList = true;
      this.phraseMarkerLevel = indentLevel;  // Record the indent level
      return undefined;
    }

    // 规则6: 检查是否在词组列表中且当前是词组项
    if (this.inPhraseList && indentLevel > this.phraseMarkerLevel) {
      const card = this.createPhraseCard(content, indentLevel);
      this.cards.push(card);
      return undefined;
    }

    // 规则7: 确定卡片类型 (最后才调用 determineCardType)
    const cardType = this.determineCardType(content, indentLevel, lineIndex);

    // 创建卡片 based on type
    if (cardType === 'sentence') {
      return this.processSentence(content, indentLevel, lineIndex);
    } else if (cardType === 'word') {
      const card = this.createWordCard(content, indentLevel);
      this.cards.push(card);
      return undefined;
    } else if (cardType === 'phrase') {
      const card = this.createPhraseCard(content, indentLevel);
      this.cards.push(card);
      return undefined;
    } else if (cardType === 'prefix') {
      const card = this.createPrefixCard(content, indentLevel, lineIndex);
      this.cards.push(card);
      return undefined;
    }

    return undefined;
  }

  /**
   * Determine the card type based on content and context
   * Returns: 'word' | 'phrase' | 'sentence' | 'prefix'
   */
  determineCardType(content, indentLevel, lineIndex = null) {
    // 规则5: Check if it's a prefix or suffix (-xx-, -xxx, xx-)
    if (this.isPrefixOrSuffix(content, lineIndex)) {
      return 'prefix';
    }

    // Check if in phrase list (规则4: - 词组 or ## 词组)
    if (this.inPhraseList || this.inPhraseHeader) {
      return 'phrase';
    }

    // Check if content has POS marker (规则3: 只要有词性，一定是单词)
    if (this.hasPosMarker(content)) {
      return 'word';
    }

    // Check if content has IPA (word with pronunciation only)
    if (this.hasIpaMarker(content)) {
      return 'word';
    }

    // 规则3: 检查子级是否以词性开头
    // Only check for single words (not sentences)
    // Sentences contain spaces, multiple words, etc.
    const isSingleWord = /^[a-zA-Z'\-]+$/.test(content);
    if (isSingleWord && lineIndex !== null && this.firstChildHasPos(content, indentLevel, lineIndex)) {
      return 'word';
    }

    // 规则5d: 句子的子级（缩进）有词性的 → 单词卡片；其余 → 词组卡片
    // 注意：只针对"句子"的子级，不针对"单词"的子级
    const hasChinese = /[\u4e00-\u9fa5\uff08-\uff9e]/.test(content);
    const isChild = this.parentCard && this.parentLevel < indentLevel;
    if (isChild && hasChinese && !this.hasPosMarker(content)) {
      // 只当父级是 sentence 时，才判断为 phrase
      if (this.parentCard.type === 'sentence') {
        return 'phrase';
      }
    }

    // Otherwise, it's a sentence
    return 'sentence';
  }

  /**
   * Process sentence - extract words/phrases and create sentence card
   * Returns: lastLineIndex (number) - the last line index processed
   */
  processSentence(content, indentLevel, lineIndex) {
    const extractedCards = [];

    // Step 1: Remove ** markers (bold)
    let clean = content.replace(/\*\*/g, '');

    // Step 2: Extract *word(pos. definition)* patterns FIRST
    clean = this.extractItalicWords(clean, extractedCards);

    // Step 2.5: Remove remaining standalone * marks (not part of *word(def)* pattern)
    clean = clean.replace(/\*([a-zA-Z'-]+)\*/g, '$1');  // Remove * around single words

    // Step 3: Extract <ins>phrase</ins> patterns
    clean = this.extractInsPhrases(clean, extractedCards, indentLevel);

    // Step 6: Split English and Chinese
    // First, remove all (中文) patterns from the sentence for clean English text
    // This handles cases like: "... track down(追查到) kids ..." -> "... track down kids ..."
    const cleanEn = clean.replace(/\([^)]*[\u4e00-\u9fa5]+[^)]*\)/g, '').trim();

    // Check if there's any standalone Chinese (not in parentheses)
    // If all Chinese is in parentheses, then there's no standalone translation
    const cnMatch = cleanEn.match(/[\u4e00-\u9fa5\uff08-\uff9e]/);
    let en = cleanEn;  // Use the cleaned version (without parenthesized Chinese)
    let cn = '';

    if (cnMatch) {
      // There's standalone Chinese (not in parentheses) - split at that point
      const cnIndex = cleanEn.indexOf(cnMatch[0]);
      en = cleanEn.substring(0, cnIndex).trim();
      cn = cleanEn.substring(cnIndex).trim();
    }

    // Merge continuation lines for child processing (only)
    let mergedContent = content;
    let nextLineIndex = lineIndex + 1;
    let mergedLines = [];

    while (nextLineIndex < this.lines.length) {
      const nextLine = this.lines[nextLineIndex];
      const trimmed = nextLine.trim();

      if (!trimmed) {
        nextLineIndex++;
        continue;
      }

      const indentMatch = nextLine.match(/^(\s*)-/);
      if (indentMatch) {
        const nextIndentLevel = indentMatch[1].length;
        if (nextIndentLevel <= indentLevel) {
          break;
        }
        // Continuation line (more indented)
        mergedContent += ' ' + trimmed.substring(1).trim();
        mergedLines.push(nextLineIndex);
        nextLineIndex++;
        continue;
      }
      break;
    }

    // Create sentence card (using original content, not merged)
    const sentenceCard = {
      id: `card_${this.cardCounter++}`,
      word: clean.substring(0, 100), // First 100 chars as title
      type: 'sentence',
      fullText: clean,
      items: [{ type: 'sentence', en: en, cn: cn }]
    };

    // Set this sentence as the parent before processing children
    // This ensures that determineCardType can correctly identify children of sentences
    const savedParentCard = this.parentCard;
    const savedParentLevel = this.parentLevel;
    this.parentCard = sentenceCard;
    this.parentLevel = indentLevel;

    // Process children directly using a loop to ensure correct parent context
    // This bypasses processChildren which can have issues with parent context
    this.pendingSynonyms = [];
    const sentenceChildren = [];
    const promotedChildren = [];

    let i = lineIndex + 1;
    while (i < this.lines.length) {
      if (mergedLines.includes(i)) {
        i++;
        continue;
      }

      const line = this.lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      const indentMatch = line.match(/^(\s*)-/);
      if (!indentMatch) break;

      const childIndentLevel = indentMatch[1].length;
      if (childIndentLevel <= indentLevel) break;

      const content = trimmed.substring(1).trim();

      // Skip special markers
      if (this.isSynonymMarker(content)) {
        if (!this.pendingSynonyms) this.pendingSynonyms = [];
        this.pendingSynonyms.push(content.replace(/^===?\s+/, '').trim());
        i++;
        continue;
      }

      if (this.isPurePosLine(content) || this.isPureIpaLine(content)) {
        i++;
        continue;
      }

      // Determine card type with correct parent context (this sentence)
      this.parentCard = sentenceCard;
      this.parentLevel = indentLevel;
      const cardType = this.determineCardType(content, childIndentLevel, i);

      if (cardType === 'word') {
        const card = this.createWordCard(content, childIndentLevel);
        // Process children of this word card (recursively)
        const { children: wordChildren } = this.processChildren(childIndentLevel, i, [], card);
        if (wordChildren.length > 0) {
          card.children = wordChildren;
        }
        // Skip to last child
        const savedParent = this.parentCard;
        const savedLevel = this.parentLevel;
        this.parentCard = savedParent;
        this.parentLevel = savedLevel;
        i++;
        continue;
      } else if (cardType === 'phrase') {
        const card = this.createPhraseCard(content, childIndentLevel);
        promotedChildren.push(card);
        i++;
        continue;
      } else if (cardType === 'prefix') {
        const card = this.createPrefixCard(content, childIndentLevel, i);
        promotedChildren.push(card);
        i++;
        continue;
      } else {
        // Sentence card
        const childSentenceCard = {
          id: `card_${this.cardCounter++}`,
          word: content,
          type: 'sentence',
          fullText: content,
          items: [{ type: 'sentence', en: content, cn: '' }]
        };
        sentenceChildren.push(childSentenceCard);
        i++;
        continue;
      }

      // The loop now handles all cases with explicit i++
    }

    const lastLineIndex = i - 1;

    // Restore parent context
    this.parentCard = savedParentCard;
    this.parentLevel = savedParentLevel;

    // Assign sentence children
    sentenceCard.children = sentenceChildren;

    // Calculate the correct lastLineIndex for the main loop
    // The main loop should skip promoted children (they will be processed separately)
    let correctLastLineIndex = lineIndex;
    if (promotedChildren.length > 0) {
      // If there are promoted children, skip to the last promoted child
      // so the main loop doesn't process them again
      correctLastLineIndex = lastLineIndex;
    } else if (sentenceChildren.length > 0) {
      // If there are direct children, skip all of them (including their nested descendants)
      correctLastLineIndex = lastLineIndex;
    }
    // If there are no children at all, return current line index

    // Add promoted children to extractedCards (they will be added to this.cards)
    extractedCards.push(...promotedChildren);

    // Add extracted cards (includes promoted word/phrase grandchildren)
    extractedCards.forEach(card => {
      this.cards.push(card);
    });

    // Add synonyms if any
    if (this.pendingSynonyms && this.pendingSynonyms.length > 0) {
      sentenceCard.synonyms = this.pendingSynonyms.map(word => ({ word }));
    }

    // Restore parent context (sentence card doesn't have POS lines that follow like words do)
    this.parentCard = savedParentCard;
    this.parentLevel = savedParentLevel;

    // Add sentence card to cards array
    this.cards.push(sentenceCard);

    return correctLastLineIndex;
  }

  /**
   * Process children items
   * Returns: { children: Array, lastLineIndex: number }
   */
  processChildren(parentIndentLevel, lineIndex, skipLines = [], explicitParentCard = null) {
    const children = [];
    let i = lineIndex + 1;

    const savedParentCard = this.parentCard;
    const savedParentLevel = this.parentLevel;

    // Use explicit parent if provided (e.g., when processing children of a sentence)
    const actualParentCard = explicitParentCard || savedParentCard;

    while (i < this.lines.length) {
      if (skipLines.includes(i)) {
        i++;
        continue;
      }

      const line = this.lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      const indentMatch = line.match(/^(\s*)-/);
      if (!indentMatch) break;
      const indentLevel = indentMatch[1].length;

      if (indentLevel <= parentIndentLevel) break;

      const content = trimmed.substring(1).trim();

      // Handle special markers first
      if (this.isSynonymMarker(content)) {
        // Add to parent sentence's synonyms
        const synonymWord = content.replace(/^===?\s+/, '').trim();
        if (!this.pendingSynonyms) {
          this.pendingSynonyms = [];
        }
        this.pendingSynonyms.push(synonymWord);
        i++;
        continue;
      }

      // POS lines are now handled in the main loop, skip them here
      if (this.isPurePosLine(content)) {
        i++;
        continue;
      }

      // Check if it's a pure IPA line - skip (belongs to previous sibling)
      if (this.isPureIpaLine(content)) {
        i++;
        continue;
      }

      // Set parent context for type determination
      // Use explicit parent if provided, otherwise use saved parent
      this.parentCard = actualParentCard;
      this.parentLevel = parentIndentLevel;

      const cardType = this.determineCardType(content, indentLevel, lineIndex);

      // SPECIAL CASE: If parent is a sentence and this item has Chinese but no POS marker, classify as phrase
      // This handles cases like "follow the clue home 顺着线索" which should be phrase, not sentence
      if (actualParentCard && actualParentCard.type === 'sentence') {
        const hasChinese = /[\u4e00-\u9fa5\uff08-\uff9e]/.test(content);
        const hasPosMarker = this.hasPosMarker(content);
        if (hasChinese && !hasPosMarker) {
          // Override to phrase
          const phraseCard = this.createPhraseCard(content, indentLevel);
          children.push(phraseCard);
          i++;
          continue;
        }
      }

      if (cardType === 'word') {
        const card = this.createWordCard(content, indentLevel);
        // Process children of this word card (pass the word card as explicit parent)
        const { children: wordChildren, lastLineIndex: wordLastLine } = this.processChildren(indentLevel, i, [], card);
        if (wordChildren.length > 0) {
          card.children = wordChildren;
        }
        children.push(card);
        // Skip lines that were already processed by recursive call
        if (wordLastLine >= i) {
          i = wordLastLine;
        }
      } else if (cardType === 'phrase') {
        const card = this.createPhraseCard(content, indentLevel);
        children.push(card);
      } else if (cardType === 'prefix') {
        const card = this.createPrefixCard(content, indentLevel, lineIndex);
        children.push(card);
      } else {
        const sentenceCard = {
          id: `card_${this.cardCounter++}`,
          word: content,
          type: 'sentence',
          fullText: content,
          items: [{ type: 'sentence', en: content, cn: '' }]
        };
        children.push(sentenceCard);
      }

      i++;
    }

    // Restore parent context
    this.parentCard = savedParentCard;
    this.parentLevel = savedParentLevel;

    return { children, lastLineIndex: i - 1 };
  }

  /**
   * Check if it's a prefix/suffix (规则5)
   * Depends on this.hasPosMarker
   */
  isPrefixOrSuffix(content, lineIndex = null) {
    const trimmed = content.trim();
    const cnMatch = trimmed.match(/[\u4e00-\u9fa5]/);
    const englishPart = cnMatch ? trimmed.substring(0, trimmed.indexOf(cnMatch[0])).trim() : trimmed;
    const prefixSuffixPattern = /^-?[a-z]{1,5}-?$/;
    const patternMatch = prefixSuffixPattern.test(englishPart);
    const hasPos = this.hasPosMarker(content);
    const hasChineseOnSameLine = /[\u4e00-\u9fa5]/.test(content);
    return patternMatch && !hasPos && hasChineseOnSameLine;
  }

  /**
   * Check if first child has POS marker
   * @param {string} content - The parent line content
   * @param {number} indentLevel - The parent indent level
   * @param {number} parentLineIndex - The index of the parent line
   * Depends on this.lines
   */
  firstChildHasPos(content, indentLevel, parentLineIndex = null) {
    // Find the parent line starting from parentLineIndex (or from beginning if not provided)
    let searchStartIndex = parentLineIndex !== null ? parentLineIndex : 0;
    const lineIndex = this.lines.findIndex((line, idx) => {
      if (idx < searchStartIndex) return false;
      const trimmed = line.trim();
      if (!trimmed.startsWith('-')) return false;
      const lineIndent = line.match(/^(\s*)-/);
      const lineIndentLevel = lineIndent ? lineIndent[1].length : 0;
      return lineIndentLevel === indentLevel && trimmed.substring(1).trim() === content;
    });

    if (lineIndex === -1) return false;

    // Look for first child of this line and check if it has POS
    for (let i = lineIndex + 1; i < this.lines.length; i++) {
      const trimmed = this.lines[i].trim();
      if (!trimmed) continue;

      const indentMatch = this.lines[i].match(/^(\s*)-/);
      if (!indentMatch) return false;

      const childIndentLevel = indentMatch[1].length;
      const childContent = trimmed.substring(1).trim();

      if (childIndentLevel <= indentLevel) return false;

      if (this.hasPosMarker(childContent)) {
        return true;
      }

      if (childIndentLevel === indentLevel + 1) {
        return false;
      }
    }
    return false;
  }

  /**
   * Create a base card
   */
  createCard(word, type) {
    const card = {
      id: `card_${this.cardCounter++}`,
      word: word,
      type: type,
      items: []
    };
    return card;
  }

  /**
   * Create a word card
   */
  createWordCard(content, indentLevel) {
    const {word, ipa, pos, cn} = this.parseWordContent(content);
    const card = {
      id: `card_${this.cardCounter++}`,
      word: word,
      type: 'word',
      items: []
    };
    if (ipa) card.ipa = ipa;
    if (pos) {
      card.items.push({type: 'def', en: pos, cn: cn || ''});
    } else if (cn) {
      card.items.push({type: 'def', en: word, cn: cn});
    } else {
      card.items.push({type: 'def', en: word, cn: ''});
    }
    this.parentCard = card;
    this.parentLevel = indentLevel;
    return card;
  }

  /**
   * Create a phrase card
   */
  createPhraseCard(content, indentLevel) {
    const {word, cn} = this.parsePhraseContent(content);
    const card = {
      id: `card_${this.cardCounter++}`,
      word: word,
      type: 'phrase',
      items: [{type: 'def', en: word, cn: cn || ''}]
    };
    this.parentCard = card;
    this.parentLevel = indentLevel;
    return card;
  }

  /**
   * Create a prefix/suffix card
   */
  createPrefixCard(content, indentLevel, lineIndex = null) {
    const trimmed = content.trim();
    const cnMatch = trimmed.match(/[\u4e00-\u9fa5]/);
    const englishPart = cnMatch ? trimmed.substring(0, trimmed.indexOf(cnMatch[0])).trim() : trimmed;
    const chinesePart = cnMatch ? trimmed.substring(trimmed.indexOf(cnMatch[0])).trim() : '';

    const card = {
      id: `card_${this.cardCounter++}`,
      word: englishPart,
      type: 'prefix',
      items: [{type: 'def', en: englishPart, cn: chinesePart}]
    };
    this.parentCard = card;
    this.parentLevel = indentLevel;
    return card;
  }

  /**
   * Extract *word(pos. definition)* patterns from sentence
   */
  extractItalicWords(text, extractedCards) {
    return text.replace(/\*([a-zA-Z'-]+)\(([^*]*?)\)\*/g, (match, word, def) => {
      if (this.hasPosMarker(def)) {
        const card = this.createWordCard(`${word} ${def}`, 0);
        extractedCards.push(card);
        return word;
      }
      return word;
    });
  }

  /**
   * Extract <ins>phrase</ins> patterns from sentence
   */
  extractInsPhrases(text, extractedCards, indentLevel) {
    return text.replace(/<ins>(.*?)<\/ins>/g, (match, phrase) => {
      const cleanPhrase = phrase.replace(/\*/g, '').trim();
      const card = this.createPhraseCard(cleanPhrase, indentLevel);
      extractedCards.push(card);
      return cleanPhrase;
    });
  }

  /**
   * Add synonym to parent card
   */
  addSynonymToParent(content) {
    if (this.parentCard) {
      let synonymContent = content.replace(/^===?\s+/, '').trim();
      this.parentCard.synonyms = this.parentCard.synonyms || [];

      const multipleSynonyms = synonymContent.split(/\s+==\s+/);

      for (const syn of multipleSynonyms) {
        const trimmed = syn.trim();
        if (!trimmed) continue;

        const { word, ipa, pos, cn } = this.parseWordContent(trimmed);
        const synonym = { word };
        if (ipa) synonym.ipa = ipa;
        if (pos) synonym.pos = pos;
        if (cn) synonym.cn = cn;

        this.parentCard.synonyms.push(synonym);
      }
    }
  }

  /**
   * Add antonym to parent card
   */
  addAntonymToParent(content) {
    if (this.parentCard) {
      const antonymContent = content.replace(/^Opposite:\s*/, '').trim();
      this.parentCard.antonyms = this.parentCard.antonyms || [];

      const { word, ipa, pos, cn } = this.parseWordContent(antonymContent);
      const antonym = { word };
      if (ipa) antonym.ipa = ipa;
      if (pos) antonym.pos = pos;
      if (cn) antonym.cn = cn;

      this.parentCard.antonyms.push(antonym);
    }
  }

  /**
   * Add POS definition to parent card
   */
  addPosToParent(content) {
    if (this.parentCard) {
      const posMatch = content.match(/^([a-z]+\.)\s*(.*)/);
      if (posMatch) {
        const pos = posMatch[1];
        const rest = posMatch[2];
        const cn = rest.trim();

        // Remove placeholder if exists
        const placeholderIndex = this.parentCard.items.findIndex(
          item => item.en === this.parentCard.word && item.cn === ''
        );
        if (placeholderIndex !== -1) {
          this.parentCard.items.splice(placeholderIndex, 1);
        }

        this.parentCard.items.push({
          type: 'def',
          en: pos,
          cn: cn
        });
      }
    }
  }

  /**
   * Add IPA to parent card
   */
  addIpaToParent(content) {
    if (this.parentCard && !this.parentCard.ipa) {
      this.parentCard.ipa = content.trim();
    }
  }
}

console.log('MarkdownParser module loaded successfully');
