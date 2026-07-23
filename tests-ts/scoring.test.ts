import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCsv, scoreSubmission, type AnswerKey } from '../lib/scoring';

const answerKey: AnswerKey = {
  schema_version: '1.0',
  release_id: 'typing-2026',
  exercise: 'typing',
  mode: 'practice',
  samples: [
    {
      sample_id: 'Sample_a',
      answers: { st: '15', k_locus: 'KL24', analysis_status: 'complete' },
    },
    {
      sample_id: 'Sample_b',
      answers: { st: '307', k_locus: 'KL102' },
    },
  ],
};

test('parseCsv handles quoted commas and escaped quotes', () => {
  const rows = parseCsv('sample,notes\nSample_a,"mixed, ""check"""\n');
  assert.deepEqual(rows, [{ sample: 'Sample_a', notes: 'mixed, "check"' }]);
});

test('scoreSubmission normalises headers and values', () => {
  const score = scoreSubmission(
    'Sample ID,ST,K locus\nSample_a,15,kl24\nSample_b,307,KL102\n',
    answerKey,
  );
  assert.equal(score.earned, 4);
  assert.equal(score.possible, 4);
  assert.equal(score.passed, true);
  assert.deepEqual(score.missingSamples, []);
});

test('scoreSubmission fails incomplete sample sets', () => {
  const score = scoreSubmission('sample,st,k_locus\nSample_a,15,KL24\n', answerKey);
  assert.equal(score.earned, 2);
  assert.equal(score.possible, 4);
  assert.equal(score.passed, false);
  assert.deepEqual(score.missingSamples, ['Sample_b']);
});

test('scoreSubmission rejects duplicate sample IDs', () => {
  assert.throws(
    () =>
      scoreSubmission(
        'sample,st,k_locus\nSample_a,15,KL24\nSample_a,15,KL24\n',
        answerKey,
      ),
    /duplicate sample identifier/,
  );
});

test('outbreak clusters are scored independently of participant labels', () => {
  const outbreak: AnswerKey = {
    schema_version: '1.0',
    release_id: 'outbreak',
    exercise: 'outbreak',
    mode: 'practice',
    samples: [
      { sample_id: 'A', answers: { cluster: '1' } },
      { sample_id: 'B', answers: { cluster: '1' } },
      { sample_id: 'C', answers: { cluster: '2' } },
    ],
  };
  const score = scoreSubmission('sample,cluster\nA,X\nB,X\nC,Y\n', outbreak);
  assert.equal(score.earned, 3);
  assert.equal(score.possible, 3);
  assert.equal(score.passed, true);
});

test('carbapenemase lists are order independent', () => {
  const genes: AnswerKey = {
    ...answerKey,
    samples: [{ sample_id: 'Sample_a', answers: { bla_carb: 'blaNDM; blaKPC' } }],
  };
  const score = scoreSubmission('sample,bla_carb\nSample_a,"blaKPC,blaNDM"\n', genes);
  assert.equal(score.passed, true);
});
