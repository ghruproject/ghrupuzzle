import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPracticeSampleFeedback,
  practiceFieldLabel,
} from '../lib/practice-feedback';

test('practice feedback summarises correct samples and highlights key fields', () => {
  const feedback = buildPracticeSampleFeedback(
    ['Sample_1'],
    [
      {
        sampleId: 'Sample_1',
        field: 'qc_status',
        correct: true,
        submitted: 'PASS',
        expected: 'PASS',
      },
      {
        sampleId: 'Sample_1',
        field: 'failure_reason',
        correct: true,
        submitted: 'NONE',
        expected: 'NONE',
      },
      {
        sampleId: 'Sample_1',
        field: 'species',
        correct: true,
        submitted: 'Klebsiella pneumoniae',
        expected: 'Klebsiella pneumoniae',
      },
    ],
  );

  assert.equal(feedback[0].allCorrect, true);
  assert.equal(feedback[0].correctCount, 3);
  assert.equal(feedback[0].totalCount, 3);
  assert.deepEqual(
    feedback[0].highlightedItems.map((item) => item.field),
    ['qc_status', 'failure_reason'],
  );
});

test('practice feedback always highlights incorrect analytical fields', () => {
  const feedback = buildPracticeSampleFeedback(
    ['Sample_1'],
    [
      {
        sampleId: 'Sample_1',
        field: 'qc_status',
        correct: true,
        submitted: 'PASS',
        expected: 'PASS',
      },
      {
        sampleId: 'Sample_1',
        field: 'species',
        correct: false,
        submitted: 'Klebsiella variicola',
        expected: 'Klebsiella pneumoniae',
      },
    ],
  );

  assert.equal(feedback[0].allCorrect, false);
  assert.deepEqual(
    feedback[0].highlightedItems.map((item) => item.field),
    ['qc_status', 'species'],
  );
  assert.equal(practiceFieldLabel('qc_status'), 'QC status');
  assert.equal(practiceFieldLabel('custom_field'), 'custom field');
});
