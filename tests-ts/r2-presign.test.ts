import assert from 'node:assert/strict';
import test from 'node:test';
import { presignParticipantR2Object, publicR2ObjectUrl } from '../lib/r2-presign';

const signingEnv = {
  PRIVATE_R2_ACCESS_KEY_ID: 'test-access-key',
  PRIVATE_R2_SECRET_ACCESS_KEY: 'test-secret-key',
  PRIVATE_R2_ENDPOINT_URL: 'https://account-id.r2.cloudflarestorage.com',
  PRIVATE_R2_BUCKET_NAME: 'ghrupuzzle-private',
};

test('challenge participant objects receive direct expiring R2 URLs', async () => {
  const signed = await presignParticipantR2Object(
    signingEnv,
    'releases/challenge-2-typing/typing/challenge/files/Sample 1.fasta',
    3600,
  );
  const url = new URL(signed);
  assert.equal(url.hostname, 'account-id.r2.cloudflarestorage.com');
  assert.match(url.pathname, /ghrupuzzle-private\/releases\/challenge-2-typing/);
  assert.equal(url.searchParams.get('X-Amz-Expires'), '3600');
  assert.equal(url.searchParams.get('X-Amz-Algorithm'), 'AWS4-HMAC-SHA256');
  assert.ok(url.searchParams.get('X-Amz-Signature'));
});

test('practice object URLs are derived from the configured R2 origin and approved key', () => {
  assert.equal(
    publicR2ObjectUrl(
      'https://public-bucket.r2.dev/',
      'releases/practice outbreak/files/Sample 1_R1.fastq.gz',
    ),
    'https://public-bucket.r2.dev/releases/practice%20outbreak/files/Sample%201_R1.fastq.gz',
  );
});

test('private answers and scoring policies cannot be presigned', async () => {
  for (const key of [
    'releases/challenge/private/answer_key.json',
    'releases/challenge/private/scoring_policy.json',
  ]) {
    await assert.rejects(
      presignParticipantR2Object(signingEnv, key),
      /Private assessment contracts cannot be presigned/,
    );
  }
});
