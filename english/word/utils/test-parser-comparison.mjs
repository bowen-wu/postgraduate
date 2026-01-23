#!/usr/bin/env node
/**
 * Bug Testing Script: Compare Original vs Refactored Parser
 *
 * This script tests the first 10 low-frequency files and compares:
 * 1. Card counts
 * 2. Card content (word, type, ipa, definitions, synonyms, antonyms, children)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOW_FREQ_DIR = join(__dirname, '../low-frequency');

// Test files (first 10)
const TEST_FILES = [
  '001-006.md',
  '007-012.md',
  '013-018.md',
  '019-024.md',
  '025-030.md',
  '031-036.md',
  '037-042.md',
  '043-048.md',
  '049-054.md',
  '055-060.md'
];

/**
 * Read markdown file content
 */
function readMarkdown(filename) {
  try {
    return readFileSync(join(LOW_FREQ_DIR, filename), 'utf-8');
  } catch (e) {
    console.error(`Failed to read ${filename}:`, e.message);
    return null;
  }
}

/**
 * Original Parser from review.html
 * Extracted and adapted for testing
 */
class OriginalMarkdownParser {
  constructor(text) {
    this.lines = text.split('\n');
    this.cards = [];
    this.inPhraseList = false;
    this.inPhraseHeader = false;
    this.phraseMarkerLevel = -1;
    this.parentCard = null;
    this.parentLevel = -1;
    this.cardCounter = 0;
    this.pendingSynonyms = [];

    // Static constants
    this.POS_MARKERS = new Set(['n.', 'v.', 'vi.', 'vt.', 'adj.', 'adv.', 'prep.', 'conj.', 'int.', 'pron.', 'art.', 'num.', 'aux.', 'phr.']);
    this.IPA_SYMBOLS = new Set(['ə', 'ɪ', 'ɛ', 'æ', 'ɑ', 'ɔ', 'ʌ', 'ʊ', 'ər', 'ɚ', 'ɪr', 'i', 'iː', 'ɑː', 'ɔː', 'uː', 'eɪ', 'aɪ', 'ɔɪ', 'aʊ', 'oʊ', 'ɪə', 'ɛə', 'ʊə']);
  }

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

        const indentMatch = line.match(/^(\s*)-/);
        const indentLevel = indentMatch ? indentMatch[1].length : 0;
        const content = trimmed.substring(1).trim();

        // Handle headers (## word)
        if (trimmed.startsWith('##')) {
          const headerWord = trimmed.substring(2).trim();
          if (this.isValidWordHeader(headerWord)) {
            this.inPhraseHeader = headerWord.includes('词组');
            const card = this.createCard(headerWord, 'word');
            this.cards.push(card);
            this.parentCard = card;
            this.parentLevel = 0;
          }
          i++;
          continue;
        }

