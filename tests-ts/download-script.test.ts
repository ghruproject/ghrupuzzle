import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBulkDownloadScript,
  createParticipantDownloadToken,
  verifyParticipantDownloadToken,
} from '../lib/download-script';
import {
  participantDownloadFiles,
  type ParticipantManifest,
} from '../lib/participant-files';

const manifest: ParticipantManifest = {
  sample_sheet: {
    filename: 'sample_sheet.csv',
    sha256: 'sheet-sha',
    size: 120,
  },
  samples: [
    {
      sample_id: 'Sample_A',
      files: {
        read_1: { filename: 'Sample_A_R1.fastq.gz', sha256: 'r1-sha', size: 42 },
        read_2: { filename: 'Sample_A_R2.fastq.gz', sha256: 'empty-sha', size: 0 },
      },
    },
  ],
};

test('participant bulk files include the template and intentional zero-byte inputs', () => {
  const files = participantDownloadFiles(manifest);
  assert.deepEqual(
    files.map((file) => [file.filename, file.size]),
    [
      ['sample_sheet.csv', 120],
      ['Sample_A_R1.fastq.gz', 42],
      ['Sample_A_R2.fastq.gz', 0],
    ],
  );
});

for (const tool of ['curl', 'wget'] as const) {
  test(`${tool} helper downloads every participant file and embeds checksums`, () => {
    const script = buildBulkDownloadScript({
      tool,
      releaseId: 'practice-release',
      files: participantDownloadFiles(manifest),
      fileUrl: (filename) => `https://example.test/files/${filename}`,
    });
    assert.match(script, /^#!\/usr\/bin\/env bash\nset -euo pipefail/);
    for (const file of participantDownloadFiles(manifest)) {
      assert.match(script, new RegExp(file.filename.replace(/\./g, '\\.')));
      assert.match(script, new RegExp(file.sha256 ?? 'unreachable'));
    }
    assert.doesNotMatch(script, /answer_key|scoring_policy|private\//);
    assert.match(script, /sha256sum -c checksums\.sha256/);
  });
}

test('download tokens are bound to release, filename and expiry', async () => {
  const now = Date.now();
  const token = await createParticipantDownloadToken(
    'test-secret',
    'release-id',
    'sample.fastq.gz',
    now + 60_000,
  );
  assert.equal(
    await verifyParticipantDownloadToken(
      'test-secret',
      'release-id',
      'sample.fastq.gz',
      token,
      now,
    ),
    true,
  );
  assert.equal(
    await verifyParticipantDownloadToken(
      'test-secret',
      'other-release',
      'sample.fastq.gz',
      token,
      now,
    ),
    false,
  );
  assert.equal(
    await verifyParticipantDownloadToken(
      'test-secret',
      'release-id',
      'answer_key.json',
      token,
      now,
    ),
    false,
  );
  assert.equal(
    await verifyParticipantDownloadToken(
      'test-secret',
      'release-id',
      'sample.fastq.gz',
      token,
      now + 60_001,
    ),
    false,
  );
});
