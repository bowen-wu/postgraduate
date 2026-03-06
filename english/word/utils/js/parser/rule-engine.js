export function isPrefixOrSuffixRule(content, hasPosMarker) {
  const trimmed = content.trim();
  const cnMatch = trimmed.match(/[\u4e00-\u9fa5]/);
  const englishPart = cnMatch ? trimmed.substring(0, trimmed.indexOf(cnMatch[0])).trim() : trimmed;
  const hasHyphen = /^-?[a-z]{1,5}-?$/.test(englishPart) && englishPart.includes('-');
  if (!hasHyphen) return false;

  const hasPos = hasPosMarker(content);
  const hasChineseOnSameLine = /[\u4e00-\u9fa5]/.test(content);
  return !hasPos && hasChineseOnSameLine;
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
    hasIpaMarker,
    isPrefixOrSuffix,
    firstChildHasPos
  } = args;

  if (isPrefixOrSuffix(content, lineIndex)) return 'prefix';

  if (context.parentCard && context.parentCard.type === 'phrase') {
    const hasChinese = /[\u4e00-\u9fa5\uff08-\uff9e]/.test(content);
    const hasEnglish = /[a-zA-Z]/.test(content);
    const hasPos = hasPosMarker(content);
    if (hasChinese && !hasEnglish && !hasPos) return 'definition';
  }

  if (context.inPhraseHeader || context.inPhraseList) return 'phrase';
  if (hasPosMarker(content)) return 'word';
  if (hasIpaMarker(content)) return 'word';

  const isSingleWord = /^[a-zA-Z'\-]+(?:\s[^a-zA-Z]*)?$/.test(content);
  if (isSingleWord && lineIndex !== null && firstChildHasPos(content, indentLevel, lineIndex)) {
    return 'word';
  }

  const isChild = context.parentCard && context.parentLevel < indentLevel;
  if (isChild && context.parentCard.type === 'sentence') {
    if (!hasPosMarker(content)) return 'phrase';
  }

  return 'sentence';
}
