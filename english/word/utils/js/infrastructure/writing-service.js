import { getWritingIdForUnitPath } from '../application/writing-assignment.js';

const RAW_BASE = 'https://raw.githubusercontent.com/bowen-wu/postgraduate/refs/heads/master/english/write';
const WRITING_SOURCES = [
  { file: '001-020_letter.md', ids: ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010'] },
  { file: '041-060_essay.md', ids: ['041', '042', '043', '044', '045', '046', '047', '048', '049', '050'] }
];

let _writingExamplesPromise = null;

function normalizeTextBlock(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function extractBlock(sectionText, startHeading, endHeading) {
  const startPattern = new RegExp(`^###\\s*${startHeading}\\s*$`, 'm');
  const endPattern = new RegExp(`^###\\s*${endHeading}\\s*$`, 'm');
  const startMatch = sectionText.match(startPattern);
  if (!startMatch || startMatch.index === undefined) return '';
  const afterStart = sectionText.slice(startMatch.index + startMatch[0].length);
  const endMatch = afterStart.match(endPattern);
  return endMatch ? afterStart.slice(0, endMatch.index) : afterStart;
}

export function parseWritingExamplesFromMarkdown(markdownText, allowedIds = new Set()) {
  const result = {};
  const sectionPattern = /^##\s*(\d{3})\s*$/gm;
  const sections = [...String(markdownText || '').matchAll(sectionPattern)];

  for (let i = 0; i < sections.length; i++) {
    const id = sections[i][1];
    if (allowedIds.size > 0 && !allowedIds.has(id)) continue;
    const start = sections[i].index + sections[i][0].length;
    const end = i + 1 < sections.length ? sections[i + 1].index : markdownText.length;
    const sectionText = markdownText.slice(start, end);
    const en = normalizeTextBlock(extractBlock(sectionText, 'Example', '译文'));
    const cn = normalizeTextBlock(extractBlock(sectionText, '译文', '\\d{3}'));
    if (!en || !cn) continue;
    result[`W${id}`] = { id: `W${id}`, en, cn };
  }
  return result;
}

async function loadWritingExamples() {
  if (_writingExamplesPromise) return _writingExamplesPromise;

  _writingExamplesPromise = (async () => {
    const combined = {};
    for (const source of WRITING_SOURCES) {
      const url = `${RAW_BASE}/${source.file}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load writing source: ${source.file} (${response.status})`);
      }
      const text = await response.text();
      const parsed = parseWritingExamplesFromMarkdown(text, new Set(source.ids));
      Object.assign(combined, parsed);
    }
    return combined;
  })();

  return _writingExamplesPromise;
}

export async function buildWritingCardForUnit(unitPath) {
  const writingId = getWritingIdForUnitPath(unitPath);
  if (!writingId) return null;
  const examples = await loadWritingExamples();
  const picked = examples[writingId];
  if (!picked) return null;

  return {
    id: `writing_${writingId}`,
    word: `Writing ${writingId}`,
    writingNo: writingId.replace(/^W/i, ''),
    type: 'sentence',
    displayWord: picked.en,
    items: [{ type: 'sentence', en: picked.en, cn: picked.cn }]
  };
}
