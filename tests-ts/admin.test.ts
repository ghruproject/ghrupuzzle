import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminRoundPhase,
  certificateCandidateStatus,
  parseInvitationList,
} from '../lib/admin-helpers';

test('admin round phase follows the configured challenge window', () => {
  const round = {
    opens_at: '2026-08-17T00:00:00Z',
    closes_at: '2026-08-31T23:59:00Z',
  };

  assert.equal(adminRoundPhase(round, new Date('2026-08-01T12:00:00Z')), 'Upcoming');
  assert.equal(adminRoundPhase(round, new Date('2026-08-20T12:00:00Z')), 'Open');
  assert.equal(adminRoundPhase(round, new Date('2026-09-01T00:00:00Z')), 'Closed');
});

test('certificate eligibility prioritises active certificates and open reviews', () => {
  assert.equal(
    certificateCandidateStatus({
      passed_exercises: 4,
      open_reviews: 0,
      active_certificate_id: 'certificate-1',
    }),
    'Issued',
  );
  assert.equal(
    certificateCandidateStatus({
      passed_exercises: 4,
      open_reviews: 1,
      active_certificate_id: null,
    }),
    'Review pending',
  );
  assert.equal(
    certificateCandidateStatus({
      passed_exercises: 4,
      open_reviews: 0,
      active_certificate_id: null,
    }),
    'Ready to issue',
  );
  assert.equal(
    certificateCandidateStatus({
      passed_exercises: 3,
      open_reviews: 0,
      active_certificate_id: null,
    }),
    'Results incomplete',
  );
});

test('invitation import accepts email or email,name and normalises addresses', () => {
  assert.deepEqual(
    parseInvitationList(
      ' Alex@example.org, Alex Morgan\nsam@example.org\n',
    ),
    [
      { email: 'alex@example.org', name: 'Alex Morgan' },
      { email: 'sam@example.org' },
    ],
  );
  assert.throws(
    () => parseInvitationList('not-an-email'),
    /Invalid email address/,
  );
  assert.throws(() => parseInvitationList(' \n '), /at least one email/);
});
