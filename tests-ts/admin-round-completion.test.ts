import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRoundParticipant } from '../lib/admin-round-completion';

const releases = [
  { id: 'release-typing', release_id: 'challenge-typing', exercise: 'typing' as const },
  { id: 'release-assembly', release_id: 'challenge-assembly', exercise: 'assembly' as const },
  { id: 'release-hybrid', release_id: 'challenge-hybrid', exercise: 'hybrid' as const },
  { id: 'release-outbreak', release_id: 'challenge-outbreak', exercise: 'outbreak' as const },
];

const enrollee = {
  user_id: 'user-1',
  name: 'Participant One',
  email: 'participant@example.org',
  enrolled_at: '2026-08-17T00:00:00Z',
  is_administrator: 0,
  active_certificate_id: null,
  certificate_code: null,
};

function submission(
  exercise: (typeof releases)[number]['exercise'],
  overrides: Partial<{
    id: string;
    status: string;
    score_id: string | null;
    passed: number | null;
    provisional: number | null;
    open_reviews: number;
  }> = {},
) {
  return {
    id: overrides.id ?? `submission-${exercise}`,
    user_id: enrollee.user_id,
    exercise,
    release_id: `challenge-${exercise}`,
    submitted_at: '2026-08-20T12:00:00Z',
    status: overrides.status ?? 'scored',
    score_id: overrides.score_id === undefined ? `score-${exercise}` : overrides.score_id,
    passed: overrides.passed ?? 1,
    provisional: overrides.provisional ?? 1,
    open_reviews: overrides.open_reviews ?? 0,
  };
}

test('four valid provisional results are complete but not certificate eligible', () => {
  const participant = buildRoundParticipant(
    enrollee,
    releases,
    releases.map((release) => submission(release.exercise)),
    true,
  );

  assert.equal(participant.completedExercises, 4);
  assert.equal(participant.passedExercises, 0);
  assert.equal(participant.overallStatus, 'Awaiting finalisation');
  assert.equal(participant.eligible, false);
});

test('four final passes after closing are certificate eligible', () => {
  const participant = buildRoundParticipant(
    enrollee,
    releases,
    releases.map((release) => submission(release.exercise, { provisional: 0 })),
    true,
  );

  assert.equal(participant.passedExercises, 4);
  assert.equal(participant.overallStatus, 'Eligible');
  assert.equal(participant.eligible, true);
});

test('invalid submissions do not count as completion', () => {
  const participant = buildRoundParticipant(
    enrollee,
    releases,
    [submission('typing', { status: 'invalid', score_id: null, passed: null, provisional: null })],
    true,
  );

  assert.equal(participant.completedExercises, 0);
  assert.equal(participant.overallStatus, 'Not started');
  assert.equal(participant.exercises[0].status, 'Not submitted');
});

test('open reviews block certificate eligibility even after final passes', () => {
  const submissions = releases.map((release) => submission(release.exercise, { provisional: 0 }));
  submissions[0] = submission('typing', { provisional: 0, open_reviews: 1 });
  const participant = buildRoundParticipant(enrollee, releases, submissions, true);

  assert.equal(participant.overallStatus, 'Review pending');
  assert.equal(participant.eligible, false);
});

test('an existing active certificate takes precedence over result state', () => {
  const participant = buildRoundParticipant(
    { ...enrollee, active_certificate_id: 'certificate-1', certificate_code: 'public-code' },
    releases,
    releases.map((release) => submission(release.exercise, { provisional: 0 })),
    true,
  );

  assert.equal(participant.overallStatus, 'Issued');
  assert.equal(participant.eligible, false);
  assert.equal(participant.certificateCode, 'public-code');
});
