import assert from 'node:assert/strict';
import test from 'node:test';
import { authCallbackURL } from '../lib/auth-navigation';

test('authentication callbacks omit fragments rejected by Better Auth', () => {
  assert.equal(authCallbackURL('/dashboard#challenge-status'), '/dashboard');
  assert.equal(
    authCallbackURL('/dashboard?round=challenge-2#challenge-status'),
    '/dashboard?round=challenge-2',
  );
});

test('authentication callbacks preserve ordinary internal destinations', () => {
  assert.equal(authCallbackURL('/admin'), '/admin');
  assert.equal(authCallbackURL('/dashboard'), '/dashboard');
  assert.equal(authCallbackURL('#challenge-status'), '/dashboard');
});
