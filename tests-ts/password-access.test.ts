import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPasswordSetupCode,
  hashPasswordSetupCode,
  isPasswordSetupOriginAllowed,
  normalisePasswordSetupCode,
  normaliseSignInEmail,
  passwordSetupExpiry,
  passwordSetupRateLimitKey,
  validateParticipantPassword,
} from '../lib/password-access';

test('password setup codes are high-entropy, readable and unique', () => {
  const codes = new Set(Array.from({ length: 100 }, createPasswordSetupCode));
  assert.equal(codes.size, 100);
  for (const code of codes) {
    assert.match(code, /^[2-9A-HJ-NP-Z]{4}(?:-[2-9A-HJ-NP-Z]{4}){3}$/);
    assert.doesNotMatch(code, /[01IO]/);
  }
});

test('setup code hashing ignores harmless formatting differences', async () => {
  const code = 'ABCD-EFGH-JKLM-NPQR';
  assert.equal(normalisePasswordSetupCode(` ${code.toLowerCase()} `), 'ABCDEFGHJKLMNPQR');
  assert.equal(
    await hashPasswordSetupCode(code),
    await hashPasswordSetupCode('abcd efgh jklm npqr'),
  );
  assert.match(await hashPasswordSetupCode(code), /^[0-9a-f]{64}$/);
});

test('participant passwords use length-based validation', () => {
  assert.match(validateParticipantPassword('too-short') ?? '', /at least 12/);
  assert.equal(validateParticipantPassword('a useful long passphrase'), null);
  assert.match(validateParticipantPassword('x'.repeat(129)) ?? '', /no more than 128/);
});

test('sign-in email normalisation rejects malformed addresses', () => {
  assert.equal(normaliseSignInEmail(' Participant@Example.org '), 'participant@example.org');
  assert.equal(normaliseSignInEmail('not-an-email'), null);
});

test('setup codes expire 24 hours after creation', () => {
  assert.equal(
    passwordSetupExpiry(new Date('2026-08-11T12:00:00.000Z')),
    '2026-08-12T12:00:00.000Z',
  );
});

test('password setup accepts the public site origin through an internal worker URL', () => {
  assert.equal(
    isPasswordSetupOriginAllowed(
      'https://ghrupuzzle.vercel.app',
      'https://ghrupuzzle.vercel.app/',
    ),
    true,
  );
  assert.equal(
    isPasswordSetupOriginAllowed(
      'https://attacker.example',
      'https://ghrupuzzle.vercel.app/',
    ),
    false,
  );
  assert.equal(
    isPasswordSetupOriginAllowed('not a URL', 'https://ghrupuzzle.vercel.app/'),
    false,
  );
});

test('setup rate-limit keys hide the participant and network address', async () => {
  const request = new Request('https://ghrupuzzle.vercel.app/api/password/setup', {
    headers: { 'cf-connecting-ip': '192.0.2.5' },
  });
  const first = await passwordSetupRateLimitKey(
    'test-secret',
    request,
    'participant@example.org',
    Date.parse('2026-08-11T12:00:00.000Z'),
  );
  const sameBucket = await passwordSetupRateLimitKey(
    'test-secret',
    request,
    'participant@example.org',
    Date.parse('2026-08-11T12:10:00.000Z'),
  );
  const nextBucket = await passwordSetupRateLimitKey(
    'test-secret',
    request,
    'participant@example.org',
    Date.parse('2026-08-11T12:16:00.000Z'),
  );
  assert.equal(first, sameBucket);
  assert.notEqual(first, nextBucket);
  assert.doesNotMatch(first, /participant|example|192\.0\.2\.5/);
});
