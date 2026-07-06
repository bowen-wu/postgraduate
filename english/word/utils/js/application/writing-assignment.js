const WRITING_POOL = [
  'W044', 'W045',
  'W046', 'W047', 'W048', 'W049', 'W050',
  'W001', 'W002', 'W003', 'W004', 'W005',
  'W006', 'W007', 'W008', 'W009', 'W010',
  'W041', 'W042', 'W043'
];

export const UNIT_FILES = [
  'core/Unit1-1.md', 'core/Unit1-2.md', 'core/Unit1-3.md', 'core/Unit1-4.md',
  'core/Unit2-1.md', 'core/Unit2-2.md', 'core/Unit2-3.md',
  'core/Unit3-1.md', 'core/Unit3-2.md', 'core/Unit3-3.md',
  'core/Unit4-1.md', 'core/Unit4-2.md', 'core/Unit4-3.md',
  'core/Unit5-1.md', 'core/Unit5-2.md', 'core/Unit5-3.md',
  'core/Unit6-1.md', 'core/Unit6-2.md', 'core/Unit6-3.md',
  'core/Unit7-1.md', 'core/Unit7-2.md', 'core/Unit7-3.md',
  'core/Unit8-1.md', 'core/Unit8-2.md', 'core/Unit8-3.md',
  'core/Unit9-1.md', 'core/Unit9-2.md', 'core/Unit9-3.md',
  'core/Unit10-1.md', 'core/Unit10-2.md', 'core/Unit10-3.md',
  'core/Unit11-1.md', 'core/Unit11-2.md', 'core/Unit11-3.md',
  'core/Unit12-1.md', 'core/Unit12-2.md', 'core/Unit12-3.md',
  'core/Unit13-1.md', 'core/Unit13-2.md', 'core/Unit13-3.md',
  'core/Unit14-1.md', 'core/Unit14-2.md', 'core/Unit14-3.md',
  'core/Unit15-1.md', 'core/Unit15-2.md', 'core/Unit15-3.md',
  'core/Unit16-1.md', 'core/Unit16-2.md',
  'core/Unit17-1.md', 'core/Unit17-2.md', 'core/Unit17-3.md',
  'core/Unit18-1.md', 'core/Unit18-2.md', 'core/Unit18-3.md',
  'core/Unit19-1.md', 'core/Unit19-2.md', 'core/Unit19-3.md',
  'core/Unit20-1.md', 'core/Unit20-2.md',
  'core/Unit21-1.md', 'core/Unit21-2.md', 'core/Unit21-3.md',
  'core/PE-1.md', 'core/PE-2.md', 'core/PE-3.md',

];

export const UNIT_WRITING_MAP = Object.fromEntries(
  UNIT_FILES.map((path, index) => [path, WRITING_POOL[index % WRITING_POOL.length]])
);

export function getWritingIdForUnitPath(path) {
  return UNIT_WRITING_MAP[path] || null;
}

const DAILY_SENTENCE_IDS = Array.from({ length: 252 }, (_, i) => String(i + 1).padStart(3, '0'));
const DAILY_SENTENCE_BATCH_SIZES = UNIT_FILES.map((_, idx) => (idx < 60 ? 4 : 3));

export const UNIT_COMPLEX_SENTENCE_MAP = (() => {
  let cursor = 0;
  const map = {};
  UNIT_FILES.forEach((path, idx) => {
    const size = DAILY_SENTENCE_BATCH_SIZES[idx] || 0;
    map[path] = DAILY_SENTENCE_IDS.slice(cursor, cursor + size);
    cursor += size;
  });
  return map;
})();

export function getComplexSentenceIdsForUnitPath(path) {
  return UNIT_COMPLEX_SENTENCE_MAP[path] || [];
}

export function getUnitIndexForPath(path) {
  return UNIT_FILES.indexOf(path);
}
