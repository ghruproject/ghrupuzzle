import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBulkDownloadScript,
  createParticipantDownloadToken,
  participantFileUrl,
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
    url: 'https://public-r2.example/releases/practice/sample_sheet.csv',
  },
  samples: [
    {
      sample_id: 'Sample_A',
      files: {
        read_1: {
          filename: 'Sample_A_R1.fastq.gz',
          sha256: 'r1-sha',
          size: 42,
          url: 'https://public-r2.example/releases/practice/files/Sample_A_R1.fastq.gz',
        },
        read_2: {
          filename: 'Sample_A_R2.fastq.gz',
          sha256: 'empty-sha',
          size: 0,
          url: 'https://public-r2.example/releases/practice/files/Sample_A_R2.fastq.gz',
        },
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
  assert.equal(files[0].url, manifest.sample_sheet?.url);
});

test('practice helpers can use direct public R2 object URLs', () => {
  const files = participantDownloadFiles(manifest);
  const script = buildBulkDownloadScript({
    tool: 'curl',
    releaseId: 'practice-release',
    files,
    fileUrl: (file) => file.url ?? '',
  });
  assert.match(script, /https:\/\/public-r2\.example\/releases\/practice\/sample_sheet\.csv/);
  assert.doesNotMatch(script, /\/api\/releases\//);
});

for (const tool of ['curl', 'wget'] as const) {
  test(`${tool} helper downloads every participant file and embeds checksums`, () => {
    const script = buildBulkDownloadScript({
      tool,
      releaseId: 'practice-release',
      files: participantDownloadFiles(manifest),
      fileUrl: (file) => `https://example.test/files/${file.filename}`,
    });
    assert.match(script, /^#!\/usr\/bin\/env bash\nset -euo pipefail/);
    for (const file of participantDownloadFiles(manifest)) {
      assert.match(script, new RegExp(file.filename.replace(/\./g, '\\.')));
      assert.match(script, new RegExp(file.sha256 ?? 'unreachable'));
    }
    assert.doesNotMatch(script, /answer_key|scoring_policy|private\//);
    assert.match(script, /sha256sum -c checksums\.sha256/);
    assert.match(script, /shasum -a 256 -c checksums\.sha256/);
    assert.match(script, /Downloads and SHA-256 verification complete/);
    assert.match(script, /Downloaded and verified/);
    assert.match(script, /failed or incomplete download/);
    assert.match(script, /for attempt in 1 2 3 4 5 6/);
    assert.match(script, /\.part/);
  });
}

test('participant file links use the configured public origin and encode tokens', () => {
  assert.equal(
    participantFileUrl(
      'https://ghrupuzzle.vercel.app',
      'release/id',
      'sample 1.fastq.gz',
      '123.signature',
    ),
    'https://ghrupuzzle.vercel.app/api/releases/release%2Fid/files/sample%201.fastq.gz?token=123.signature',
  );
});

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
