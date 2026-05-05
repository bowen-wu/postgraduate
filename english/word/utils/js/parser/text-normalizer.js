export function stripPronunciationHints(text) {
  return String(text || '')
    .replace(/\s*\(\s*(?=[^)]*(?:\[|\/|[əɪɛæʌɑɔʊʃʒθðŋˈˌ]))[^)]*\)/g, '')
    .replace(/\s*\[\s*([^\]]*[əɪɛæʌɑɔʊʃʒθðŋˈˌ][^\]]*)\s*\]/g, '');
}

export function stripMarkdownMarkers(text) {
  return String(text || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[*_]([a-zA-Z'-]+)\(([^*_]*?)\)[*_]/g, '$1')
    .replace(/[*_]([a-zA-Z'-]+)[*_]/g, '$1')
    .replace(/_([^_]+?)_/g, '$1');
}

export function stripUnsupportedTags(text) {
  return String(text || '').replace(/<(?!\/?ins\b)[^>]+>/gi, '');
}

export function normalizeInlineStudyText(text) {
  return stripPronunciationHints(stripMarkdownMarkers(stripUnsupportedTags(text)))
    .replace(/\s+/g, ' ')
    .trim();
}
