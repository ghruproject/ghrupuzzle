import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectDelimiter,
  parseCsv,
  parseDelimitedText,
  scoreSubmission,
  SubmissionValidationError,
  type AnswerKey,
  type ScoringPolicy,
  validateSubmissionCompleteness,
} from '../lib/scoring';

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

test('parseDelimitedText accepts tab-separated files and quoted tabs', () => {
  const text = 'sample_id\tnotes\nSample_a\t"mixed\tcheck"\n';
  assert.equal(detectDelimiter(text), '\t');
  assert.deepEqual(parseDelimitedText(text), [
    { sample_id: 'Sample_a', notes: 'mixed\tcheck' },
  ]);
});

test('parseDelimitedText rejects inconsistent row widths with a useful row number', () => {
  assert.throws(
    () => parseDelimitedText('sample_id,st\nSample_a,15,extra\n'),
    (error: unknown) =>
      error instanceof SubmissionValidationError
      && /row 2 has 3 columns; expected 2/i.test(error.message),
  );
});

test('scoreSubmission normalises headers and values', () => {
  const score = scoreSubmission(
    'Sample ID,ST,K locus\n  sample_A  , 15 , kl24 \nSAMPLE_B,307,KL102\n',
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
  assert.throws(
    () => validateSubmissionCompleteness(score),
    /missing 1 expected sample/i,
  );
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

test('unordered-list policies accept common separators, whitespace and duplicates', () => {
  const genes: AnswerKey = {
    ...answerKey,
    samples: [{ sample_id: 'Sample_a', answers: { resistance_genes: ['blaKPC', 'blaNDM'] } }],
  };
  const policy: ScoringPolicy = {
    schema_version: '2.0',
    release_id: answerKey.release_id,
    scorer_version: '2.0',
    pass_threshold: 0.8,
    require_all_samples: true,
    reject_unexpected_samples: true,
    fields: [
      {
        name: 'resistance_genes',
        scored: true,
        scorer: 'unordered_list',
        weight: 1,
        aliases: ['genes'],
      },
    ],
  };
  const score = scoreSubmission(
    'sample_id\tgenes\nSample_a\t" blaNDM | blaKPC ; blaNDM "\n',
    genes,
    policy,
  );
  assert.equal(score.passed, true);
});

test('controlled result tokens accept spaces, hyphens and underscores', () => {
  const assembly: AnswerKey = {
    schema_version: '2.0',
    release_id: 'assembly',
    exercise: 'assembly',
    mode: 'challenge',
    samples: [
      { sample_id: 'A', answers: { qc: 'FAIL', error: 'LOW_COVERAGE' } },
      { sample_id: 'B', answers: { qc: 'PASS', error: '' } },
    ],
  };
  const policy: ScoringPolicy = {
    schema_version: '2.0',
    release_id: 'assembly',
    scorer_version: '2.0',
    pass_threshold: 0.8,
    require_all_samples: true,
    reject_unexpected_samples: true,
    fields: [
      { name: 'qc', scored: true, scorer: 'exact', weight: 1, aliases: [] },
      { name: 'error', scored: true, scorer: 'exact', weight: 1, aliases: [] },
    ],
  };
  const score = scoreSubmission(
    'sample_id,qc,error\nA, fail , low-coverage\nB,PASS,N/A\n',
    assembly,
    policy,
  );
  assert.equal(score.earned, score.possible);
  assert.equal(score.passed, true);
});

test('scoreSubmission rejects files missing assessed columns', () => {
  const policy: ScoringPolicy = {
    schema_version: '2.0',
    release_id: answerKey.release_id,
    scorer_version: '2.0',
    pass_threshold: 0.8,
    require_all_samples: true,
    reject_unexpected_samples: true,
    fields: [
      { name: 'st', scored: true, scorer: 'exact', weight: 1, aliases: [] },
      { name: 'k_locus', scored: true, scorer: 'exact', weight: 1, aliases: [] },
    ],
  };
  assert.throws(
    () => scoreSubmission('sample_id,st\nSample_a,15\nSample_b,307\n', answerKey, policy),
    /missing assessed column: k_locus/i,
  );
});

test('v2 policy controls aliases, fields, threshold, and unexpected samples', () => {
  const policy: ScoringPolicy = {
    schema_version: '2.0',
    release_id: answerKey.release_id,
    scorer_version: '2.0',
    pass_threshold: 0.75,
    require_all_samples: true,
    reject_unexpected_samples: true,
    fields: [
      {
        name: 'st',
        scored: true,
        scorer: 'exact',
        weight: 2,
        aliases: ['sequence_type'],
      },
      {
        name: 'k_locus',
        scored: false,
        scorer: 'exact',
        weight: 1,
        aliases: [],
      },
    ],
  };
  const score = scoreSubmission(
    'sample_id,sequence_type\nSample_a,15\nSample_b,307\nExtra,1\n',
    answerKey,
    policy,
  );
  assert.equal(score.earned, 2);
  assert.equal(score.possible, 2);
  assert.equal(score.passed, false);
  assert.deepEqual(score.unexpectedSamples, ['Extra']);
});

test('v2 partition weight does not grow quadratically', () => {
  const outbreak: AnswerKey = {
    schema_version: '2.0',
    release_id: 'outbreak',
    exercise: 'outbreak',
    mode: 'practice',
    samples: [
      { sample_id: 'A', answers: { cluster: '1' } },
      { sample_id: 'B', answers: { cluster: '1' } },
      { sample_id: 'C', answers: { cluster: '2' } },
      { sample_id: 'D', answers: { cluster: '2' } },
    ],
  };
  const policy: ScoringPolicy = {
    schema_version: '2.0',
    release_id: 'outbreak',
    scorer_version: '2.0',
    pass_threshold: 0.8,
    require_all_samples: true,
    reject_unexpected_samples: true,
    fields: [
      {
        name: 'cluster',
        scored: true,
        scorer: 'partition',
        weight: 1,
        aliases: [],
      },
    ],
  };
  const score = scoreSubmission(
    'sample_id,cluster\nA,X\nB,X\nC,Y\nD,Y\n',
    outbreak,
    policy,
  );
  assert.equal(score.possible, 1);
  assert.equal(score.earned, 1);
});
