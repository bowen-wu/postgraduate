import { matchListIndent, getListContentFromTrimmed } from './line-utils.js';

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
  const bracketMatch = text.match(/\[\[(.*?)\]\]/);
  if (bracketMatch) {
    return bracketMatch[1].split('/').map(normalizeOption).filter(Boolean);
  }
  const insMatch = text.match(/<ins>(.*?)<\/ins>/i);
  if (insMatch) {
    return insMatch[1].split('/').map(normalizeOption).filter(Boolean);
  }
  return [...fallbackOptions];
}

function hasContrastBlank(sentence) {
  return /\[\[(.*?)\]\]/.test(String(sentence || '')) || /<ins>(.*?)<\/ins>/i.test(String(sentence || ''));
}

export function parseContrastChildren(lines, lineIndex, parentIndentLevel, fallbackOptions = []) {
  const items = [];
  const extras = [];
  let i = lineIndex + 1;
  let contrastItemIndent = null;

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
      if (items.length > 0 && hasContrastBlank(items[items.length - 1].en)) {
        const lastItem = items[items.length - 1];
        lastItem.en = `${lastItem.en} ${trimmed}`.replace(/\s+/g, ' ').trim();
      }
      i++;
      continue;
    }

    const indentLevel = listIndent[1].length;
    if (indentLevel <= parentIndentLevel) break;

    const sentence = getListContentFromTrimmed(trimmed);
    const blankOptions = extractBlankOptions(sentence, fallbackOptions);
    const isContrastSentence = hasContrastBlank(sentence);

    if (contrastItemIndent === null && isContrastSentence) {
      contrastItemIndent = indentLevel;
    }

    if (!isContrastSentence || (contrastItemIndent !== null && indentLevel > contrastItemIndent)) {
      extras.push({ content: sentence, indentLevel, lineIndex: i });
      i++;
      continue;
    }

    items.push({
      type: 'contrast',
      en: sentence,
      blankOptions
    });
    i++;
  }

  return { items, extras, lastLineIndex: i - 1 };
}
