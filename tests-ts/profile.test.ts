import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultNameFromEmail } from '../lib/profile';

test('defaultNameFromEmail uses the local part when no participant name is available', () => {
  assert.equal(defaultNameFromEmail('alex.smith@example.org'), 'alex.smith');
});

test('defaultNameFromEmail handles malformed or empty values safely', () => {
  assert.equal(defaultNameFromEmail('participant'), 'participant');
  assert.equal(defaultNameFromEmail(''), 'Participant');
});
