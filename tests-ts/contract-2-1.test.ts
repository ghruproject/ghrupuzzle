import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertMatchingReleaseContracts,
  type ScoringPolicy,
  type SubmissionSchema,
} from '../lib/release-contract';
import {
  scoreSubmission,
  SubmissionValidationError,
  type AnswerKey,
} from '../lib/scoring';

const typingSchema: SubmissionSchema = {
  schema_version: '2.1',
  release_id: 'contract-typing',
  exercise: 'typing',
  mode: 'practice',
  fields: [
    {
      name: 'sample_id',
      label: 'Sample',
      description: 'Identifier',
      type: 'string',
      identifier: true,
      required: true,
      aliases: [],
      normalizer: 'identifier',
      scored: false,
      scorer: 'identifier',
    },
    {
      name: 'qc_status',
      label: 'QC status',
      description: 'QC decision',
      type: 'string',
      identifier: false,
      required: true,
      allowed_values: ['PASS', 'FAIL'],
      aliases: ['qc'],
      normalizer: 'qc_status',
      scored: true,
      scorer: 'exact',
    },
    {
      name: 'failure_reason',
      label: 'Failure reason',
      description: 'Categorical reason',
      type: 'string',
      identifier: false,
      required: true,
      allowed_values: ['NONE', 'EMPTY_FILE', 'CONTAMINATED'],
      aliases: ['error'],
      normalizer: 'upper',
      scored: true,
      scorer: 'exact',
    },
    {
      name: 'species',
      label: 'Species',
      description: 'Species call',
      type: 'string',
      identifier: false,
      required: false,
      required_when: { field: 'qc_status', equals: 'PASS' },
      aliases: [],
      normalizer: 'species',
      scored: true,
      scorer: 'exact',
    },
    {
      name: 'st',
      label: 'ST',
      description: 'Sequence type',
      type: 'string',
      identifier: false,
      required: false,
      required_when: { field: 'qc_status', equals: 'PASS' },
      aliases: [],
      normalizer: 'sequence_type',
      scored: true,
      scorer: 'exact',
    },
    {
      name: 'wzi',
      label: 'wzi',
      description: 'wzi allele',
      type: 'string',
      identifier: false,
      required: false,
      aliases: [],
      normalizer: 'trim_casefold',
      scored: true,
      scorer: 'exact',
    },
  ],
};

const typingPolicy: ScoringPolicy = {
  schema_version: '2.1',
  release_id: 'contract-typing',
  scorer_version: '2.1',
  pass_threshold: 0.8,
  require_all_samples: true,
  reject_unexpected_samples: true,
  fields: [
    {
      name: 'qc_status',
      scored: true,
      scorer: 'exact',
      normalizer: 'qc_status',
      weight: 1,
      aliases: ['qc'],
      score_when: null,
    },
    {
      name: 'failure_reason',
      scored: true,
      scorer: 'exact',
      normalizer: 'upper',
      weight: 1,
      aliases: ['error'],
      score_when: null,
    },
    {
      name: 'species',
      scored: true,
      scorer: 'exact',
      normalizer: 'species',
      weight: 1,
      aliases: [],
      score_when: { field: 'qc_status', equals: 'PASS' },
    },
    {
      name: 'st',
      scored: true,
      scorer: 'exact',
      normalizer: 'sequence_type',
      weight: 1,
      aliases: [],
      score_when: { field: 'qc_status', equals: 'PASS' },
    },
    {
      name: 'wzi',
      scored: true,
      scorer: 'exact',
      normalizer: 'trim_casefold',
      weight: 1,
      aliases: [],
      score_when: { field: 'qc_status', equals: 'PASS' },
    },
  ],
};

