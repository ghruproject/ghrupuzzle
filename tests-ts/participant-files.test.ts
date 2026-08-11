import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildParticipantSampleView,
  participantDownloadFiles,
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

test('schema 2.1 releases use the canonical sample sheet when the manifest omits its pointer', () => {
  const manifest: ParticipantManifest = {
    samples: [
      {
        files: {
          assembly: { filename: 'Sample_001.fasta', size: 123 },
        },
      },
    ],
  };
  const prefix = 'releases/challenge-2-typing-v2/typing/challenge';

  assert.deepEqual(participantDownloadFiles(manifest), [
    {
      filename: 'sample_sheet.csv',
      sha256: undefined,
      size: undefined,
      url: undefined,
    },
    {
      filename: 'Sample_001.fasta',
      sha256: undefined,
      size: 123,
      url: undefined,
    },
  ]);
  assert.equal(
    participantObjectKey(manifest, prefix, 'sample_sheet.csv'),
    `${prefix}/sample_sheet.csv`,
  );
});
