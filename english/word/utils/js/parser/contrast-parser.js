import { matchListIndent, getListContentFromTrimmed, mergeListItemContinuations } from './line-utils.js';

function normalizeOption(option) {
  return String(option || '')
    .replace(/\*\*/g, '')
    .replace(/\([^)]*\)/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function parseContrastHeader(content) {
  const body = content.replace(/^Contrast:\s*/i, '').trim();
  const options = body
    .split(/\s+vs\.\s+/i)
    .map(normalizeOption)
    .filter(Boolean);

  return {
    word: body,
    options
  };
}

function extractBlankOptions(sentence, fallbackOptions = []) {
  const text = String(sentence || '');
  const splitOptions = (raw) => String(raw || '')
    .split(/[\/|]/)
    .map(normalizeOption)
    .filter(Boolean);
  const bracketMatch = text.match(/\[\[(.*?)\]\]/);
  if (bracketMatch) {
    return splitOptions(bracketMatch[1]);
  }
  const insMatch = text.match(/<ins>(.*?)<\/ins>/i);
  if (insMatch) {
    return splitOptions(insMatch[1]);
  }
  return (fallbackOptions || []).flatMap((opt) => splitOptions(opt));
}

function hasContrastBlank(sentence) {
  return /\[\[(.*?)\]\]/.test(String(sentence || '')) || /<ins>(.*?)<\/ins>/i.test(String(sentence || ''));
}

export function parseContrastChildren(lines, lineIndex, parentIndentLevel, fallbackOptions = []) {
  const items = [];
  const extras = [];
  let i = lineIndex + 1;
  let contrastItemIndent = null;
  const consumedExtraLines = new Set();

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed.startsWith('##')) break;

    const listIndent = matchListIndent(rawLine);
    if (!listIndent) {
      i++;
      continue;
    }

    const indentLevel = listIndent[1].length;
    if (indentLevel <= parentIndentLevel) break;

    if (consumedExtraLines.has(i)) {
      i++;
      continue;
    }

    const sentence = getListContentFromTrimmed(trimmed);
    const merged = mergeListItemContinuations(lines, i, sentence);
    const mergedSentence = merged.content;
    const blankOptions = extractBlankOptions(mergedSentence, fallbackOptions);
    const isContrastSentence = hasContrastBlank(mergedSentence);

    if (contrastItemIndent === null && isContrastSentence) {
      contrastItemIndent = indentLevel;
    }

    if (!isContrastSentence || (contrastItemIndent !== null && indentLevel > contrastItemIndent)) {
      extras.push({ content: sentence, indentLevel, lineIndex: i });
      merged.consumedLineIndices.forEach((lineNumber) => consumedExtraLines.add(lineNumber));
      i = merged.nextLineIndex;
      continue;
    }

    items.push({
      type: 'contrast',
      en: mergedSentence,
      blankOptions
    });
    i = merged.nextLineIndex;
  }

  return { items, extras, lastLineIndex: i };
}
