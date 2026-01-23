/**
 * Validator Functions - Pure functions that don't depend on `this`
 * These are simple validation utilities that can be safely extracted
 */

// POS markers constant - used by hasPosMarker
export const POS_MARKERS = new Set([
  'n.', 'v.', 'vt.', 'vi.', 'adj.', 'adv.', 'prep.', 'conj.',
  'int.', 'pron.', 'art.', 'num.'
]);

// IPA symbols constant - used by isPureIpaLine and hasIpaMarker
export const IPA_SYMBOLS = new Set([
  // 元音
  'i', 'ɪ', 'e', 'ɛ', 'æ',
  'ɑ', 'ɒ', 'ɔ', 'ʊ', 'u',
  'ʌ', 'ə', 'ɜ', 'ɚ',

  // 辅音
  'p', 'b', 't', 'd', 'k', 'g',
  'f', 'v', 'θ', 'ð', 's', 'z',
  'ʃ', 'ʒ', 'h',
  'm', 'n', 'ŋ',
  'l', 'r', 'j', 'w',
  't', 'ʃ', 'd', 'ʒ',

  // 重音 / 音长 / 分隔
  'ˈ', 'ˌ', 'ː', '.'
]);

/**
 * Check if content is a synonym marker (== word or === word)
 * @param {string} content - The content to check
 * @returns {boolean}
 */
export function isSynonymMarker(content) {
  return /^===?\s+/.test(content);
}

/**
 * Check if content has antonym marker (Opposite:)
 * @param {string} content - The content to check
 * @returns {boolean}
 */
export function hasAntonymMarker(content) {
  return /^Opposite:\s*/.test(content);
}

/**
 * Check if it's a pure POS line (n. 中文)
 * @param {string} content - The content to check
 * @returns {boolean}
 */
export function isPurePosLine(content) {
  const trimmed = content.trim();
  // Match: n./v./adj./adv./vt./vi. + anything + Chinese
  // Examples: "n. 心态", "vi. （正式文件）到期"
  return /^[a-z]+\.\s*(?=[\s\S]*[\u4e00-\u9fa5])/.test(trimmed);
}

/**
 * Check if content has POS marker
 * Uses Set-based whitelist for O(1) lookup performance
 * Ignores POS markers inside *word(...)* patterns
 * @param {string} content - The content to check
 * @returns {boolean}
 */
export function hasPosMarker(content) {
  // First, remove *word(...)* patterns to avoid matching POS inside them
  const cleaned = content.replace(/\*[a-zA-Z'-]+\([^)]*\)\*/g, '');
  // Find all potential POS markers (word followed by dot)
  const matches = cleaned.match(/\b[a-z]+\./gi) || [];
  // Check if any match is in our valid POS markers Set
  return matches.some(match => POS_MARKERS.has(match.toLowerCase()));
}

/**
 * Check if it's a valid word header
 * @param {string} text - The header text to check
 * @returns {boolean}
 */
export function isValidWordHeader(text) {
  if (/^(Words|词组|句式|Unit|\d+)/.test(text)) return false;
  return /^[a-zA-Z]/.test(text);
}

/**
 * Check if it's a pure IPA line ([音标])
 * 规则8: [] 包裹的内容必须包含音标符号才被认为是音标
 * @param {string} content - The content to check
 * @returns {boolean}
 */
export function isPureIpaLine(content) {
  const trimmed = content.trim();

  // Check for [ipa] format - must contain IPA symbols
  const bracketMatch = trimmed.match(/^\[([^\]]+)\]$/);
  if (bracketMatch) {
    const innerContent = bracketMatch[1];
    // Check if any IPA symbol is present (using Set for O(1) lookup per character)
    for (const char of innerContent) {
      if (IPA_SYMBOLS.has(char)) {
        return true;
      }
    }
    // No IPA symbols found - it's a grammar note, not IPA
    return false;
  }

  // Check for /ipa/ format - but only if it looks like real IPA
  const ipaPattern = /^\/([^\/]*[əɪɛæʌɑɔʊʃʒθðŋˈˌ][^\/]*)\/$/;

  // Also exclude common English patterns
  const excludePattern = /\b(the|a|an|to|of|in|on|at|by|for|with|from|about|plane|ship|aircraft|make|efforts|endeavors|much|little|nothings)\b/i;

  if (ipaPattern.test(trimmed)) {
    const match = trimmed.match(/^\/([^\/]+)\/$/);
    if (match) {
      const ipaContent = match[1];
      if (excludePattern.test(ipaContent)) {
        const hasPhoneticSymbols = /[əɪɛæʌɑɔʊʃʒθðŋˈˌ]/.test(ipaContent);
        if (!hasPhoneticSymbols) {
          return false;
        }
      }
      return true;
    }
  }
  return false;
}

/**
 * Check if content has IPA marker (word with pronunciation)
 * Ignores IPA markers inside *word(...)* patterns
 * 规则8: [] 包裹的内容必须包含音标符号才被认为是音标
 * @param {string} content - The content to check
 * @returns {boolean}
 */
export function hasIpaMarker(content) {
  // First, remove *word(...)* patterns to avoid matching IPA inside them
  const cleaned = content.replace(/\*[a-zA-Z'-]+\([^)]*\)\*/g, '');

  // Check for [ipa] format - must contain IPA symbols
  const bracketMatches = cleaned.match(/\[([^\]]+)\]/g);
  if (bracketMatches) {
    for (const bracket of bracketMatches) {
      const innerContent = bracket.slice(1, -1); // Remove [ and ]
      // Check if any IPA symbol is present (using Set for O(1) lookup per character)
      for (const char of innerContent) {
        if (IPA_SYMBOLS.has(char)) {
          return true;
        }
      }
    }
    // Found [] but no IPA symbols - they are grammar notes, not IPA
  }

  // Check for /ipa/ format - but only if it looks like real IPA
  const ipaPattern = /\/([^\/]*[əɪɛæʌɑɔʊʃʒθðŋˈˌ][^\/]*)\//;

  // Also exclude common English patterns that look like IPA but aren't
  const excludePattern = /\b(the|a|an|to|of|in|on|at|by|for|with|from|about|plane|ship|aircraft|make|efforts|endeavors|much|little|nothings)\b/i;

  if (ipaPattern.test(cleaned)) {
    // Check if it's a real IPA pattern by ensuring it contains phonetic symbols
    const match = cleaned.match(/\/([^\/]+)\//);
    if (match) {
      const ipaContent = match[1];
      // If it contains common English words, it's probably not IPA
      if (excludePattern.test(ipaContent)) {
        // But also check if it has real phonetic symbols
        const hasPhoneticSymbols = /[əɪɛæʌɑɔʊʃʒθðŋˈˌ]/.test(ipaContent);
        if (!hasPhoneticSymbols) {
          return false;
        }
      }
      return true;
    }
  }
  return false;
}

// Note: The following functions CANNOT be pure functions because they depend on `this`:
// - isPrefixOrSuffix (depends on this.hasPosMarker)
// - firstChildHasPos (depends on this.lines)
//
// These must remain in the main MarkdownParser class.