const typingAnswers: AnswerKey = {
  schema_version: '2.1',
  release_id: 'contract-typing',
  exercise: 'typing',
  mode: 'practice',
  samples: [
    {
      sample_id: 'Sample_A',
      answers: {
        qc_status: 'PASS',
        failure_reason: 'NONE',
        species: 'Klebsiella pneumoniae',
        st: '14',
        wzi: '-',
      },
    },
    {
      sample_id: 'Sample_B',
      answers: {
        qc_status: 'FAIL',
        failure_reason: 'CONTAMINATED',
      },
    },
    {
      sample_id: 'Sample_C',
      answers: {
        qc_status: 'PASS',
        failure_reason: 'NONE',
        species: 'Klebsiella variicola',
        st: '15',
        wzi: 'wzi15',
      },
    },
  ],
};

test('schema 2.1 release metadata and private contracts register together', () => {
  assert.equal(
    assertMatchingReleaseContracts({
      releaseId: typingSchema.release_id,
      exercise: typingSchema.exercise,
      mode: typingSchema.mode,
      requestedSchemaVersion: '2.1',
      manifest: {
        schema_version: '2.1',
        release_id: typingSchema.release_id,
        exercise: typingSchema.exercise,
        mode: typingSchema.mode,
      },
      releaseIndex: {
        schema_version: '2.1',
        release_id: typingSchema.release_id,
        exercise: typingSchema.exercise,
        mode: typingSchema.mode,
      },
      complete: {
        schema_version: '2.1',
        release_id: typingSchema.release_id,
        status: 'complete',
      },
      submissionSchema: typingSchema,
      answerKey: typingAnswers,
      scoringPolicy: typingPolicy,
    }),
    '2.1',
  );
});

test('schema 2.1 conditional scoring ignores analytical fields for truth-level failures', () => {
  const score = scoreSubmission(
    [
      'sample_id,qc_status,failure_reason,species,st,wzi',
      'Sample_A,PASS,NONE,  KLEBSIELLA PNEUMONIAE  ,ST14,',
      'Sample_B,FAIL,CONTAMINATED,wrong species,ST999,wzi999',
      'Sample_C,PASS,NONE,Klebsiella variicola,15,wzi15',
    ].join('\n'),
    typingAnswers,
    typingPolicy,
    typingSchema,
  );
  assert.equal(score.earned, 5);
  assert.equal(score.possible, 5);
  assert.equal(score.passed, true);
  assert.deepEqual(
    score.items.filter((item) => item.sampleId === 'Sample_B').map((item) => item.field),
    ['qc_status', 'failure_reason'],
  );
});

test('blank and dash are equivalent for unavailable wzi values', () => {
  const makeSheet = (wzi: string) => [
    'sample_id,qc_status,failure_reason,species,st,wzi',
    `Sample_A,PASS,NONE,Klebsiella pneumoniae,14,${wzi}`,
    'Sample_B,FAIL,CONTAMINATED,,,',
    'Sample_C,PASS,NONE,Klebsiella variicola,15,wzi15',
  ].join('\n');
  const blank = scoreSubmission(makeSheet(''), typingAnswers, typingPolicy, typingSchema);
  const dash = scoreSubmission(makeSheet('-'), typingAnswers, typingPolicy, typingSchema);
  assert.equal(blank.earned, blank.possible);
  assert.deepEqual(
    blank.items.map((item) => item.correct),
    dash.items.map((item) => item.correct),
  );
});

test('failed rows require only QC and a non-NONE categorical reason', () => {
  assert.doesNotThrow(() =>
    scoreSubmission(
      [
        'sample_id,qc_status,failure_reason,species,st,wzi',
        'Sample_A,PASS,NONE,Klebsiella pneumoniae,14,-',
        'Sample_B,FAIL,CONTAMINATED,,,',
        'Sample_C,PASS,NONE,Klebsiella variicola,15,wzi15',
      ].join('\n'),
      typingAnswers,
      typingPolicy,
      typingSchema,
    ),
  );
  assert.throws(
    () =>
      scoreSubmission(
        [
          'sample_id,qc_status,failure_reason,species,st,wzi',
          'Sample_A,PASS,NONE,,14,-',
          'Sample_B,FAIL,NONE,,,',
          'Sample_C,PASS,NONE,Klebsiella variicola,15,wzi15',
        ].join('\n'),
        typingAnswers,
        typingPolicy,
        typingSchema,
      ),
    (error: unknown) => {
      assert.ok(error instanceof SubmissionValidationError);
      assert.ok(error.issues.some((issue) =>
        issue.sampleId === 'Sample_A' && issue.field === 'species',
      ));
      assert.ok(error.issues.some((issue) =>
        issue.sampleId === 'Sample_B' && issue.field === 'failure_reason',
      ));
      return true;
    },
  );
});

