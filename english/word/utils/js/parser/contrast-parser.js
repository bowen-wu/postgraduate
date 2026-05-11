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

function nextNonEmptyLine(lines, startIndex) {
  for (let i = startIndex; i < lines.length; i++) {
    const trimmed = String(lines[i] || '').trim();
    if (trimmed) return { index: i, trimmed, raw: lines[i] };
  }
  return null;
}

export function parseContrastChildren(lines, lineIndex, parentIndentLevel, fallbackOptions = []) {
  const items = [];
  const extras = [];
  let i = lineIndex + 1;
  let contrastItemIndent = null;
  let pendingSentence = null;

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
      if (pendingSentence) {
        pendingSentence.en = `${pendingSentence.en} ${trimmed}`.replace(/\s+/g, ' ').trim();
        pendingSentence.blankOptions = extractBlankOptions(pendingSentence.en, fallbackOptions);
      } else if (items.length > 0 && hasContrastBlank(items[items.length - 1].en)) {
        const lastItem = items[items.length - 1];
        lastItem.en = `${lastItem.en} ${trimmed}`.replace(/\s+/g, ' ').trim();
        lastItem.blankOptions = extractBlankOptions(lastItem.en, fallbackOptions);
      }
      i++;
      continue;
    }

    const indentLevel = listIndent[1].length;
    if (indentLevel <= parentIndentLevel) break;

    const sentence = getListContentFromTrimmed(trimmed);
    const mergedSentence = pendingSentence && indentLevel > parentIndentLevel
      ? `${pendingSentence.en} ${sentence}`.replace(/\s+/g, ' ').trim()
      : sentence;
    const blankOptions = extractBlankOptions(mergedSentence, fallbackOptions);
    const isContrastSentence = hasContrastBlank(mergedSentence);

    if (contrastItemIndent === null && isContrastSentence) {
      contrastItemIndent = indentLevel;
    }

    if (!isContrastSentence || (contrastItemIndent !== null && indentLevel > contrastItemIndent)) {
      const nextLine = nextNonEmptyLine(lines, i + 1);
      const shouldTreatAsPendingSentence = (
        !isContrastSentence &&
        indentLevel > parentIndentLevel &&
        nextLine &&
        !matchListIndent(nextLine.raw) &&
        /<ins>.*<\/ins>/i.test(nextLine.trimmed)
      );

      if (shouldTreatAsPendingSentence) {
        pendingSentence = {
          type: 'contrast',
          en: sentence,
          blankOptions: extractBlankOptions(sentence, fallbackOptions),
          lineIndex: i
        };
      }
      extras.push({ content: sentence, indentLevel, lineIndex: i });
      i++;
      continue;
    }

    const contrastItem = pendingSentence && indentLevel > parentIndentLevel
      ? {
          type: 'contrast',
          en: mergedSentence,
          blankOptions
        }
      : {
          type: 'contrast',
          en: sentence,
          blankOptions
        };
    if (pendingSentence) {
      const pendingIndex = extras.findIndex((extra) => extra.lineIndex === pendingSentence.lineIndex);
      if (pendingIndex !== -1) {
        extras.splice(pendingIndex, 1);
      }
    }
    if (!items.includes(contrastItem)) {
      items.push(contrastItem);
    }
    pendingSentence = null;
    i++;
  }

  if (pendingSentence && hasContrastBlank(pendingSentence.en)) {
    const pendingIndex = extras.findIndex((extra) => extra.lineIndex === pendingSentence.lineIndex);
    if (pendingIndex !== -1) {
      extras.splice(pendingIndex, 1);
    }
    items.push({
      type: 'contrast',
      en: pendingSentence.en,
      blankOptions: extractBlankOptions(pendingSentence.en, fallbackOptions)
    });
  }

  // Return the next index after the consumed contrast block.
  return { items, extras, lastLineIndex: i };
}
