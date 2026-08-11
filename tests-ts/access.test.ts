import assert from 'node:assert/strict';
import test from 'node:test';
import {
  requireReleaseAccess,
  requireSignedChallengeDownloadAccess,
} from '../lib/assessment';
import type { CloudflareEnv } from '../lib/cloudflare';
import { participantObjectKey, type ParticipantManifest } from '../lib/participant-files';

function mockEnv(
  row: Record<string, unknown>,
  administratorEmails: string[] = [],
): CloudflareEnv {
  return {
    DB: {
      prepare: (query: string) => ({
        bind: (...values: unknown[]) => ({
          first: async () => {
            if (query.includes('administrator_email')) {
              const email = String(values[0]).toLowerCase();
              return administratorEmails.includes(email) ? { email } : null;
            }
            return row;
          },
        }),
      }),
    },
  } as unknown as CloudflareEnv;
}

const practiceRelease = {
  id: 'practice-db-id',
  release_id: 'practice-release',
  exercise: 'assembly',
  mode: 'practice',
  answer_key: 'releases/practice/assembly/practice/private/answer_key.json',
  manifest_key: 'releases/practice/assembly/practice/dataset_manifest.json',
  schema_version: '2.1',
  round_id: null,
  opens_at: null,
  closes_at: null,
  grace_seconds: 0,
  enrolment_status: null,
};

const challengeRelease = {
  ...practiceRelease,
  id: 'challenge-db-id',
  release_id: 'challenge-release',
  mode: 'challenge',
  round_id: 'round-id',
  opens_at: '2026-08-17T00:00:00.000Z',
  closes_at: '2026-08-31T23:59:00.000Z',
  enrolment_status: 'active',
};

const participant = {
  id: 'participant-id',
  name: 'Participant',
  email: 'participant@example.org',
};

const administrator = {
  id: 'administrator-id',
  name: 'Administrator',
  email: 'admin@example.org',
};

test('practice release retrieval and download access remain public', async () => {
  const release = await requireReleaseAccess(
    mockEnv(practiceRelease),
    practiceRelease.id,
    null,
    'download',
  );
  assert.equal(release.schemaVersion, '2.1');
});

test('challenge access requires authentication and active enrolment', async () => {
  await assert.rejects(
    requireReleaseAccess(
      mockEnv(challengeRelease),
      challengeRelease.id,
      null,
      'download',
      new Date('2026-08-20T12:00:00.000Z'),
    ),
    (error: unknown) => error instanceof Response && error.status === 401,
  );
  await assert.rejects(
    requireReleaseAccess(
      mockEnv({ ...challengeRelease, enrolment_status: null }),
      challengeRelease.id,
      participant,
      'download',
      new Date('2026-08-20T12:00:00.000Z'),
    ),
    (error: unknown) => error instanceof Response && error.status === 403,
  );
});

test('challenge downloads and submissions obey both sides of the configured window', async () => {
  for (const purpose of ['download', 'submit'] as const) {
    await assert.rejects(
      requireReleaseAccess(
        mockEnv(challengeRelease),
        challengeRelease.id,
        participant,
        purpose,
        new Date('2026-08-16T23:59:59.000Z'),
      ),
      (error: unknown) => error instanceof Response && error.status === 403,
    );
    await assert.rejects(
      requireReleaseAccess(
        mockEnv(challengeRelease),
        challengeRelease.id,
        participant,
        purpose,
        new Date('2026-09-01T00:00:00.000Z'),
      ),
      (error: unknown) => error instanceof Response && error.status === 403,
    );
    const release = await requireReleaseAccess(
      mockEnv(challengeRelease),
      challengeRelease.id,
      participant,
      purpose,
      new Date('2026-08-20T12:00:00.000Z'),
    );
    assert.equal(release.id, challengeRelease.id);
  }
});

test('administrators can preview challenge downloads outside the participant window', async () => {
  const release = await requireReleaseAccess(
    mockEnv(
      { ...challengeRelease, enrolment_status: null },
      [administrator.email],
    ),
    challengeRelease.id,
    administrator,
    'download',
    new Date('2026-08-01T12:00:00.000Z'),
  );
  assert.equal(release.id, challengeRelease.id);
  assert.equal(release.administratorPreview, true);
});

test('administrator preview does not bypass challenge submission locks', async () => {
  await assert.rejects(
    requireReleaseAccess(
      mockEnv(
        { ...challengeRelease, enrolment_status: null },
        [administrator.email],
      ),
      challengeRelease.id,
      administrator,
      'submit',
      new Date('2026-08-01T12:00:00.000Z'),
    ),
    (error: unknown) => error instanceof Response && error.status === 403,
  );
});

test('signed challenge downloads remain window-bound without requiring a command-line session', async () => {
  const release = await requireSignedChallengeDownloadAccess(
    mockEnv({ ...challengeRelease, enrolment_status: null }),
    challengeRelease.id,
    new Date('2026-08-20T12:00:00.000Z'),
  );
  assert.equal(release.id, challengeRelease.id);

  await assert.rejects(
    requireSignedChallengeDownloadAccess(
      mockEnv(challengeRelease),
      challengeRelease.id,
      new Date('2026-08-16T23:59:59.000Z'),
    ),
    (error: unknown) => error instanceof Response && error.status === 403,
  );
  await assert.rejects(
    requireSignedChallengeDownloadAccess(
      mockEnv(practiceRelease),
      practiceRelease.id,
      new Date('2026-08-20T12:00:00.000Z'),
    ),
    (error: unknown) => error instanceof Response && error.status === 403,
  );
});

test('participant file keys come only from the manifest and permit zero-byte objects', () => {
  const manifest: ParticipantManifest = {
    sample_sheet: { filename: 'sample_sheet.csv' },
    samples: [
      {
        files: {
          read_1: { filename: 'Sample_A_R1.fastq.gz' },
          read_2: { filename: 'Sample_A_R2.fastq.gz' },
        },
      },
      {
        files: {
          read_1: { filename: 'Sample_B_R1.fastq.gz' },
        },
      },
    ],
  };
  const prefix = 'releases/release/assembly/practice';
  assert.equal(
    participantObjectKey(manifest, prefix, 'Sample_A_R2.fastq.gz'),
    `${prefix}/files/Sample_A_R2.fastq.gz`,
  );
  assert.equal(
    participantObjectKey(manifest, prefix, 'sample_sheet.csv'),
    `${prefix}/sample_sheet.csv`,
  );
  assert.equal(participantObjectKey(manifest, prefix, 'Sample_B_R2.fastq.gz'), null);
  assert.equal(participantObjectKey(manifest, prefix, 'private/answer_key.json'), null);
  assert.equal(participantObjectKey(manifest, prefix, 'answer_key.json'), null);
});
