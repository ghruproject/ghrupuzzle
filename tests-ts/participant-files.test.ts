import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildParticipantSampleView,
  participantObjectKey,
  type ParticipantManifest,
} from '../lib/participant-files';

test('zero-byte participant files remain downloadable', () => {
  const sample = buildParticipantSampleView(
    {
      sample_id: 'Sample_001',
      files: {
        read_1: { filename: 'Sample_001_R1.fastq.gz', size: 0 },
        read_2: { filename: 'Sample_001_R2.fastq.gz', size: 120 },
      },
    },
    (file) => `/files/${file.filename}`,
  );

  assert.equal(sample.R1_URL, '/files/Sample_001_R1.fastq.gz');
  assert.deepEqual(sample.participant_files.R1_URL, {
    filename: 'Sample_001_R1.fastq.gz',
    size: 0,
    url: '/files/Sample_001_R1.fastq.gz',
  });
});

test('deliberately missing participant inputs are represented without a fake download', () => {
  const sample = buildParticipantSampleView(
    {
      sample_id: 'Sample_002',
      files: {
        read_1: { filename: 'Sample_002_R1.fastq.gz', size: 120 },
        read_2: { filename: 'Sample_002_R2.fastq.gz', size: 120 },
      },
    },
    (file) => `/files/${file.filename}`,
  );

  assert.equal(sample.LONG_READ_URL, '');
  assert.equal(sample.participant_files.LONG_READ_URL, null);
});

test('participant download allow-list accepts zero-byte manifest entries', () => {
  const manifest: ParticipantManifest = {
    samples: [
      {
        files: {
          read_1: { filename: 'empty.fastq.gz' },
        },
      },
    ],
  };

  assert.equal(
    participantObjectKey(manifest, 'releases/example/assembly/practice', 'empty.fastq.gz'),
    'releases/example/assembly/practice/files/empty.fastq.gz',
  );
});
