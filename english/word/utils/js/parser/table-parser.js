import { matchListIndent, getListContentFromTrimmed } from './line-utils.js';

function isTableRowText(text) {
  const trimmed = String(text || '').trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
}

function splitTableRow(text) {
  return String(text || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparatorCell(cell) {
  return /^:?-{3,}:?$/.test(String(cell || '').trim());
}

function isSeparatorRow(text) {
  const cells = splitTableRow(text);
  return cells.length > 0 && cells.every(isSeparatorCell);
}

export function isMarkdownTableStart(content) {
  return isTableRowText(content);
}

export function parseMarkdownTableAt(lines, lineIndex, initialContent) {
  const rawRows = [String(initialContent || '').trim()];
  let i = lineIndex + 1;

  while (i < lines.length) {
    const line = String(lines[i] || '');
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }
    if (trimmed.startsWith('##')) break;

    const listMatch = matchListIndent(line);
    if (listMatch) {
      const content = getListContentFromTrimmed(trimmed);
      if (!isTableRowText(content)) break;
      rawRows.push(content);
      i++;
      continue;
    }

    if (!isTableRowText(trimmed)) break;
    rawRows.push(trimmed);
    i++;
  }

  if (rawRows.length < 2 || !isSeparatorRow(rawRows[1])) {
    return {
      block: null,
      nextLineIndex: lineIndex + 1
    };
  }

  const headers = splitTableRow(rawRows[0]);
  const rows = rawRows.slice(2).map(splitTableRow);

  return {
    block: {
      type: 'table',
      headers,
      rows
    },
    nextLineIndex: i
  };
}
