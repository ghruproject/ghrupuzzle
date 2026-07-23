import assert from 'node:assert/strict';
import test from 'node:test';
import { NEXT_CHALLENGE, challengePhase } from '../lib/challenge';

test('challenge dates match the published August 2026 window', () => {
  assert.equal(NEXT_CHALLENGE.dateLabel, '17–31 August 2026');
  assert.equal(challengePhase(new Date('2026-08-16T22:59:59Z')), 'upcoming');
  assert.equal(challengePhase(new Date('2026-08-16T23:00:00Z')), 'open');
  assert.equal(challengePhase(new Date('2026-08-31T22:59:59Z')), 'open');
  assert.equal(challengePhase(new Date('2026-08-31T23:00:00Z')), 'closed');
});
