import { issueCertificate } from './certificate-issuance';
import type { CloudflareEnv } from './cloudflare';

type ClosedRound = { id: string };
type EligibleParticipant = { user_id: string; round_id: string };

export async function processAutomaticCertificates(
  env: CloudflareEnv,
  now = new Date(),
): Promise<{ finalisedScores: number; issued: number; failed: number }> {
  const timestamp = now.toISOString();
  const rounds = await env.DB.prepare(
    `SELECT DISTINCT r.id
       FROM assessment_round r
       JOIN dataset_release d ON d.round_id = r.id AND d.mode = 'challenge'
       JOIN submission s ON s.release_id = d.id
       JOIN score sc ON sc.submission_id = s.id
      WHERE datetime(r.closes_at) < datetime(?) AND sc.provisional = 1`,
  ).bind(timestamp).all<ClosedRound>();

  let finalisedScores = 0;
  for (const round of rounds.results) {
    const result = await env.DB.prepare(
      `UPDATE score SET provisional = 0
        WHERE provisional = 1
          AND submission_id IN (
            SELECT s.id
              FROM submission s
              JOIN dataset_release d ON d.id = s.release_id
             WHERE d.round_id = ?
               AND NOT EXISTS (
                 SELECT 1 FROM review rv
                  WHERE rv.submission_id = s.id
                    AND rv.status IN ('requested', 'in_review')
               )
          )`,
    ).bind(round.id).run();
    finalisedScores += result.meta.changes;
    if (result.meta.changes) {
      await env.DB.prepare(
        `INSERT INTO audit_event
           (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, NULL, 'round.scores_auto_finalized', 'assessment_round', ?, ?)`,
      ).bind(crypto.randomUUID(), round.id, JSON.stringify({ changed: result.meta.changes })).run();
    }
  }

  const eligible = await env.DB.prepare(
    `SELECT e.user_id, e.round_id
       FROM enrolment e
       JOIN assessment_round r ON r.id = e.round_id
      WHERE e.status = 'active' AND datetime(r.closes_at) < datetime(?)
        AND NOT EXISTS (
          SELECT 1 FROM certificate c
           WHERE c.user_id = e.user_id AND c.round_id = e.round_id
             AND c.revoked_at IS NULL
        )
        AND NOT EXISTS (
          SELECT 1 FROM review rv
          JOIN submission s ON s.id = rv.submission_id
          JOIN dataset_release d ON d.id = s.release_id
           WHERE s.user_id = e.user_id AND d.round_id = e.round_id
             AND rv.status IN ('requested', 'in_review')
        )
        AND 4 = (
          SELECT COUNT(DISTINCT d.exercise)
            FROM dataset_release d
            JOIN submission s ON s.release_id = d.id AND s.user_id = e.user_id
            JOIN score sc ON sc.submission_id = s.id
           WHERE d.round_id = e.round_id AND d.mode = 'challenge'
             AND sc.passed = 1 AND sc.provisional = 0
        )
      ORDER BY r.closes_at, e.enrolled_at
      LIMIT 50`,
  ).bind(timestamp).all<EligibleParticipant>();

  let issued = 0;
  let failed = 0;
  for (const participant of eligible.results) {
    try {
      const result = await issueCertificate(
        env,
        null,
        participant.user_id,
        participant.round_id,
      );
      if (!result.alreadyIssued) issued += 1;
    } catch (error) {
      failed += 1;
      console.error('Automatic certificate issuance failed', error);
    }
  }
  return { finalisedScores, issued, failed };
}
