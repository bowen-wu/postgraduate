import { matchListIndent, getListContentFromTrimmed } from './line-utils.js';

function normalizeOption(option) {
  return String(option || '').trim().replace(/\s+/g, ' ');
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

export function parseContrastChildren(lines, lineIndex, parentIndentLevel, fallbackOptions = []) {
  const items = [];
  let i = lineIndex + 1;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) {
      i++;
      continue;
    }

    // Stop contrast block when reaching a new section header.
    if (trimmed.startsWith('##')) break;

    const listIndent = matchListIndent(rawLine);
    if (!listIndent) {
      if (items.length > 0) {
        const lastItem = items[items.length - 1];
        lastItem.en = `${lastItem.en} ${trimmed}`.replace(/\s+/g, ' ').trim();
      }
      i++;
      continue;
    }

    const indentLevel = listIndent[1].length;
    if (indentLevel <= parentIndentLevel) break;

    const sentence = getListContentFromTrimmed(trimmed);
    const insMatch = sentence.match(/<ins>(.*?)<\/ins>/i);
    const blankOptions = insMatch
      ? insMatch[1].split('/').map(normalizeOption).filter(Boolean)
      : [...fallbackOptions];

    items.push({
      type: 'contrast',
      en: sentence,
      blankOptions
    });
    i++;
  }

  return { items, lastLineIndex: i - 1 };
}
