import {
  selectFeaturedChallenge,
  toPublicChallengeRound,
  type ChallengeRoundRecord,
  type PublicChallengeSchedule,
} from './challenge';

export async function loadPublicChallengeSchedule(
  database: D1Database,
  now = new Date(),
): Promise<PublicChallengeSchedule> {
  const result = await database
    .prepare(
      `SELECT id, slug, title, registration_mode, registration_opens_at,
              opens_at, closes_at, status
         FROM assessment_round
        WHERE status IN ('published', 'closed')
        ORDER BY opens_at ASC`,
    )
    .all<ChallengeRoundRecord>();
  const rounds = result.results.map((round) => toPublicChallengeRound(round, now));
  return {
    featured: selectFeaturedChallenge(rounds),
    rounds,
  };
}
