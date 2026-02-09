/**
 * Markdown Parser Module - Main Entry Point
 * Handles parsing of markdown vocabulary files into card objects
 * This module preserves the original parsing logic from review.html
 */

/**
 * REFACTORED MARKDOWN PARSER (V6 - Simplified Rules)
 *
 * === PARSE RULES (用户规则) ===
 *
 * 规则1: 从第一个 ## 开始解析
 *   - 忽略第一个 ## 之前的所有内容
 *
 * 规则2: 所有的 - 都是一个 Card，如果是词性则跟父级
 *   - 纯词性行（如 "n. 中文"）添加到父卡片的 items
 *
 * 规则3: 只要有词性，一定是单词
 *   - 检测到 pos. (adj., n., v., adv. 等) → word 类型
 *   - 使用 hasPosMarker() 检测: /\s+(?!sb\.|sth\.)([a-z]+\.)/
 *
 * 规则4: 如果是 "- 词组" 或 "## 词组" 的子级，那么一定是词组
 *   - 标记 "- 词组" 和 "## 词组" 本身忽略（不创建卡片）
 *   - 子级卡片类型为 phrase
 *
 * 规则5: 如果是 -xx-、-xxx、xx- 代表的是前缀后缀，前缀后缀会有中文释义，要注意前缀和连字符的区分
 *
 * 规则6: 句子解析规则
 *   a) 先删除 **xx** 标记中的 ** 符号
 *   b) *word(pos. def)* 包裹的：
 *      - 如果括号内有词性 → 提取为单词卡片
 *      - 其他情况 → 忽略
 *   c) <ins>phrase</ins> 包裹的 → 提取为词组卡片
 *   d) 句子的子级（缩进）：
 *      - 有词性的 → 单词卡片
 *      - 前缀后缀格式 (-xx-, xx-) → 前缀后缀卡片
 *      - 其他所有情况 → 词组卡片（不再有句子子级）
 *
 * 规则7: == 标记的是同义词
 *   - == word 或 === word → 添加到父卡片的 synonyms
 *
 * 规则8: [] 包裹的内容必须包含音标符号才被认为是音标（否则为语法说明）
 *   - 音标符号: əɪɛæʌɑɔʊʃʒθðŋˈˌ
 *   - 示例: [əˈfɜːmər] 是音标，[现在分词短语] 不是
 *
 * 规则9: 以 - Opposite: 开头的后面的是反义词，添加到单词的反义词中
 *
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
    this.pendingSynonymCard = null;  // Temporary card for synonym with child items (e.g., == curb followed by POS lines)
    this.pendingSynonymLevel = -1;  // Indent level of the pending synonym marker
    this.pendingSynonymOriginalParent = null;  // Original parent card before redirecting to synonym
    this.pendingSynonymOriginalLevel = -1;  // Original parent level before redirecting to synonym

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
   * Convert Markdown bold (**text**) to HTML (<strong>text</strong>)
   */
  convertBoldToHtml(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  /**
   * Remove Markdown bold markers (**text** -> text)
   */
  removeBoldMarkers(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '$1');
  }

  /**
   * Main parse method - implements the rule-based parsing logic
   * Returns array of parsed cards
   */
  parse() {
    try {
      // 规则1: 从第一个 ## 开始解析，忽略之前的所有内容
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
          } else {
            // 🔧 FIX: For non-vocabulary headers (like "## Words", "## 词组", "## 句式"),
            // reset parent context so that subsequent items are processed as independent
            // This prevents items from being incorrectly nested as children of previous section
            this.inPhraseHeader = headerWord.includes('词组');
            this.parentCard = null;
            this.parentLevel = -1;
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
          // Skip special patterns, but NOT pure IPA lines ([音标])
          if (/^[\[\d／→]/.test(content) && content.length < 20 && !this.isPureIpaLine(content)) {
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
          if (lastLineIndex !== null && lastLineIndex !== undefined) {
            // sentence cards always return a line index (the last line they processed)
            // We should skip to that line, and the next iteration will i++ to move past it
            // Only skip if lastLineIndex is greater than current line (strict > to avoid infinite loop)
            if (lastLineIndex > i) {
              i = lastLineIndex;  // Skip to last processed line
            } else {
              // Shouldn't happen, but handle gracefully
              i++;
            }
          } else {
            i++;
          }
          continue;
        }

        i++;
      }

      // Finalize any pending synonym card at the end of parsing
      if (this.pendingSynonymCard) {
        // Use indentLevel 0 to force finalization (end of file means we've exited any scope)
        this.finalizePendingSynonymIfNeeded(0);
      }

      return this.cards;
    } catch (error) {
      console.error('Error parsing markdown:', error);
      throw error;
    }
  }

  /**
   * Process a list item and determine its type
   * 按顺序检查以下规则：
   * 规则7: == 标记的是同义词
   * 规则9: - Opposite: 开头的是反义词
   * 规则2: 纯词性行添加到父卡片
   * 规则8: 纯音标行添加到父卡片
   * 规则4: "- 词组" 标记处理
   * CRITICAL: Returns number | undefined (NOT an object!)
   * - Returns number: the last line index processed (for sentence cards)
   * - Returns undefined: normal processing, continue to next line
   */
  processListItem(line, indentLevel, content, lineIndex) {
    // Finalize pending synonym card if we've exited its child scope
    // This should be checked BEFORE processing any new item
    this.finalizePendingSynonymIfNeeded(indentLevel);

    // 规则7: == 标记的是同义词 (== word or === word)
    if (this.isSynonymMarker(content)) {
      return this.addSynonymToParent(content, indentLevel);
    }

    // 规则9: 以 - Opposite: 开头的是反义词 (Opposite: word)
    if (this.hasAntonymMarker(content)) {
      this.addAntonymToParent(content);
      return undefined;
    }

    // 规则2: 纯词性行添加到父卡片的 items (n. 中文)
    if (this.isPurePosLine(content)) {
      this.addPosToParent(content);
      return undefined;
    }

    // 规则8: 纯音标行添加到父卡片 ([音标] 包含音标符号)
    if (this.isPureIpaLine(content)) {
      this.addIpaToParent(content);
      return undefined;
    }

    // 规则4: "- 词组" 标记本身不创建卡片，子级为词组卡片
    if (content === '词组') {
      this.inPhraseList = true;
      this.phraseMarkerLevel = indentLevel;  // Record the indent level
      return undefined;
    }

    // 规则4: 检查是否在词组列表中且当前是词组项
    if (this.inPhraseList && indentLevel > this.phraseMarkerLevel) {
      const card = this.createPhraseCard(content, indentLevel);
      // Process children of this phrase card
      const { children: phraseChildren, lastLineIndex: phraseLastLine } = this.processChildren(indentLevel, lineIndex, [], card);
      if (phraseChildren.length > 0) {
        card.children = phraseChildren;
      }
      this.cards.push(card);
      return phraseLastLine;
    }

    // 确定卡片类型 (调用 determineCardType)
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
      // Process children of this phrase card
      const { children: phraseChildren, lastLineIndex: phraseLastLine } = this.processChildren(indentLevel, lineIndex, [], card);
      if (phraseChildren.length > 0) {
        card.children = phraseChildren;
      }
      this.cards.push(card);
      return phraseLastLine;
    } else if (cardType === 'prefix') {
      const card = this.createPrefixCard(content, indentLevel, lineIndex);
      this.cards.push(card);
      return undefined;
    }

    return undefined;
  }

  /**
   * Determine the card type based on content and context
   * 规则3: 只要有词性，一定是单词
   * 规则4: 如果是 "- 词组" 或 "## 词组" 的子级，那么一定是词组
   * 规则5: 如果是 -xx-、-xxx、xx- 代表的是前缀后缀
   * 规则6d: 句子的子级（缩进）：有词性的 → 单词卡片；其余 → 词组卡片（不再有句子子级）
   * Returns: 'word' | 'phrase' | 'sentence' | 'prefix'
   */
  determineCardType(content, indentLevel, lineIndex = null) {
    // 规则5: Check if it's a prefix or suffix (-xx-, -xxx, xx-)
    if (this.isPrefixOrSuffix(content, lineIndex)) {
      return 'prefix';
    }

    // SPECIAL CASE: If parent is a phrase card and this is pure Chinese (no English), it's a definition item
    if (this.parentCard && this.parentCard.type === 'phrase') {
      const hasChinese = /[\u4e00-\u9fa5\uff08-\uff9e]/.test(content);
      const hasEnglish = /[a-zA-Z]/.test(content);
      const hasPosMarker = this.hasPosMarker(content);
      if (hasChinese && !hasEnglish && !hasPosMarker) {
        return 'definition';
      }
    }

    // Check if in phrase list (规则4: ## 词组 or - 词组)
    // Both ## 词组 and - 词组 markers create phrase cards for their children
    if (this.inPhraseHeader) {
      return 'phrase';
    }
    if (this.inPhraseList) {
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
    // Allow for trailing emojis/annotations (e.g., "baseless 😔")
    // 🔧 FIX: Make the regex more strict - single words should have at most ONE space
    // This prevents sentences like "The police followed..." from being classified as single words
    const isSingleWord = /^[a-zA-Z'\-]+(?:\s[^a-zA-Z]*)?$/.test(content);
    if (isSingleWord && lineIndex !== null && this.firstChildHasPos(content, indentLevel, lineIndex)) {
      return 'word';
    }

    // 规则6d: 句子的子级（缩进）有词性的 → 单词卡片；其余 → 词组卡片
    // 注意：只针对"句子"的子级，不针对"单词"的子级
    const hasChinese = /[\u4e00-\u9fa5\uff08-\uff9e]/.test(content);
    const isChild = this.parentCard && this.parentLevel < indentLevel;
    if (isChild && this.parentCard.type === 'sentence') {
      // 句子的子级都是 phrase 类型（不管是否有中文）
      if (!this.hasPosMarker(content)) {
        return 'phrase';
      }
    }

    // Otherwise, it's a sentence
    return 'sentence';
  }

  /**
   * Process sentence - extract words/phrases and create sentence card
   * 规则6: 句子解析规则
   *   a) 先删除 **xx** 标记中的 ** 符号
   *   b) *word(pos. def)* 包裹的：如果括号内有词性 → 提取为单词卡片
   *   c) <ins>phrase</ins> 包裹的 → 提取为词组卡片
   *   d) 句子的子级（缩进）：
   *      - 有词性的 → 单词卡片 (word)
   *      - 前缀后缀格式 (-xx-, xx-) → 前缀后缀卡片 (prefix)
   *      - 其他所有情况 → 词组卡片 (phrase)，不再有句子子级
   * Returns: lastLineIndex (number) - the last line index processed
   */
  processSentence(content, indentLevel, lineIndex) {
    const extractedCards = [];

    // 🔧 FIX: Merge continuation lines before processing
    // Continuation lines are indented lines that don't start with a list marker
    // Example: "..." (line 1) + "  continuation" (line 2)
    let mergedContent = content;
    let nextLineIndex = lineIndex + 1;
    let mergedLines = [];  // Track merged line indices to skip in processChildren

    while (nextLineIndex < this.lines.length) {
      const nextLine = this.lines[nextLineIndex];
      const trimmed = nextLine.trim();

      // Skip empty lines
      if (!trimmed) {
        nextLineIndex++;
        continue;
      }

      // Check if it's a list item
      const indentMatch = nextLine.match(/^(\s*)-/);
      if (indentMatch) {
        const nextIndentLevel = indentMatch[1].length;

        // If same level or less, it's not a continuation
        if (nextIndentLevel <= indentLevel) {
          break;
        }

        // More indented - could be child card or continuation line
        // Check if child content looks like a separate card
        const childContent = trimmed.substring(1).trim();

        // 🔧 FIX: Check if this is a REAL child card (has special markers or starts a new thought)
        const isRealChild =
            this.isSynonymMarker(childContent) ||
            this.hasAntonymMarker(childContent) ||
            this.isPurePosLine(childContent) ||
            this.isPureIpaLine(childContent) ||
            (/^[a-z]+\./.test(childContent));  // Lines starting with POS markers are separate cards

        if (isRealChild) {
          // This is a genuine child card, not a continuation
          break;
        } else {
          // 🔧 FIX: Lines with "-" are independent cards, NOT continuation lines!
          // Only pure text (without "-") should be merged as continuation
          // Break here and let it be processed as a separate card (phrase/sentence)
          break;
        }
      }

      // Not a list item - if it doesn't start with '-', merge it as continuation
      if (!trimmed.startsWith('-')) {
        // Stop at section headers (##)
        if (trimmed.startsWith('##')) {
          break;
        }
        // Any other line without '-' is part of the sentence
        mergedContent += ' ' + trimmed;
        mergedLines.push(nextLineIndex);
        nextLineIndex++;
        continue;
      }

      // Not a continuation line
      break;
    }

    // Now process the merged content
    content = mergedContent;

    // Step 1: Protect **text** patterns with placeholders before any other processing
    const boldPlaceholders = [];
    let protectedContent = content.replace(/\*\*(.*?)\*\*/g, (match, content) => {
      const placeholder = `__BOLD_${boldPlaceholders.length}__`;
      boldPlaceholders.push(content);
      return placeholder;
    });

    // Step 2: Extract *word(pos. definition)* patterns FIRST
    let clean = this.extractItalicWords(protectedContent, extractedCards);

    // Step 3: Remove remaining standalone * marks (not part of *word(def)* pattern)
    clean = clean.replace(/\*([a-zA-Z'-]+)\*/g, '$1');  // Remove * around single words

    // Step 4: Extract <ins>phrase</ins> patterns
    clean = this.extractInsPhrases(clean, extractedCards, indentLevel, boldPlaceholders);

    // Step 5: Split English and Chinese
    // First, remove all (中文) patterns from the sentence for clean English text
    // This handles cases like: "... track down(追查到) kids ..." -> "... track down kids ..."
    const cleanEnWithPlaceholders = clean.replace(/\([^)]*[\u4e00-\u9fa5]+[^)]*\)/g, '').trim();

    // Check if there's any standalone Chinese (not in parentheses)
    // If all Chinese is in parentheses, then there's no standalone translation
    const cnMatch = cleanEnWithPlaceholders.match(/[\u4e00-\u9fa5\uff08-\uff9e]/);
    let enWithPlaceholders = cleanEnWithPlaceholders;  // With bold placeholders still present
    let cn = '';

    if (cnMatch) {
      // There's standalone Chinese (not in parentheses) - split at that point
      const cnIndex = cleanEnWithPlaceholders.indexOf(cnMatch[0]);
      enWithPlaceholders = cleanEnWithPlaceholders.substring(0, cnIndex).trim();
      cn = cleanEnWithPlaceholders.substring(cnIndex).trim();
    }

    // Step 6: Remove bold placeholders for clean text (word field and items[0].en)
    const cleanEn = enWithPlaceholders.replace(/__BOLD_(\d+)__/g, (match, index) => {
      return boldPlaceholders[index];
    });

    // Step 7: Restore bold placeholders for displayWord
    const displayWord = enWithPlaceholders.replace(/__BOLD_(\d+)__/g, (match, index) => {
      return `<strong>${boldPlaceholders[index]}</strong>`;
    });

    // Create sentence card
    const sentenceCard = {
      id: `card_${this.cardCounter++}`,
      word: cleanEn.substring(0, 50) + (cleanEn.length > 50 ? '...' : ''), // First 50 chars as title (for stats list)
      displayWord: displayWord, // Full text with bold formatting (NOT truncated!)
      type: 'sentence',
      fullText: clean,
      items: [{ type: 'sentence', en: cleanEn, cn: cn }]
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

    let i = nextLineIndex;  // Start after merged lines
    let lastProcessedLineIndex = lineIndex;  // Track the last line we actually processed
    while (i < this.lines.length) {
      const line = this.lines[i];
      const trimmed = line.trim();

      // Skip merged lines
      if (mergedLines.includes(i)) {
        i++;
        continue;
      }

      if (!trimmed) {
        i++;
        continue;
      }

      const indentMatch = line.match(/^(\s*)-/);
      if (!indentMatch) {
        break;
      }

      const childIndentLevel = indentMatch[1].length;
      if (childIndentLevel <= indentLevel) {
        break;
      }

      const content = trimmed.substring(1).trim();

      // Skip special markers
      if (this.isSynonymMarker(content)) {
        if (!this.pendingSynonyms) this.pendingSynonyms = [];
        this.pendingSynonyms.push(content.replace(/^===?\s+/, '').trim());
        lastProcessedLineIndex = i;  // Track this line as processed
        i++;
        continue;
      }

      if (this.isPurePosLine(content) || this.isPureIpaLine(content)) {
        lastProcessedLineIndex = i;  // Track this line as processed
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
        // 🔧 FIX: Add word card to promotedChildren so it gets added to cards array
        promotedChildren.push(card);
        // Skip to last child
        const savedParent = this.parentCard;
        const savedLevel = this.parentLevel;
        this.parentCard = savedParent;
        this.parentLevel = savedLevel;
        lastProcessedLineIndex = i;  // Track this line as processed
        i++;
        continue;
      } else if (cardType === 'phrase') {
        const card = this.createPhraseCard(content, childIndentLevel);
        // 🔧 FIX: Process children of this phrase card (e.g., synonyms)
        const { children: phraseChildren, lastLineIndex: phraseLastLine } = this.processChildren(childIndentLevel, i, [], card);
        if (phraseChildren.length > 0) {
          card.children = phraseChildren;
        }
        promotedChildren.push(card);
        // Update lastProcessedLineIndex to skip processed children
        if (phraseLastLine > lastProcessedLineIndex) {
          lastProcessedLineIndex = phraseLastLine;
        }
        i++;
        continue;
      } else if (cardType === 'prefix') {
        const card = this.createPrefixCard(content, childIndentLevel, i);
        // 🔧 FIX: Process children of this prefix card
        const { children: prefixChildren, lastLineIndex: prefixLastLine } = this.processChildren(childIndentLevel, i, [], card);
        if (prefixChildren.length > 0) {
          card.children = prefixChildren;
        }
        promotedChildren.push(card);
        // Update lastProcessedLineIndex to skip processed children
        if (prefixLastLine > lastProcessedLineIndex) {
          lastProcessedLineIndex = prefixLastLine;
        }
        i++;
        continue;
      } else {
        // Fallback: 如果走到这里，说明 determineCardType 返回了 'sentence'
        // 但句子的子级不应该是句子类型，所以作为 phrase 处理
        const card = this.createPhraseCard(content, childIndentLevel);
        // Process children of this phrase card
        const { children: phraseChildren, lastLineIndex: phraseLastLine } = this.processChildren(childIndentLevel, i, [], card);
        if (phraseChildren.length > 0) {
          card.children = phraseChildren;
        }
        promotedChildren.push(card);
        // Update lastProcessedLineIndex to skip processed children
        if (phraseLastLine > lastProcessedLineIndex) {
          lastProcessedLineIndex = phraseLastLine;
        }
        i++;
        continue;
      }

      // The loop now handles all cases with explicit i++
    }

    // Use the tracked last processed line index (instead of calculating i - 1)
    const lastLineIndex = lastProcessedLineIndex;

    // Restore parent context
    this.parentCard = savedParentCard;
    this.parentLevel = savedParentLevel;

    // Assign sentence children
    sentenceCard.children = sentenceChildren;

    // Calculate the correct lastLineIndex for the main loop
    // IMPORTANT: We need to return the line index that the main loop should set i to
    // The main loop will: i = returnedValue; continue; then next iteration: while (i < this.lines.length)
    // So we should return lineIndex + 1 to move to the next line (or lastLineIndex + 1 to skip children)
    let correctLastLineIndex = lineIndex + 1;  // Default: move to next line
    if (promotedChildren.length > 0 || sentenceChildren.length > 0) {
      // If there are children, skip them by returning lastLineIndex + 1
      correctLastLineIndex = lastLineIndex + 1;
    }
    // If there are no children at all, return lineIndex + 1 to move to next line

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
      if (!indentMatch) {
        // Finalize any pending synonym card before breaking
        this.finalizePendingSynonymIfNeeded(0);
        break;
      }
      const indentLevel = indentMatch[1].length;

      // Finalize pending synonym card if we've exited its child scope
      this.finalizePendingSynonymIfNeeded(indentLevel);

      if (indentLevel <= parentIndentLevel) {
        // Finalize any pending synonym card before exiting
        this.finalizePendingSynonymIfNeeded(0);
        break;
      }

      const content = trimmed.substring(1).trim();

      // Handle special markers first
      if (this.isSynonymMarker(content)) {
        // Check if the current parent is a word or phrase card
        // If so, add the synonym to that card, not to the sentence
        if (actualParentCard && (actualParentCard.type === 'word' || actualParentCard.type === 'phrase')) {
          // This synonym belongs to the nested word/phrase card
          const synonymContent = content.replace(/^===?\s+/, '').trim();
          actualParentCard.synonyms = actualParentCard.synonyms || [];

          const { word, ipa, pos, cn } = this.parseWordContent(synonymContent);

          // Check if this synonym has definition on the same line
          if (pos && cn) {
            // Simple case: add directly
            const synonym = { word };
            if (ipa) synonym.ipa = ipa;
            if (pos) synonym.pos = pos;
            if (cn) synonym.cn = cn;
            actualParentCard.synonyms.push(synonym);
          } else {
            // Complex case: synonym has children (POS lines following)
            // Create a temporary synonym card
            this.pendingSynonymCard = {
              word: word,
              items: []
            };
            if (ipa) this.pendingSynonymCard.ipa = ipa;
            this.pendingSynonymLevel = indentLevel;
            this.pendingSynonymOriginalParent = actualParentCard;

            // Redirect parentCard to temporary card so POS lines go to it
            this.parentCard = this.pendingSynonymCard;
            this.parentLevel = indentLevel;
          }
        } else {
          // Add to parent sentence's synonyms
          const synonymWord = content.replace(/^===?\s+/, '').trim();
          if (!this.pendingSynonyms) {
            this.pendingSynonyms = [];
          }
          this.pendingSynonyms.push(synonymWord);
        }
        i++;
        continue;
      }

      // POS lines should be added to parent word card
      if (this.isPurePosLine(content)) {
        // Check if we're currently processing a pending synonym card
        if (this.pendingSynonymCard) {
          // Add POS to the pending synonym card
          const posMatch = content.match(/^([a-z]+\.)\s*(.*)/);
          if (posMatch) {
            const pos = posMatch[1];
            const rest = posMatch[2];
            const cn = rest.trim();

            // Remove placeholder if exists
            const placeholderIndex = this.pendingSynonymCard.items.findIndex(
              item => item.en === this.pendingSynonymCard.word && item.cn === ''
            );
            if (placeholderIndex !== -1) {
              this.pendingSynonymCard.items.splice(placeholderIndex, 1);
            }

            this.pendingSynonymCard.items.push({
              type: 'def',
              en: pos,
              cn: cn
            });
          }
        } else if (actualParentCard && actualParentCard.type === 'word') {
          // Add POS to the actual parent word card
          const posMatch = content.match(/^([a-z]+\.)\s*(.*)/);
          if (posMatch) {
            const pos = posMatch[1];
            const rest = posMatch[2];
            const cn = rest.trim();

            // Remove placeholder if exists
            const placeholderIndex = actualParentCard.items.findIndex(
              item => item.en === actualParentCard.word && item.cn === ''
            );
            if (placeholderIndex !== -1) {
              actualParentCard.items.splice(placeholderIndex, 1);
            }

            actualParentCard.items.push({
              type: 'def',
              en: pos,
              cn: cn
            });
          }
        }
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
        // Only skip if recursive call actually moved past current line (strict > to avoid infinite loop)
        if (wordLastLine > i) {
          i = wordLastLine;
        }
        // Otherwise, i++ at end will handle advancing to next line
      } else if (cardType === 'phrase') {
        const card = this.createPhraseCard(content, indentLevel);
        // Process children of this phrase card
        const { children: phraseChildren, lastLineIndex: phraseLastLine } = this.processChildren(indentLevel, i, [], card);
        if (phraseChildren.length > 0) {
          card.children = phraseChildren;
        }
        children.push(card);
        // Skip lines that were already processed by recursive call
        // Only skip if recursive call actually moved past current line (strict > to avoid infinite loop)
        if (phraseLastLine > i) {
          i = phraseLastLine;
        }
        // Otherwise, i++ at end will handle advancing to next line
      } else if (cardType === 'definition') {
        // Definition item for phrase card - add to parent phrase card's items
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

    // Finalize any pending synonym card before returning
    this.finalizePendingSynonymIfNeeded(0);

    return { children, lastLineIndex: i - 1 };
  }

  /**
   * Check if it's a prefix/suffix
   * 规则5: 如果是 -xx-、-xxx、xx- 代表的是前缀后缀
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
    const {word, ipa, pos, cn, synonyms} = this.parseWordContent(content);
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
    } else if (!ipa) {
      // Only add placeholder if there's no IPA either
      // If there's IPA, the real definition will come from children (POS lines)
      card.items.push({type: 'def', en: word, cn: ''});
    }

    // Add synonyms extracted from == pattern (e.g., "unpretentious(adj. 谦逊的 == modest)")
    if (synonyms && synonyms.length > 0) {
      card.synonyms = synonyms;
    }

    // 🔧 FIX: Don't set parent for nested words within sentences
    // Words that are children of sentences should not become the global parent
    // because their sub-items (POS lines, synonyms) should be added to the word card itself
    // through processChildren, not through the global parentCard
    const isNestedWordInSentence =
      this.parentCard && this.parentCard.type === 'sentence' &&  // Parent is a sentence
      ipa;  // Has IPA (indicates it's a real word with pronunciation)

    if (!isNestedWordInSentence) {
      this.parentCard = card;
      this.parentLevel = indentLevel;
    }

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
   * 规则6b: *word(pos. def)* 包裹的，如果括号内有词性 → 提取为单词卡片
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
   * 规则6c: <ins>phrase</ins> 包裹的 → 提取为词组卡片
   */
  extractInsPhrases(text, extractedCards, indentLevel, boldPlaceholders = []) {
    return text.replace(/<ins>(.*?)<\/ins>/g, (match, phrase) => {
      let cleanPhrase = phrase.replace(/\*/g, '').trim();

      // 🔧 FIX: Restore bold placeholders in phrase
      // For phrase cards, we want plain text (e.g., "air", not "<strong>air</strong>")
      cleanPhrase = cleanPhrase.replace(/__BOLD_(\d+)__/g, (match, index) => {
        return boldPlaceholders[index] || match;
      });

      const card = this.createPhraseCard(cleanPhrase, indentLevel);
      extractedCards.push(card);
      return cleanPhrase;
    });
  }

  /**
   * Add synonym to parent card
   * 规则7: == 标记的是同义词，添加到父卡片的 synonyms
   * Returns: undefined (normal processing)
   */
  addSynonymToParent(content, indentLevel) {
    if (!this.parentCard) {
      return undefined;
    }

    // First, finalize any pending synonym card if exists
    this.finalizePendingSynonymIfNeeded(indentLevel);

    let synonymContent = content.replace(/^===?\s+/, '').trim();
    this.parentCard.synonyms = this.parentCard.synonyms || [];

    const multipleSynonyms = synonymContent.split(/\s+==\s+/);

    for (const syn of multipleSynonyms) {
      const trimmed = syn.trim();
      if (!trimmed) continue;

      const { word, ipa, pos, cn } = this.parseWordContent(trimmed);

      // Check if this synonym has definition on the same line (simple case)
      // Example: == restrain vt. 抑制
      if (pos && cn) {
        // Simple case: add directly to synonyms
        const synonym = { word };
        if (ipa) synonym.ipa = ipa;
        if (pos) synonym.pos = pos;
        if (cn) synonym.cn = cn;

        // Prevent duplicate synonyms: check if a synonym with the same word already exists
        const isDuplicate = this.parentCard.synonyms.some(
          existingSyn => existingSyn.word === word
        );

        if (!isDuplicate) {
          this.parentCard.synonyms.push(synonym);
        }
      } else {
        // Complex case: == curb (definition items follow in child lines)
        // Create a temporary card to collect child items
        // Save the original parent context
        this.pendingSynonymOriginalParent = this.parentCard;
        this.pendingSynonymOriginalLevel = this.parentLevel;

        // Create temporary card for this synonym
        this.pendingSynonymCard = {
          word: word,
          items: []
        };
        if (ipa) this.pendingSynonymCard.ipa = ipa;

        // Track the indent level of this synonym marker
        this.pendingSynonymLevel = indentLevel;

        // Redirect parentCard to the temporary card
        // This ensures subsequent POS lines are added to the synonym, not the original parent
        this.parentCard = this.pendingSynonymCard;
        this.parentLevel = indentLevel;
      }
    }

    return undefined;
  }

  /**
   * Add antonym to parent card
   * 规则9: 以 - Opposite: 开头的是反义词，添加到单词的反义词中
   * Finds the nearest word-type ancestor card (not sentence)
   */
  addAntonymToParent(content) {
    // Find the nearest word-type parent card by searching backward through cards
    let wordParentCard = null;

    // First check if current parent is a word card
    if (this.parentCard && this.parentCard.type === 'word') {
      wordParentCard = this.parentCard;
    } else {
      // Search backward through cards array to find the nearest word card
      for (let i = this.cards.length - 1; i >= 0; i--) {
        const card = this.cards[i];
        if (card.type === 'word' || card.type === 'phrase' || card.type === 'prefix') {
          wordParentCard = card;
          break;
        }
        // Stop at sentence cards (don't go past them)
        if (card.type === 'sentence') {
          break;
        }
      }
    }

    if (wordParentCard) {
      const antonymContent = content.replace(/^Opposite:\s*/, '').trim();
      wordParentCard.antonyms = wordParentCard.antonyms || [];

      const { word, ipa, pos, cn } = this.parseWordContent(antonymContent);
      const antonym = { word };
      if (ipa) antonym.ipa = ipa;
      if (pos) antonym.pos = pos;
      if (cn) antonym.cn = cn;

      wordParentCard.antonyms.push(antonym);
    }
  }

  /**
   * Add POS definition to parent card
   * 规则2: 纯词性行（如 "n. 中文"）添加到父卡片的 items
   * Supports both regular parent cards and pending synonym cards
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
   * 规则8: [] 包裹的内容必须包含音标符号才被认为是音标
   */
  addIpaToParent(content) {
    if (this.parentCard && !this.parentCard.ipa) {
      this.parentCard.ipa = content.trim();
    }
  }

  /**
   * Finalize pending synonym card if we've exited its child scope
   * This should be called when we encounter an item at the same or higher level
   * @param {number} currentIndentLevel - The indent level of the current item
   */
  finalizePendingSynonymIfNeeded(currentIndentLevel) {
    if (this.pendingSynonymCard && currentIndentLevel <= this.pendingSynonymLevel) {
      // Convert pendingSynonymCard to a synonym object
      const synonym = {
        word: this.pendingSynonymCard.word
      };

      if (this.pendingSynonymCard.ipa) {
        synonym.ipa = this.pendingSynonymCard.ipa;
      }

      // Add items if present
      if (this.pendingSynonymCard.items && this.pendingSynonymCard.items.length > 0) {
        synonym.items = this.pendingSynonymCard.items;
      }

      // Add to original parent's synonyms array
      if (this.pendingSynonymOriginalParent) {
        this.pendingSynonymOriginalParent.synonyms =
          this.pendingSynonymOriginalParent.synonyms || [];

        // Prevent duplicate synonyms: check if a synonym with the same word already exists
        const isDuplicate = this.pendingSynonymOriginalParent.synonyms.some(
          existingSyn => existingSyn.word === synonym.word
        );

        if (!isDuplicate) {
          this.pendingSynonymOriginalParent.synonyms.push(synonym);
        }
      }

      // Restore parent context
      this.parentCard = this.pendingSynonymOriginalParent;
      this.parentLevel = this.pendingSynonymOriginalLevel;

      // Clear pending synonym state
      this.pendingSynonymCard = null;
      this.pendingSynonymLevel = -1;
      this.pendingSynonymOriginalParent = null;
      this.pendingSynonymOriginalLevel = -1;
    }
  }
}
