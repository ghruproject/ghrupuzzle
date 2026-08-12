import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const authSource = readFileSync(new URL('../lib/auth.ts', import.meta.url), 'utf8');
const signInSource = readFileSync(
  new URL('../components/sign-in-form.tsx', import.meta.url),
  'utf8',
);
const registrationSource = readFileSync(
  new URL('../components/registration-form.tsx', import.meta.url),
  'utf8',
);
const invitationSource = readFileSync(
  new URL('../app/api/admin/invitations/route.ts', import.meta.url),
  'utf8',
);
const enrolmentSource = readFileSync(
  new URL('../app/api/rounds/[id]/enrol/route.ts', import.meta.url),
  'utf8',
);
const forgotPasswordSource = readFileSync(
  new URL('../components/forgot-password-form.tsx', import.meta.url),
  'utf8',
);
const resetPasswordSource = readFileSync(
  new URL('../components/reset-password-form.tsx', import.meta.url),
  'utf8',
);

test('new participants receive a prominent self-registration route', () => {
  assert.match(signInSource, /New participant\?/);
  assert.match(signInSource, /href=\{`\/register\?returnTo=/);
  assert.match(registrationSource, /authClient\.signUp\.email/);
  assert.doesNotMatch(signInSource, /No emailed link or\s+administrator code is needed/);
  assert.doesNotMatch(registrationSource, /No confirmation email/);
  assert.doesNotMatch(registrationSource, /setup code/i);
});

test('participants can request and complete password recovery with an administrator fallback', () => {
  assert.match(authSource, /sendResetPassword/);
  assert.match(authSource, /resetPasswordTokenExpiresIn: 60 \* 60/);
  assert.match(authSource, /const now = Date\.now\(\)/);
  assert.match(authSource, /UPDATE user SET emailVerified = 1/);
  assert.match(authSource, /'\/request-password-reset': \{ window: 60, max: 3 \}/);
  assert.match(signInSource, /href="\/forgot-password"/);
  assert.match(forgotPasswordSource, /\/api\/auth\/request-password-reset/);
  assert.match(forgotPasswordSource, /nabil\.alikhan@cgps\.group/);
  assert.match(forgotPasswordSource, /If an account matches that address/);
  assert.match(resetPasswordSource, /\/api\/auth\/reset-password/);
  assert.match(resetPasswordSource, /The passwords do not match/);
});

test('password registration is rate-limited and protects administrator addresses', () => {
  assert.match(authSource, /disableSignUp: false/);
  assert.match(authSource, /'\/sign-up\/email': \{ window: 60, max: 3 \}/);
  assert.match(authSource, /isAdministratorEmailReserved/);
  assert.match(authSource, /context\?\.path === '\/sign-up\/email'/);
});

test('invitation imports reserve accounts and restricted enrolment requires confirmation', () => {
  assert.match(invitationSource, /INSERT INTO user/);
  assert.match(invitationSource, /ON CONFLICT\(email\) DO NOTHING/);
  assert.match(enrolmentSource, /isAccountEmailVerified/);
  assert.match(enrolmentSource, /if \(!accountConfirmed\)/);
  assert.match(enrolmentSource, /const openingReminder = accountConfirmed/);
});
