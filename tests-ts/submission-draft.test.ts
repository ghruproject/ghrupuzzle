import assert from 'node:assert/strict';
import test from 'node:test';
import type { SubmissionField } from '../lib/release-contract';
import {
  buildInitialSubmissionRows,
  restoreSubmissionDraft,
  serialiseSubmissionDraft,
  submissionDraftContract,
  submissionDraftStorageKey,
} from '../lib/submission-draft';

const fields: SubmissionField[] = [
  {
    name: 'sample_id',
    label: 'Sample',
    description: 'Sample identifier',
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
    description: 'QC status',
    type: 'string',
    identifier: false,
    required: true,
    scored: true,
    allowed_values: ['PASS', 'FAIL'],
    aliases: [],
    normalizer: 'qc_status',
    scorer: 'exact',
  },
  {
    name: 'notes',
    label: 'Notes',
    description: 'Notes',
    type: 'string',
    identifier: false,
    required: false,
    aliases: [],
    normalizer: 'trim',
    scored: false,
    scorer: 'exact',
  },
];
const sampleIds = ['sample-1', 'sample-2'];
const contract = submissionDraftContract('typing-v2', sampleIds, fields);

test('draft storage keys isolate accounts and published releases', () => {
  const first = submissionDraftStorageKey('user-1', 'release-db-1', 'typing-v2');
  assert.notEqual(first, submissionDraftStorageKey('user-2', 'release-db-1', 'typing-v2'));
  assert.notEqual(first, submissionDraftStorageKey('user-1', 'release-db-1', 'typing-v3'));
});

test('draft rows start with fixed sample identifiers and typing defaults', () => {
  assert.deepEqual(buildInitialSubmissionRows(sampleIds), {
    'sample-1': { sample_id: 'sample-1', failure_reason: 'NONE' },
    'sample-2': { sample_id: 'sample-2', failure_reason: 'NONE' },
  });
});

test('saved drafts restore only current samples, fields and controlled values', () => {
  const stored = serialiseSubmissionDraft(contract, {
    'sample-1': {
      sample_id: 'tampered-id',
      qc_status: 'PASS',
      notes: 'restored note',
      removed_field: 'discard me',
    },
    'sample-2': { sample_id: 'sample-2', qc_status: 'INVALID' },
    'old-sample': { sample_id: 'old-sample', notes: 'discard me' },
  }, '2026-09-01T12:00:00.000Z');

  assert.deepEqual(restoreSubmissionDraft(stored, contract, sampleIds, fields), {
    savedAt: '2026-09-01T12:00:00.000Z',
    rows: {
      'sample-1': {
        sample_id: 'sample-1',
        failure_reason: 'NONE',
        qc_status: 'PASS',
        notes: 'restored note',
      },
      'sample-2': { sample_id: 'sample-2', failure_reason: 'NONE' },
    },
  });
});

test('invalid or incompatible drafts are ignored', () => {
  assert.equal(restoreSubmissionDraft('{broken', contract, sampleIds, fields), null);
  assert.equal(restoreSubmissionDraft('null', contract, sampleIds, fields), null);
  const stored = serialiseSubmissionDraft(contract, {}, '2026-09-01T12:00:00.000Z');
  assert.equal(restoreSubmissionDraft(stored, 'different-contract', sampleIds, fields), null);
  assert.equal(
    restoreSubmissionDraft(
      serialiseSubmissionDraft(contract, {}, 'not-a-date'),
      contract,
      sampleIds,
      fields,
    ),
    null,
  );
});
