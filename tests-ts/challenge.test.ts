import assert from 'node:assert/strict';
import test from 'node:test';
import {
  challengeDateLabel,
  challengePhase,
  selectFeaturedChallenge,
  toPublicChallengeRound,
  type ChallengeRoundRecord,
} from '../lib/challenge';

const challengeTwo: ChallengeRoundRecord = {
  id: 'round-2',
  slug: 'challenge-2',
  title: 'Challenge 2',
  registration_mode: 'open',
  registration_opens_at: '2026-07-23T00:00:00Z',
  opens_at: '2026-08-16T23:00:00Z',
  closes_at: '2026-08-31T22:59:59Z',
  status: 'published',
};

test('challenge dates match the published August 2026 window', () => {
  assert.equal(challengeDateLabel(challengeTwo), '17–31 August 2026');
  assert.equal(challengePhase(challengeTwo, new Date('2026-08-16T22:59:59Z')), 'upcoming');
  assert.equal(challengePhase(challengeTwo, new Date('2026-08-16T23:00:00Z')), 'open');
  assert.equal(challengePhase(challengeTwo, new Date('2026-08-31T22:59:59Z')), 'open');
  assert.equal(challengePhase(challengeTwo, new Date('2026-08-31T23:00:00Z')), 'closed');
});

test('featured challenge prefers an open round then the next upcoming round', () => {
  const now = new Date('2026-08-20T12:00:00Z');
  const open = toPublicChallengeRound(challengeTwo, now);
  const later = toPublicChallengeRound(
    {
      ...challengeTwo,
      id: 'round-3',
      slug: 'challenge-3',
      title: 'Challenge 3',
      opens_at: '2026-11-01T00:00:00Z',
      closes_at: '2026-11-14T23:59:59Z',
    },
    now,
  );
  assert.equal(selectFeaturedChallenge([open, later])?.title, 'Challenge 2');
  assert.equal(selectFeaturedChallenge([later])?.title, 'Challenge 3');
});
