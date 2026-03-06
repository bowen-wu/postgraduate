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
