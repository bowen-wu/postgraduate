export function matchListIndent(line) {
  return line.match(/^(\s*)-/);
}

export function getListIndentLevel(line) {
  const indentMatch = matchListIndent(line);
  return indentMatch ? indentMatch[1].length : 0;
}

export function getListContentFromTrimmed(trimmedLine) {
  return trimmedLine.substring(1).trim();
}

export function mergeListItemContinuations(lines, lineIndex, initialContent) {
  let mergedContent = String(initialContent || '');
  const consumedLineIndices = [];
  let nextLineIndex = lineIndex + 1;

  while (nextLineIndex < lines.length) {
    const nextLine = String(lines[nextLineIndex] || '');
    const trimmed = nextLine.trim();

    if (!trimmed) {
      nextLineIndex++;
      continue;
    }

    if (trimmed.startsWith('##')) {
      break;
    }

    if (matchListIndent(nextLine)) {
      break;
    }

    mergedContent += ` ${trimmed}`;
    consumedLineIndices.push(nextLineIndex);
    nextLineIndex++;
  }

  return {
    content: mergedContent.replace(/\s+/g, ' ').trim(),
    consumedLineIndices,
    nextLineIndex
  };
}
