import assert from 'node:assert/strict';
import test from 'node:test';
import { outbreakChallengeDefinition } from '../lib/exercise-definitions';
import { PARTICIPANT_GUIDES, participantGuide } from '../lib/generated-guides';

test('participant guide slugs and order are unique', () => {
  assert.equal(new Set(PARTICIPANT_GUIDES.map((guide) => guide.slug)).size, PARTICIPANT_GUIDES.length);
  assert.equal(new Set(PARTICIPANT_GUIDES.map((guide) => guide.order)).size, PARTICIPANT_GUIDES.length);
});

test('all four exercises have a participant guide', () => {
  assert.deepEqual(
    new Set(PARTICIPANT_GUIDES.map((guide) => guide.exercise)),
    new Set(['all', 'assembly', 'hybrid', 'typing', 'outbreak']),
  );
});

test('generated guide lookup returns Markdown content', () => {
  const guide = participantGuide('short-read-assembly');
  assert.ok(guide);
  assert.match(guide.markdown, /^# Short-read assembly/m);
  assert.match(guide.markdown, /## Recommended route/);
  assert.match(guide.markdown, /GHRU-assembly/);
  assert.match(guide.markdown, /BactScout/);
});

test('outbreak guidance requires a tree for analysis but only a result-sheet submission', () => {
  const guide = participantGuide('outbreak-analysis');
  assert.ok(guide);
  assert.doesNotMatch(guide.markdown, /epidemiological metadata/i);
  assert.match(guide.markdown, /tree is an analysis output/i);
  assert.match(guide.markdown, /submit only the completed CSV or TSV result sheet/i);
  assert.match(outbreakChallengeDefinition.subtitle, /submit sample-level QC, species/i);
  assert.match(outbreakChallengeDefinition.submissionText, /Do not upload the tree/i);
});
