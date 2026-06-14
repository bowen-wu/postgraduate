import { getWmIdForUnitPath } from '../application/writing-assignment.js';

const RAW_WM_URL = 'https://raw.githubusercontent.com/bowen-wu/postgraduate/refs/heads/master/english/write/materials.md';

let _wmMapPromise = null;

function normalizeLineBreaks(text) {
  return String(text || '').replace(/\r\n?/g, '\n');
}

function stripBulletPrefix(text) {
  return String(text || '').replace(/^\s*-\s+/, '').trim();
}

function parseIndentedLine(rawLine) {
  const match = String(rawLine || '').match(/^(\s*)-\s+(.*)$/);
  if (!match) return null;

  const indentSpaces = match[1].length;
  const cleanText = String(match[2] || '').trim();
  const indentLevel = Math.floor(indentSpaces / 4);

  const cnMatch = cleanText.match(/[\u4e00-\u9fa5\uff08-\uff9e]/);
  const cn = cnMatch ? cleanText.slice(cleanText.indexOf(cnMatch[0])).trim() : '';

  return {
    type: 'sentence-line',
    indentLevel,
    cleanText,
    en: cleanText,
    cn,
    audioText: cleanText
  };
}

function splitSentenceLineToCards(line, wmId, unitPath, index) {
  const text = String(line?.cleanText || '').trim();
  if (!text) return null;

  return {
    id: `wm_${wmId}_${unitPath.replace(/[\/.]/g, '_')}_${index}`,
    word: text,
    type: 'sentence',
    items: [{ type: 'sentence', en: text, cn: line?.cn || '' }]
  };
}

export function parseWmSectionsFromMarkdown(markdownText) {
  const text = normalizeLineBreaks(markdownText);
  const sectionPattern = /^##\s*(WM-\d+)\s*$/gm;
  const sections = [...text.matchAll(sectionPattern)];
  const result = {};

  for (let i = 0; i < sections.length; i++) {
    const wmId = sections[i][1];
    const start = sections[i].index + sections[i][0].length;
    const end = i + 1 < sections.length ? sections[i + 1].index : text.length;
    const body = text.slice(start, end);
    const lines = body
      .split('\n')
      .map((line) => line.replace(/\s+$/g, ''))
      .filter((line) => line.trim());

    const items = [{ type: 'meta', cn: wmId }];

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const parsed = parseIndentedLine(line);
      if (parsed) {
        items.push(parsed);
        continue;
      }

      const last = items[items.length - 1];
      if (!last || last.type !== 'sentence-line') continue;
      const continuation = stripBulletPrefix(line);
      if (!continuation) continue;
      last.cleanText = `${last.cleanText} ${continuation}`.replace(/\s+/g, ' ').trim();
      last.en = last.cleanText;
      last.audioText = last.cleanText;
      if (!last.cn) {
        const cnMatch = last.cleanText.match(/[\u4e00-\u9fa5\uff08-\uff9e]/);
        if (cnMatch) {
          last.cn = last.cleanText.slice(last.cleanText.indexOf(cnMatch[0])).trim();
        }
      }
    }

    result[wmId] = {
      id: wmId,
      items
    };
  }

  return result;
}

async function loadWmMap() {
  if (_wmMapPromise) return _wmMapPromise;

  _wmMapPromise = (async () => {
    const response = await fetch(RAW_WM_URL);
    if (!response.ok) {
      throw new Error(`Failed to load WM source (${response.status})`);
    }
    const markdown = await response.text();
    return parseWmSectionsFromMarkdown(markdown);
  })();

  return _wmMapPromise;
}

export async function buildWmCardsForUnit(unitPath) {
  const wmId = getWmIdForUnitPath(unitPath);
  if (!wmId) return [];

  const wmMap = await loadWmMap();
  const wm = wmMap[wmId];
  if (!wm || !Array.isArray(wm.items) || wm.items.length <= 1) return [];

  return wm.items
    .filter((item) => item && item.type === 'sentence-line')
    .map((item, index) => splitSentenceLineToCards(item, wmId, unitPath, index))
    .filter(Boolean);
}

export const __testables = {
  parseWmSectionsFromMarkdown
};
