import { join } from 'node:path';

import { sampleFiles } from './golden-config.mjs';
import {
  collectCorpusMarkdownFiles,
  goldenDir,
  hashJson,
  parseProjectMarkdown,
  sampleSnapshotsDir,
  sha256,
  writeJson
} from './golden-helpers.mjs';

const sampleBaselines = [];
for (const sample of sampleFiles) {
  const { source, cards } = await parseProjectMarkdown(sample.source);
  const entry = {
    key: sample.key,
    source: sample.source,
    mode: sample.mode,
    sourceHash: sha256(source),
    outputHash: hashJson(cards)
  };

  if (sample.mode === 'snapshot') {
    const expectedFile = `golden/samples/${sample.key}.expected.json`;
    entry.expectedFile = expectedFile;
    await writeJson(join(goldenDir, 'samples', `${sample.key}.expected.json`), cards);
  }

  sampleBaselines.push(entry);
}

await writeJson(join(goldenDir, 'sample-baselines.json'), sampleBaselines);

const corpusFiles = await collectCorpusMarkdownFiles();
const corpusBaselines = [];
for (const sourcePath of corpusFiles) {
  const { source, cards } = await parseProjectMarkdown(sourcePath);
  corpusBaselines.push({
    source: sourcePath,
    sourceHash: sha256(source),
    outputHash: hashJson(cards)
  });
}

await writeJson(join(goldenDir, 'corpus-baselines.json'), corpusBaselines);
console.log(`updated ${sampleBaselines.length} sample baselines and ${corpusBaselines.length} corpus baselines`);
