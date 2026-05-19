export function isPrefixOrSuffixRule(content, hasPosMarker) {
  const trimmed = content.trim();
  const cnMatch = trimmed.match(/[\u4e00-\u9fa5]/);
  const englishPart = cnMatch ? trimmed.substring(0, trimmed.indexOf(cnMatch[0])).trim() : trimmed;
  const compact = englishPart.replace(/\s+/g, '');
  const looksLikeAffixToken = /^-?[a-z]{1,10}(?:\/-?[a-z]{1,10})*-?$/i.test(compact) && compact.includes('-');
  if (!looksLikeAffixToken) return false;

  const hasPos = hasPosMarker(content);
  const hasChineseOnSameLine = /[\u4e00-\u9fa5]/.test(content);
  return !hasPos && hasChineseOnSameLine;
}

function looksLikeAffixToken(content) {
  const trimmed = String(content || '').trim();
  const cnMatch = trimmed.match(/[\u4e00-\u9fa5]/);
  const englishPart = cnMatch ? trimmed.substring(0, trimmed.indexOf(cnMatch[0])).trim() : trimmed;
  const compact = englishPart.replace(/\s+/g, '');
  return /^-?[a-z]{1,10}(?:\/-?[a-z]{1,10})*-?$/i.test(compact) && compact.includes('-');
}

export function firstChildSuggestsPrefixRule(lines, content, indentLevel, parentLineIndex, hasPosMarker) {
  if (!looksLikeAffixToken(content)) return false;

  const searchStartIndex = parentLineIndex !== null ? parentLineIndex : 0;
  const lineIndex = lines.findIndex((line, idx) => {
    if (idx < searchStartIndex) return false;
    const trimmed = line.trim();
    if (!trimmed.startsWith('-')) return false;
    const lineIndent = line.match(/^(\s*)-/);
    const lineIndentLevel = lineIndent ? lineIndent[1].length : 0;
    return lineIndentLevel === indentLevel && trimmed.substring(1).trim() === content;
  });

  if (lineIndex === -1) return false;

  for (let i = lineIndex + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const indentMatch = lines[i].match(/^(\s*)-/);
    if (!indentMatch) return false;

    const childIndentLevel = indentMatch[1].length;
    if (childIndentLevel <= indentLevel) return false;

    const childContent = trimmed.substring(1).trim();
    if (
      hasPosMarker(childContent) ||
      /^===?\s+/.test(childContent) ||
      /^Similar:\s*/.test(childContent) ||
      /^Opposite:\s*/.test(childContent) ||
      /[\u4e00-\u9fa5]/.test(childContent)
    ) {
      return true;
    }

    return false;
  }

  return false;
}

export function firstChildHasPosRule(lines, content, indentLevel, parentLineIndex, hasPosMarker) {
  const searchStartIndex = parentLineIndex !== null ? parentLineIndex : 0;
  const lineIndex = lines.findIndex((line, idx) => {
    if (idx < searchStartIndex) return false;
    const trimmed = line.trim();
    if (!trimmed.startsWith('-')) return false;
    const lineIndent = line.match(/^(\s*)-/);
    const lineIndentLevel = lineIndent ? lineIndent[1].length : 0;
    return lineIndentLevel === indentLevel && trimmed.substring(1).trim() === content;
  });

  if (lineIndex === -1) return false;

  for (let i = lineIndex + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const indentMatch = lines[i].match(/^(\s*)-/);
    if (!indentMatch) return false;

    const childIndentLevel = indentMatch[1].length;
    const childContent = trimmed.substring(1).trim();

    if (childIndentLevel <= indentLevel) return false;
    if (hasPosMarker(childContent)) return true;
    if (childIndentLevel === indentLevel + 1) return false;
  }
  return false;
}

export function determineCardTypeRule(args) {
  const {
    content,
    indentLevel,
    lineIndex,
    context,
    hasPosMarker,
    isPrefixOrSuffix,
    firstChildHasPos,
    firstChildSuggestsPrefix
  } = args;

  if (isPrefixOrSuffix(content, lineIndex)) return 'prefix';
  if (lineIndex !== null && firstChildSuggestsPrefix(content, indentLevel, lineIndex)) return 'prefix';

  if (context.parentCard && context.parentCard.type === 'phrase') {
    const hasChinese = /[\u4e00-\u9fa5\uff08-\uff9e]/.test(content);
    const hasEnglish = /[a-zA-Z]/.test(content);
    const hasPos = hasPosMarker(content);
    const startsWithChinese = /^[\u4e00-\u9fa5\uff08-\uff9e]/.test(content.trim());
    // Phrase child lines like "是A而不是B" are definitions even though they contain A/B.
    if (hasChinese && !hasPos && (!hasEnglish || startsWithChinese)) return 'definition';
  }

  if (context.inPhraseHeader || context.inPhraseList) return 'phrase';
  if (hasPosMarker(content)) return 'word';

  const normalizedHeadword = String(content || '')
    .replace(/\s*(?:\[[^\]]+\]|\/[^/]+\/)\s*/g, ' ')
    .replace(/\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]+\s*/gu, ' ')
    .trim();
  const headwordWithOptionalIpa = /^[a-zA-Z'\-]+$/.test(normalizedHeadword);
  if (headwordWithOptionalIpa && lineIndex !== null && firstChildHasPos(content, indentLevel, lineIndex)) {
    return 'word';
  }

  const normalized = content.trim();
  const wordCount = normalized ? normalized.split(/\s+/).length : 0;
  const hasChinese = /[\u4e00-\u9fa5\uff08-\uff9e]/.test(normalized);
  const looksLikeQuestionOrStatement =
    /[.!?。！？]/.test(normalized) ||
    /^(would|could|should|can|do|did|does|is|are|was|were|will|may|might|must|have|has|had|why|how|what|when|where|who|whom|whose|which)\b/i.test(normalized);
  if (!hasChinese && looksLikeQuestionOrStatement && wordCount >= 5) {
    return 'sentence';
  }

  const isChild = context.parentCard && context.parentLevel < indentLevel;
  if (isChild && context.parentCard.type === 'sentence') {
    if (!hasPosMarker(content)) return 'phrase';
  }

  return 'sentence';
}
