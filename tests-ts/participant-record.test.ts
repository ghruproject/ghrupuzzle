import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const participantRecordSource = readFileSync(
  new URL('../components/participant-record.tsx', import.meta.url),
  'utf8',
);

test('review requests use an accessible in-app form instead of a browser prompt', () => {
  assert.doesNotMatch(participantRecordSource, /window\.prompt/);
  assert.match(participantRecordSource, /role="dialog"/);
  assert.match(participantRecordSource, /aria-modal="true"/);
  assert.match(participantRecordSource, /Submit review request/);
  assert.match(participantRecordSource, /maxLength=\{2000\}/);
});
