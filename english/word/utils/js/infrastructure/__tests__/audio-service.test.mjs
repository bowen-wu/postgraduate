import test from 'node:test';
import assert from 'node:assert/strict';

import { __testables } from '../audio-service.js';

test('buildAzureSsml wraps sentence audio with chat style and faster prosody', () => {
  const ssml = __testables.buildAzureSsml('This is a sentence & it should link naturally.', 'en-US-AriaNeural', {
    style: 'chat',
    rate: '+6%'
  });

  assert.match(ssml, /xmlns:mstts='https:\/\/www\.w3\.org\/2001\/mstts'/);
  assert.match(ssml, /name='en-US-AriaNeural'/);
  assert.match(ssml, /<mstts:express-as style='chat'>/);
  assert.match(ssml, /<prosody rate='\+6%'>/);
  assert.match(ssml, /This is a sentence &amp; it should link naturally\./);
});

test('getAzureCacheSourceKey separates styled sentence audio from default Azure cache', () => {
  assert.equal(__testables.getAzureCacheSourceKey({}), 'azure');
  assert.equal(
    __testables.getAzureCacheSourceKey({ voice: 'en-US-AriaNeural', style: 'chat', rate: '+6%' }),
    'azure:en-US-AriaNeural:chat:+6%'
  );
});
