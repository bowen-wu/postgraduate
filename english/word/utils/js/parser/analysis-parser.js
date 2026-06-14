import { matchListIndent, getListContentFromTrimmed, mergeListItemContinuations } from './line-utils.js';
import { normalizeInlineStudyText } from './text-normalizer.js';

function normalizeOption(option) {
  return String(option || '')
    .replace(/\*\*/g, '')
    .replace(/\([^)]*\)/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function splitOptions(raw) {
  return String(raw || '')
    .split(/[\/|]/)
    .map(normalizeOption)
    .filter(Boolean);
}

function extractBlankOptions(sentence) {
  const text = String(sentence || '');
  const bracketMatch = text.match(/\[\[(.*?)\]\]/);
  if (bracketMatch) {
    return splitOptions(bracketMatch[1]);
  }
  const insMatch = text.match(/<ins>(.*?)<\/ins>/i);
  if (insMatch) {
    return splitOptions(insMatch[1]);
  }
  return [];
}

function hasAnalysisBlank(sentence) {
  return /\[\[(.*?)\]\]/.test(String(sentence || '')) || /<ins>(.*?)<\/ins>/i.test(String(sentence || ''));
}

export function parseAnalysisHeader(content) {
  const sentence = normalizeInlineStudyText(content.replace(/^Analysis:\s*/i, '').trim());
  return {
    word: sentence.substring(0, 50) + (sentence.length > 50 ? '...' : ''),
    displayWord: sentence,
    sentence
  };
}

export function parseAnalysisChildren(lines, startLineIndex, parentIndentLevel) {
  const items = [];
  const extras = [];
  let i = startLineIndex;
  let analysisItemIndent = null;
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
    const mergedSentence = normalizeInlineStudyText(merged.content);
    const blankOptions = extractBlankOptions(mergedSentence);
    const isAnalysisSentence = hasAnalysisBlank(mergedSentence);

    if (analysisItemIndent === null && isAnalysisSentence) {
      analysisItemIndent = indentLevel;
    }

    if (!isAnalysisSentence || (analysisItemIndent !== null && indentLevel > analysisItemIndent)) {
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
