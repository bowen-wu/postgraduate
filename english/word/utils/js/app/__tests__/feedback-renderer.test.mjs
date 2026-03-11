import test from 'node:test';
import assert from 'node:assert/strict';

import { revealSentenceTranslationNode } from '../renderers/feedback-renderer.js';

function createClassList() {
  const classes = new Set();
  return {
    add(name) {
      classes.add(name);
    },
    has(name) {
      return classes.has(name);
    }
  };
}

test('revealSentenceTranslationNode shows sentence translation node', () => {
  const sentenceNode = {
    style: { display: 'none' },
    classList: createClassList()
  };

  const doc = {
    getElementById(id) {
      return id === 'sentenceCn' ? sentenceNode : null;
    }
  };

  const changed = revealSentenceTranslationNode(doc);

  assert.equal(changed, true);
  assert.equal(sentenceNode.style.display, 'block');
  assert.equal(sentenceNode.classList.has('revealed'), true);
});

test('revealSentenceTranslationNode returns false when node does not exist', () => {
  const doc = {
    getElementById() {
      return null;
    }
  };

  const changed = revealSentenceTranslationNode(doc);
  assert.equal(changed, false);
});
