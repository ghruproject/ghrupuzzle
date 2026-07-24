import assert from 'node:assert/strict';
import test from 'node:test';
import { PRACTICE_EXERCISES } from '../lib/practice-exercises';

test('all published practice exercises advertise their datasets as available', () => {
  assert.deepEqual(
    PRACTICE_EXERCISES.map(({ title, dataAvailable }) => ({
      title,
      dataAvailable,
    })),
    [
      { title: 'Short-read assembly', dataAvailable: true },
      { title: 'Hybrid assembly', dataAvailable: true },
      { title: 'Genotyping', dataAvailable: true },
      { title: 'Outbreak analysis', dataAvailable: true },
    ],
  );
});
