import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activeEnrolledChallenge,
  partitionSubmissionHistory,
  selectDashboardRound,
  submissionStatusLabel,
  type DashboardRound,
  type DashboardSubmission,
} from '../lib/dashboard';

const upcomingRound: DashboardRound = {
  id: 'round-2',
  slug: 'challenge-2',
  title: 'Challenge 2',
  registration_mode: 'open',
  registration_opens_at: null,
  opens_at: '2026-08-16T23:00:00Z',
  closes_at: '2026-08-31T22:59:59Z',
  status: 'published',
  enrolment_status: 'active',
};

function submission(
  overrides: Partial<DashboardSubmission>,
): DashboardSubmission {
  return {
    id: 'submission-1',
    release_id: 'release-1',
    attempt_number: 1,
    original_filename: 'results.csv',
    submitted_at: '2026-07-20T10:00:00Z',
    status: 'scored',
    provisional: 0,
    exercise: 'typing',
    mode: 'practice',
    passed: 1,
    earned: 10,
    possible: 10,
    ...overrides,
  };
}

test('dashboard selects the current round and only activates enrolled open rounds', () => {
  assert.equal(
    selectDashboardRound(
      [upcomingRound],
      new Date('2026-07-24T12:00:00Z'),
    )?.id,
    'round-2',
  );
  assert.equal(
    activeEnrolledChallenge(
      [upcomingRound],
      new Date('2026-07-24T12:00:00Z'),
    ),
    null,
  );
  assert.equal(
    activeEnrolledChallenge(
      [upcomingRound],
      new Date('2026-08-20T12:00:00Z'),
    )?.id,
    'round-2',
  );
});

test('submission history keeps the latest attempt for each exercise and mode', () => {
  const history = partitionSubmissionHistory([
    submission({ id: 'old', attempt_number: 1 }),
    submission({
      id: 'new',
      attempt_number: 2,
      submitted_at: '2026-07-21T10:00:00Z',
    }),
    submission({
      id: 'challenge',
      mode: 'challenge',
      submitted_at: '2026-07-19T10:00:00Z',
    }),
  ]);

  assert.deepEqual(
    history.latest.map((item) => item.id),
    ['new', 'challenge'],
  );
  assert.deepEqual(history.earlier.map((item) => item.id), ['old']);
});

test('submission statuses are presented as participant-facing labels', () => {
  assert.equal(submissionStatusLabel(submission({})), 'Passed');
  assert.equal(
    submissionStatusLabel(submission({ status: 'flagged' })),
    'Under review',
  );
  assert.equal(
    submissionStatusLabel(submission({ status: 'reviewed' })),
    'Reviewed',
  );
  assert.equal(
    submissionStatusLabel(submission({ provisional: 1 })),
    'Submitted',
  );
});
