import assert from 'node:assert/strict';
import test from 'node:test';
import type { ScoreResult } from '../lib/scoring';
import { buildSubmissionReceipt } from '../lib/submission-receipt';

const score: ScoreResult = {
  earned: 7,
  possible: 8,
  passed: true,
  missingSamples: [],
  unexpectedSamples: [],
  items: [
    {
      sampleId: 'sample-1',
      field: 'species',
      correct: true,
      submitted: 'submitted answer',
      expected: 'private answer',
      weight: 1,
    },
  ],
};

test('challenge receipts do not expose scores or private comparison details', () => {
  assert.deepEqual(buildSubmissionReceipt(
    'challenge',
    'submission-1',
    2,
    '2026-08-20T10:00:00.000Z',
    score,
  ), {
    submissionId: 'submission-1',
    attemptNumber: 2,
    submittedAt: '2026-08-20T10:00:00.000Z',
    status: 'scored',
    provisional: true,
  });
});

test('practice receipts include immediate assessment feedback', () => {
  const receipt = buildSubmissionReceipt(
    'practice',
    'submission-1',
    1,
    '2026-07-24T10:00:00.000Z',
    score,
  );
  assert.equal('earned' in receipt ? receipt.earned : null, 7);
  assert.equal('details' in receipt ? receipt.details.items[0].expected : null, 'private answer');
  assert.equal(receipt.provisional, false);
});