test('schema validation reports duplicate, unexpected and missing sample rows', () => {
  assert.throws(
    () =>
      scoreSubmission(
        [
          'sample_id,qc_status,failure_reason,species,st,wzi',
          'Sample_A,PASS,NONE,Klebsiella pneumoniae,14,-',
          'Sample_A,PASS,NONE,Klebsiella pneumoniae,14,-',
          'Unexpected,FAIL,EMPTY_FILE,,,',
        ].join('\n'),
        typingAnswers,
        typingPolicy,
        typingSchema,
      ),
    (error: unknown) => {
      assert.ok(error instanceof SubmissionValidationError);
      assert.ok(error.issues.some((issue) => /duplicate/i.test(issue.message)));
      assert.ok(error.issues.some((issue) => /not part of the release/i.test(issue.message)));
      assert.ok(error.issues.some((issue) => /Missing sample row: Sample_B/i.test(issue.message)));
      return true;
    },
  );
});

test('outbreak partition scoring ignores failed samples and literal cluster labels', () => {
  const schema: SubmissionSchema = {
    ...typingSchema,
    release_id: 'contract-outbreak',
    exercise: 'outbreak',
    fields: typingSchema.fields
      .filter((field) => !['species', 'st', 'wzi'].includes(field.name))
      .concat({
        name: 'cluster',
        label: 'Cluster',
        description: 'Arbitrary cluster label',
        type: 'string',
        identifier: false,
        required: false,
        required_when: { field: 'qc_status', equals: 'PASS' },
        aliases: [],
        normalizer: 'trim_casefold',
        scored: true,
        scorer: 'partition',
      }),
  };
  const policy: ScoringPolicy = {
    ...typingPolicy,
    release_id: 'contract-outbreak',
    fields: typingPolicy.fields
      .filter((field) => ['qc_status', 'failure_reason'].includes(field.name))
      .concat({
        name: 'cluster',
        scored: true,
        scorer: 'partition',
        normalizer: 'trim_casefold',
        weight: 1,
        aliases: [],
        score_when: { field: 'qc_status', equals: 'PASS' },
      }),
  };
  const answers: AnswerKey = {
    schema_version: '2.1',
    release_id: 'contract-outbreak',
    exercise: 'outbreak',
    mode: 'practice',
    samples: [
      { sample_id: 'A', answers: { qc_status: 'PASS', failure_reason: 'NONE', cluster: '1' } },
      { sample_id: 'B', answers: { qc_status: 'PASS', failure_reason: 'NONE', cluster: '1' } },
      { sample_id: 'C', answers: { qc_status: 'PASS', failure_reason: 'NONE', cluster: '2' } },
      { sample_id: 'D', answers: { qc_status: 'FAIL', failure_reason: 'EMPTY_FILE' } },
    ],
  };
  const score = scoreSubmission(
    [
      'sample_id,qc_status,failure_reason,cluster',
      'A,PASS,NONE,red',
      'B,PASS,NONE,red',
      'C,PASS,NONE,blue',
      'D,FAIL,EMPTY_FILE,',
    ].join('\n'),
    answers,
    policy,
    schema,
  );
  assert.equal(score.earned, 3);
  assert.equal(score.possible, 3);
  assert.equal(score.passed, true);
  assert.ok(score.items.every((item) => !item.field.includes('_with_D')));
});
