/**
 * Content Parser Module
 * Handles parsing of word and phrase content to extract IPA, POS, and Chinese definitions
 */

import { POS_MARKERS, IPA_SYMBOLS } from './validators.js';

/**
 * Parse word content to extract word, IPA, POS, Chinese definition, and synonyms
 * Supports formats:
 * - word ipa pos. cn
 * - word （notes）cn
 * - word pos. cn == synonym (extract synonym)
 */
export function parseWordContent(content) {
  let word = content;
  let ipa = '';
  let pos = '';
  let cn = '';
  let synonyms = [];  // New: support extracting synonyms from == pattern

  // Extract IPA first (remove it from content)
  // Check for [ipa] format - must contain IPA symbols (规则8)
  let ipaMatch = null;
  const bracketMatch = content.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    const innerContent = bracketMatch[1];
    // Check if any IPA symbol is present (using Set for O(1) lookup per character)
    for (const char of innerContent) {
      if (IPA_SYMBOLS.has(char)) {
        ipaMatch = bracketMatch;
        break;
      }
    }
    // If no IPA symbols found, it's a grammar note, not IPA
  }
  if (!ipaMatch) {
    // Check for /ipa/ format - but only if it looks like real IPA
    ipaMatch = content.match(/\/([^\/]*[əɪɛæʌɑɔʊʃʒθðŋˈˌ][^\/]*)\//);
    // Exclude common English patterns
    if (ipaMatch) {
      const ipaContent = ipaMatch[1];
      const excludePattern = /\b(the|a|an|to|of|in|on|at|by|for|with|from|about|plane|ship|aircraft|make|efforts|endeavors|much|little|nothings)\b/i;
      if (excludePattern.test(ipaContent)) {
        const hasPhoneticSymbols = /[əɪɛæʌɑɔʊʃʒθðŋˈˌ]/.test(ipaContent);
        if (!hasPhoneticSymbols) {
          ipaMatch = null;
        }
      }
    }
  }
  if (ipaMatch) {
    ipa = ipaMatch[0];
    word = word.replace(ipa, '').trim();
  }

  // Check if there's a POS marker (like "n.", "v.", "adj." etc)
  // Use Set-based lookup to avoid false positives like "that.", "fired.", etc.
  // Find the FIRST valid POS marker in the text
  let validPosMatch = null;
  let validPosIndex = -1;

  // Check each POS marker in our Set
  for (const posMarker of POS_MARKERS) {
    const index = word.toLowerCase().indexOf(posMarker);
    if (index !== -1) {
      // Make sure it's a whole word match (preceded by space or start)
      const prevChar = index > 0 ? word[index - 1] : ' ';
      if (prevChar === ' ' || prevChar === '') {
        // Found a valid POS marker
        if (validPosIndex === -1 || index < validPosIndex) {
          validPosMatch = posMarker;
          validPosIndex = index;
        }
      }
    }
  }

  if (validPosMatch) {
    // Found a valid POS marker - extract word before it
    pos = validPosMatch;

    // Extract Chinese definition AFTER the POS marker
    cn = word.substring(validPosIndex + validPosMatch.length).trim();

    // Now modify word (remove the POS and everything after)
    word = word.substring(0, validPosIndex).trim();
  } else {
    // No POS marker - check if there's Chinese
    const cnMatch = word.match(/[\u4e00-\u9fa5\uff08-\uff9e]/);
    if (cnMatch) {
      cn = word.substring(word.indexOf(cnMatch[0])).trim();
      word = word.substring(0, word.indexOf(cnMatch[0])).trim();
    }
  }

  // Extract synonyms from cn (支持 "cn == synonym" 或 "cn == synonym1 == synonym2" 格式)
  if (cn && cn.includes('==')) {
    const parts = cn.split(/\s*==\s*/);
    if (parts.length > 1) {
      cn = parts[0].trim();  // First part is the Chinese definition
      // Remaining parts are synonyms (if they look like English words)
      for (let i = 1; i < parts.length; i++) {
        const syn = parts[i].trim();
        // Only treat as synonym if it's mainly English (not Chinese)
        if (syn && /^[a-zA-Z][a-zA-Z'\-]*$/.test(syn)) {
          synonyms.push({ word: syn });
        }
      }
    }
  }

  return { word, ipa, pos, cn, synonyms };
}

/**
 * Parse phrase content to extract phrase and Chinese
 * Supports formats:
 * - phrase(中文)  -> word: phrase, cn: 中文
 * - phrase 中文   -> word: phrase, cn: 中文
 * - phrase        -> word: phrase, cn: ''
 */
export function parsePhraseContent(content) {
  // First, check if there's a Chinese(中文) pattern with parentheses
  // Match: anything + ( + Chinese + )
  const parenMatch = content.match(/^(.*?)\(([\u4e00-\u9fa5\uff08-\uff9e\s]+)\)$/);
  if (parenMatch) {
    const result = {
      word: parenMatch[1].trim(),
      cn: parenMatch[2].trim()
    };
    return result;
  }

  // Fallback: find first Chinese character and split there
  const cnMatch = content.match(/[\u4e00-\u9fa5\uff08-\uff9e]/);
  if (cnMatch) {
    const cnStart = content.indexOf(cnMatch[0]);
    let cn = content.substring(cnStart).trim();

    // Remove synonym markers (== ...) from cn to avoid duplication
    // Synonyms will be processed separately as child items
    const synonymIndex = cn.indexOf('==');
    if (synonymIndex !== -1) {
      cn = cn.substring(0, synonymIndex).trim();
    }

    const result = {
      word: content.substring(0, cnStart).trim(),
      cn: cn
    };
    return result;
  }

  return { word: content, cn: '' };
}
