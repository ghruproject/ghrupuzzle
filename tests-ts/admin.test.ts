import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminRoundPhase,
  certificateCandidateStatus,
  normaliseAdministratorEmail,
  parseInvitationList,
} from '../lib/admin-helpers';
import {
  hasAdministratorAccess,
  requireRole,
  type AuthenticatedUser,
} from '../lib/assessment';

test('admin round phase follows the configured challenge window', () => {
  const round = {
    opens_at: '2026-08-17T00:00:00Z',
    closes_at: '2026-08-31T23:59:00Z',
  };

  assert.equal(adminRoundPhase(round, new Date('2026-08-01T12:00:00Z')), 'Upcoming');
  assert.equal(adminRoundPhase(round, new Date('2026-08-20T12:00:00Z')), 'Open');
  assert.equal(adminRoundPhase(round, new Date('2026-09-01T00:00:00Z')), 'Closed');
});

test('administrator email addresses are normalised and validated', () => {
  assert.equal(
    normaliseAdministratorEmail(' Nabil@HappyKhan.com '),
    'nabil@happykhan.com',
  );
  assert.equal(normaliseAdministratorEmail('not-an-email'), null);
  assert.equal(normaliseAdministratorEmail('missing-domain@'), null);
});

test('administrator authority comes from the email allowlist', async () => {
  const user: AuthenticatedUser = {
    id: 'user-1',
    name: 'Nabil',
    email: 'NABIL@HAPPYKHAN.COM',
  };
  const db = permissionDatabase({
    administratorEmails: ['nabil@happykhan.com'],
    reviewerUserIds: [],
  });

  assert.equal(
    await hasAdministratorAccess(db, user.email),
    true,
  );
  await assert.doesNotReject(() =>
    requireRole(db, user, ['administrator']),
  );

  const previousRoleOnly = permissionDatabase({
    administratorEmails: [],
    reviewerUserIds: [],
  });
  await assert.rejects(
    () => requireRole(previousRoleOnly, user, ['administrator']),
    (error) => error instanceof Response && error.status === 403,
  );
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

function permissionDatabase({
  administratorEmails,
  reviewerUserIds,
}: {
  administratorEmails: string[];
  reviewerUserIds: string[];
}): D1Database {
  return {
    prepare(query: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first() {
              if (query.includes('administrator_email')) {
                const email = String(values[0]).toLowerCase();
                return administratorEmails.includes(email) ? { email } : null;
              }
              const userId = String(values[0]);
              return reviewerUserIds.includes(userId)
                ? { role: 'reviewer' }
                : null;
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}