        // Handle list items
        if (trimmed.startsWith('-')) {
          // Skip special patterns
          if (/^(vt?|vi|adj|adv|prep|conj|int|pron|art|num)\.?\s*=/.test(content)) {
            i++;
            continue;
          }
          if (/^[\[\d／→]/.test(content) && content.length < 20) {
            i++;
            continue;
          }

          // Check if exiting phrase list
          if (this.inPhraseList && indentLevel <= this.phraseMarkerLevel) {
            this.inPhraseList = false;
            this.phraseMarkerLevel = -1;
          }

          const lastLineIndex = this.processListItem(line, indentLevel, content, i);
          if (lastLineIndex !== null && lastLineIndex !== undefined && lastLineIndex > i) {
            i = lastLineIndex;
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

  processListItem(line, indentLevel, content, lineIndex) {
    // Rule 1: Synonym marker
    if (this.isSynonymMarker(content)) {
      this.addSynonymToParent(content);
      return undefined;
    }

    // Rule 2: Antonym marker
    if (this.hasAntonymMarker(content)) {
      this.addAntonymToParent(content);
      return undefined;
    }

    // Rule 3: Pure POS line
    if (this.isPurePosLine(content)) {
      this.addPosToParent(content);
      return undefined;
    }

    // Rule 4: Pure IPA line
    if (this.isPureIpaLine(content)) {
      this.addIpaToParent(content);
      return undefined;
    }

    // Rule 5: "- 词组" marker
    if (content === '词组') {
      this.inPhraseList = true;
      this.phraseMarkerLevel = indentLevel;
      return undefined;
    }

    // Rule 6: Check if in phrase list
    if (this.inPhraseList && indentLevel > this.phraseMarkerLevel) {
      const card = this.createPhraseCard(content, indentLevel);
      this.cards.push(card);
      return undefined;
    }

    // Rule 7: Determine card type
    const cardType = this.determineCardType(content, indentLevel, lineIndex);

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

  determineCardType(content, indentLevel, lineIndex = null) {
    if (this.inPhraseList || this.inPhraseHeader) {
      return 'phrase';
    }

    if (this.hasPosMarker(content)) {
      return 'word';
    }

    if (this.hasIpaMarker(content)) {
      return 'word';
    }

    const isSingleWord = /^[a-zA-Z'\-]+$/.test(content);
    if (isSingleWord && lineIndex !== null && this.firstChildHasPos(content, indentLevel, lineIndex)) {
      return 'word';
    }

    const hasChinese = /[\u4e00-\u9fa5\uff08-\uff9e]/.test(content);
    const isChild = this.parentCard && this.parentLevel < indentLevel;
    const isChildOfSentence = isChild && this.parentCard.type === 'sentence';
    if (isChildOfSentence && hasChinese && !this.hasPosMarker(content)) {
      return 'phrase';
    }

    const isChildOfWord = isChild && this.parentCard.type === 'word';
    if (isChildOfWord && hasChinese && !this.hasPosMarker(content)) {
      const looksLikeSentence = /^[A-Z]/.test(content) && content.includes(' ');
      if (looksLikeSentence) {
        return 'sentence';
      } else {
        return 'phrase';
      }
    }

    return 'sentence';
  }

  processSentence(content, indentLevel, lineIndex) {
    const extractedCards = [];

    // Merge continuation lines
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
        mergedContent += ' ' + trimmed.substring(1).trim();
        mergedLines.push(nextLineIndex);
        nextLineIndex++;
        continue;
      }
      break;
    }

    // Extract italic words and phrases
    let processedContent = this.extractItalicWords(mergedContent, extractedCards);
    processedContent = this.extractInsPhrases(processedContent, extractedCards, indentLevel);

    const sentenceCard = {
      id: `card_${this.cardCounter++}`,
      word: processedContent.substring(0, 100),
      type: 'sentence',
      fullText: processedContent,
      items: [{ type: 'sentence', en: processedContent, cn: '' }]
    };

    this.pendingSynonyms = [];
    const { children: childrenCards, lastLineIndex } = this.processChildren(indentLevel, lineIndex, mergedLines);
    extractedCards.push(...childrenCards);
    sentenceCard.children = childrenCards;

    extractedCards.forEach(card => {
      this.cards.push(card);
    });

    if (this.pendingSynonyms && this.pendingSynonyms.length > 0) {
      sentenceCard.synonyms = this.pendingSynonyms.map(word => ({ word }));
    }

    this.parentCard = sentenceCard;
    this.parentLevel = indentLevel;

    this.cards.push(sentenceCard);

    return lastLineIndex;
  }

  processChildren(parentIndentLevel, lineIndex, skipLines = []) {
    const children = [];
    let i = lineIndex + 1;

    const savedParentCard = this.parentCard;
    const savedParentLevel = this.parentLevel;

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

      if (this.isSynonymMarker(content)) {
        const synonymWord = content.replace(/^===?\s+/, '').trim();
        if (!this.pendingSynonyms) {
          this.pendingSynonyms = [];
        }
        this.pendingSynonyms.push(synonymWord);
        i++;
        continue;
      }

      if (this.isPurePosLine(content)) {
        i++;
        continue;
      }

      if (this.isPureIpaLine(content)) {
        i++;
        continue;
      }

      this.parentCard = savedParentCard;
      this.parentLevel = savedParentLevel;

      const cardType = this.determineCardType(content, indentLevel, lineIndex);

      if (cardType === 'word') {
        const card = this.createWordCard(content, indentLevel);
        children.push(card);
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

    this.parentCard = savedParentCard;
    this.parentLevel = savedParentLevel;

    return { children, lastLineIndex: i - 1 };
  }

  createCard(word, type) {
    return {
      id: `card_${this.cardCounter++}`,
      word: word,
      type: type,
      items: []
    };
  }

  createWordCard(content, indentLevel) {
    const { word, ipa, pos, cn } = this.parseWordContent(content);
    const card = {
      id: `card_${this.cardCounter++}`,
      word: word,
      type: 'word',
      items: []
    };
    if (ipa) card.ipa = ipa;
    if (pos) {
      card.items.push({ type: 'def', en: pos, cn: cn || '' });
    } else if (cn) {
      card.items.push({ type: 'def', en: word, cn: cn });
    } else {
      card.items.push({ type: 'def', en: word, cn: '' });
    }
    this.parentCard = card;
    this.parentLevel = indentLevel;
    return card;
  }

  createPhraseCard(content, indentLevel) {
    const { word, cn } = this.parsePhraseContent(content);
    const card = {
      id: `card_${this.cardCounter++}`,
      word: word,
      type: 'phrase',
      items: [{ type: 'def', en: word, cn: cn || '' }]
    };
    this.parentCard = card;
    this.parentLevel = indentLevel;
    return card;
  }

  createPrefixCard(content, indentLevel, lineIndex = null) {
    const trimmed = content.trim();
    const cnMatch = trimmed.match(/[\u4e00-\u9fa5]/);
    const englishPart = cnMatch ? trimmed.substring(0, trimmed.indexOf(cnMatch[0])).trim() : trimmed;
    const chinesePart = cnMatch ? trimmed.substring(trimmed.indexOf(cnMatch[0])).trim() : '';

    const card = {
      id: `card_${this.cardCounter++}`,
      word: englishPart,
      type: 'prefix',
      items: [{ type: 'def', en: englishPart, cn: chinesePart }]
    };
    this.parentCard = card;
    this.parentLevel = indentLevel;
    return card;
  }

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

  extractInsPhrases(text, extractedCards, indentLevel) {
    return text.replace(/<ins>(.*?)<\/ins>/g, (match, phrase) => {
      const cleanPhrase = phrase.replace(/\*/g, '').trim();
      const card = this.createPhraseCard(cleanPhrase, indentLevel);
      extractedCards.push(card);
      return cleanPhrase;
    });
  }

  parseWordContent(content) {
    let word = '';
    let ipa = null;
    let pos = null;
    let cn = '';

    // Extract IPA
    const ipaMatch = content.match(/\[([^\]]+)\]/);
    if (ipaMatch) {
      ipa = ipaMatch[0];
      const beforeIpa = content.substring(0, ipaMatch.index).trim();
      const afterIpa = content.substring(ipaMatch.index + ipaMatch[0].length).trim();
      word = beforeIpa || afterIpa.split(/\s+/)[0];
      const rest = beforeIpa ? '' : afterIpa.substring(word.length).trim();

      // Extract POS from rest
      for (const posMarker of this.POS_MARKERS) {
        if (rest.startsWith(posMarker)) {
          pos = posMarker;
          cn = rest.substring(posMarker.length).trim();
          break;
        }
      }
      if (!pos && rest) {
        cn = rest;
      }
    } else {
      const parts = content.split(/\s+/);
      word = parts[0];
      const rest = parts.slice(1).join(' ');

      for (const posMarker of this.POS_MARKERS) {
        if (rest.startsWith(posMarker)) {
          pos = posMarker;
          cn = rest.substring(posMarker.length).trim();
          break;
        }
      }
      if (!pos) {
        cn = rest;
      }
    }

    return { word: word.trim(), ipa, pos, cn };
  }

  parsePhraseContent(content) {
    const cnMatch = content.match(/[\u4e00-\u9fa5]/);
    if (cnMatch) {
      const cnIndex = cnMatch.index;
      return {
        word: content.substring(0, cnIndex).trim(),
        cn: content.substring(cnIndex).trim()
      };
    }
    return { word: content, cn: '' };
  }

  // Validator methods
  isSynonymMarker(content) {
    return /^===?\s+/.test(content.trim());
  }

  hasAntonymMarker(content) {
    return /^Opposite:\s*/i.test(content.trim());
  }

  isPurePosLine(content) {
    const trimmed = content.trim();
    for (const posMarker of this.POS_MARKERS) {
      if (trimmed.startsWith(posMarker)) {
        const rest = trimmed.substring(posMarker.length).trim();
        return !rest || /^[\u4e00-\u9fa5]/.test(rest);
      }
    }
    return false;
  }

  isPureIpaLine(content) {
    const trimmed = content.trim();
    if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
      return false;
    }
    const inner = trimmed.substring(1, trimmed.length - 1);
    for (const char of inner) {
      if (this.IPA_SYMBOLS.has(char) || /[ˈˌː\s·\-ˈˌː]/.test(char)) {
        return true;
      }
    }
    return false;
  }

  hasPosMarker(content) {
    for (const posMarker of this.POS_MARKERS) {
      if (content.includes(posMarker)) {
        return true;
      }
    }
    return false;
  }

  hasIpaMarker(content) {
    const ipaMatch = content.match(/\[([^\]]+)\]/);
    if (!ipaMatch) return false;
    const inner = ipaMatch[1];
    for (const char of inner) {
      if (this.IPA_SYMBOLS.has(char)) {
        return true;
      }
    }
    return false;
  }

  isValidWordHeader(headerWord) {
    if (!headerWord || headerWord.length > 50) return false;
    if (/^[\d\s\-]+$/.test(headerWord)) return true;
    if (/^[\u4e00-\u9fa5]+$/.test(headerWord)) return true;
    if (/^[a-zA-Z'\-]+$/.test(headerWord)) return true;
    return false;
  }

  firstChildHasPos(content, indentLevel, parentLineIndex = null) {
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

  addPosToParent(content) {
    if (this.parentCard) {
      const posMatch = content.match(/^([a-z]+\.)\s*(.*)/);
      if (posMatch) {
        const pos = posMatch[1];
        const rest = posMatch[2];
        const cn = rest.trim();
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

  addIpaToParent(content) {
    if (this.parentCard && !this.parentCard.ipa) {
      this.parentCard.ipa = content.trim();
    }
  }
}

/**
 * Refactored Parser (using the modular version)
 */
async function loadRefactoredParser() {
  // We need to import from the js/app folder
  const parserModulePath = join(__dirname, 'js/parser/index.js');

  // Use dynamic import
  const module = await import(`file://${parserModulePath}`);
  return module.MarkdownParser;
}

/**
 * Compare two cards for equality
 */
function compareCards(originalCard, refactoredCard) {
  const differences = [];

  if (originalCard.word !== refactoredCard.word) {
    differences.push(`word: "${originalCard.word}" vs "${refactoredCard.word}"`);
  }

  if (originalCard.type !== refactoredCard.type) {
    differences.push(`type: "${originalCard.type}" vs "${refactoredCard.type}"`);
  }

  if (originalCard.ipa !== refactoredCard.ipa) {
    differences.push(`ipa: "${originalCard.ipa}" vs "${refactoredCard.ipa}"`);
  }

  if (originalCard.items?.length !== refactoredCard.items?.length) {
    differences.push(`items count: ${originalCard.items?.length} vs ${refactoredCard.items?.length}`);
  }

  if (originalCard.synonyms?.length !== refactoredCard.synonyms?.length) {
    differences.push(`synonyms count: ${originalCard.synonyms?.length} vs ${refactoredCard.synonyms?.length}`);
  }

  if (originalCard.antonyms?.length !== refactoredCard.antonyms?.length) {
    differences.push(`antonyms count: ${originalCard.antonyms?.length} vs ${refactoredCard.antonyms?.length}`);
  }

  if (originalCard.children?.length !== refactoredCard.children?.length) {
    differences.push(`children count: ${originalCard.children?.length} vs ${refactoredCard.children?.length}`);
  }

  return differences;
}

/**
 * Main test function
 */
async function runTests() {
  console.log('='.repeat(80));
  console.log('Bug 测试报告：review-0121.html vs review.html');
  console.log('='.repeat(80));
  console.log('');

  const results = [];
  let totalDifferences = 0;

  // Load refactored parser
  const RefactoredMarkdownParser = await loadRefactoredParser();

  for (const filename of TEST_FILES) {
    console.log(`\n测试文件: ${filename}`);
    console.log('-'.repeat(60));

    const markdown = readMarkdown(filename);
    if (!markdown) {
      console.log(`  ❌ 无法读取文件`);
      continue;
    }

    // Parse with original parser
    const originalParser = new OriginalMarkdownParser(markdown);
    const originalCards = originalParser.parse();

    // Parse with refactored parser
    const refactoredParser = new RefactoredMarkdownParser(markdown);
    const refactoredCards = refactoredParser.parse();

    const originalCount = originalCards.length;
    const refactoredCount = refactoredCards.length;

    console.log(`  原版卡片数: ${originalCount}`);
    console.log(`  重构版卡片数: ${refactoredCount}`);

    const status = originalCount === refactoredCount ? '✅ 一致' : '❌ 不一致';
    console.log(`  状态: ${status}`);

    // Compare card content
    const differences = [];
    const maxCompare = Math.max(originalCount, refactoredCount);

    for (let i = 0; i < maxCompare; i++) {
      const origCard = originalCards[i];
      const refCard = refactoredCards[i];

      if (!origCard && !refCard) break;
      if (!origCard) {
        differences.push(`Card ${i + 1}: 原版缺失，重构版有 "${refCard.word}" (${refCard.type})`);
        continue;
      }
      if (!refCard) {
        differences.push(`Card ${i + 1}: 重构版缺失，原版有 "${origCard.word}" (${origCard.type})`);
        continue;
      }

      const cardDiffs = compareCards(origCard, refCard);
      if (cardDiffs.length > 0) {
        differences.push(`Card ${i + 1} (${origCard.word}): ${cardDiffs.join(', ')}`);
      }
    }

    const result = {
      filename,
      originalCount,
      refactoredCount,
      status: originalCount === refactoredCount,
      differences: differences.length,
      differenceDetails: differences
    };

    results.push(result);
    totalDifferences += differences.length;

    if (differences.length > 0) {
      console.log(`  发现 ${differences.length} 个差异:`);
      differences.slice(0, 5).forEach(d => console.log(`    - ${d}`));
      if (differences.length > 5) {
        console.log(`    ... 还有 ${differences.length - 5} 个差异`);
      }
    }
  }

  // Print summary
  console.log('\n');
  console.log('='.repeat(80));
  console.log('测试汇总');
  console.log('='.repeat(80));
  console.log('');
  console.log('| 文件名 | 原版卡片数 | 重构版卡片数 | 状态 | 差异数 |');
  console.log('|--------|------------|--------------|------|--------|');

  for (const result of results) {
    const statusIcon = result.status ? '✅' : '❌';
    console.log(`| ${result.filename} | ${result.originalCount} | ${result.refactoredCount} | ${statusIcon} | ${result.differences} |`);
  }

  console.log('');

  const allPassed = results.every(r => r.status);
  if (allPassed && totalDifferences === 0) {
    console.log('✅ 所有测试通过！重构版本与原版功能一致。');
  } else {
    console.log(`❌ 发现问题：${totalDifferences} 个差异需要修复。`);
  }

  return { results, totalDifferences, allPassed };
}

// Run tests
runTests().then(({ results, totalDifferences, allPassed }) => {
  if (!allPassed) {
    process.exit(1);
  }
}).catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});
