import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normaliseRegistrationEmail,
  registrationErrorMessage,
} from '../lib/registration';

test('registration normalises pasted email addresses', () => {
  assert.equal(
    normaliseRegistrationEmail('  KTabi@Noguchi.UG.edu.GH \n'),
    'ktabi@noguchi.ug.edu.gh',
  );
});

test('registration reports common account creation errors clearly', () => {
  assert.equal(
    registrationErrorMessage({ code: 'PASSWORD_TOO_SHORT', message: 'Password too short' }),
    'Use at least 12 characters for the password.',
  );
  assert.equal(
    registrationErrorMessage({ code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' }),
    'An account already exists for this email address. Sign in or reset your password.',
  );
  assert.equal(
    registrationErrorMessage({ status: 429 }),
    'Too many signup attempts. Wait one minute and try again.',
  );
});

test('registration does not expose unexpected server errors', () => {
  assert.equal(
    registrationErrorMessage({ message: 'Database binding failed: secret detail' }),
    'That account could not be created. Try again, or contact a GHRU Puzzles administrator if the problem continues.',
  );
});
