import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';
import type {
  AdminAuditEvent,
  AdminCertificate,
  AdminCertificateCandidate,
  AdminOverview,
  AdminParticipant,
  AdminRelease,
  AdminRound,
  AdminStats,
} from '@/lib/admin';

export async function GET(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const actor = await requireUser(request);
    await requireRole(env.DB, actor.id, ['administrator']);

    const [
      stats,
      rounds,
      releases,
      participants,
      certificateCandidates,
      certificates,
      auditEvents,
    ] = await Promise.all([
      env.DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM user) AS participants,
           (SELECT COUNT(*) FROM enrolment WHERE status = 'active') AS active_enrolments,
           (SELECT COUNT(*) FROM submission) AS submissions,
           (SELECT COUNT(*) FROM review WHERE status IN ('requested', 'in_review')) AS open_reviews,
           (SELECT COUNT(*) FROM dataset_release WHERE published_at IS NOT NULL) AS registered_releases,
           (SELECT COUNT(*) FROM certificate WHERE revoked_at IS NULL) AS active_certificates`,
      ).first<Record<string, unknown>>(),
      env.DB.prepare(
        `SELECT r.id, r.slug, r.title, r.registration_mode, r.registration_opens_at,
                r.opens_at, r.closes_at, r.answers_release_at, r.grace_seconds, r.status,
                (SELECT COUNT(*) FROM enrolment e
                  WHERE e.round_id = r.id AND e.status = 'active') AS active_enrolments,
                (SELECT COUNT(*) FROM invitation i WHERE i.round_id = r.id) AS invitations,
                (SELECT COUNT(*) FROM dataset_release d WHERE d.round_id = r.id) AS releases,
                (SELECT COUNT(*) FROM submission s
                  JOIN dataset_release d ON d.id = s.release_id
                  WHERE d.round_id = r.id) AS submissions,
                (SELECT COUNT(*) FROM review rv
                  JOIN submission s ON s.id = rv.submission_id
                  JOIN dataset_release d ON d.id = s.release_id
                  WHERE d.round_id = r.id
                    AND rv.status IN ('requested', 'in_review')) AS open_reviews,
                (SELECT COUNT(*) FROM score sc
                  JOIN submission s ON s.id = sc.submission_id
                  JOIN dataset_release d ON d.id = s.release_id
                  WHERE d.round_id = r.id AND sc.provisional = 1) AS provisional_scores
           FROM assessment_round r
          ORDER BY r.opens_at DESC`,
      ).all<AdminRound>(),
      env.DB.prepare(
        `SELECT d.id, d.release_id, d.exercise, d.mode, d.schema_version,
                d.published_at, d.round_id, r.title AS round_title,
                COUNT(s.id) AS submissions
           FROM dataset_release d
           LEFT JOIN assessment_round r ON r.id = d.round_id
           LEFT JOIN submission s ON s.release_id = d.id
          GROUP BY d.id
          ORDER BY d.published_at DESC, d.release_id`,
      ).all<AdminRelease>(),
      env.DB.prepare(
        `SELECT u.id, u.name, u.email, u.createdAt AS created_at,
                GROUP_CONCAT(DISTINCT ur.role) AS roles,
                COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.round_id END) AS active_enrolments,
                COUNT(DISTINCT s.id) AS submissions,
                MAX(s.submitted_at) AS last_submission_at
           FROM user u
           LEFT JOIN user_role ur ON ur.user_id = u.id
           LEFT JOIN enrolment e ON e.user_id = u.id
           LEFT JOIN submission s ON s.user_id = u.id
          GROUP BY u.id
          ORDER BY u.createdAt DESC
          LIMIT 500`,
      ).all<AdminParticipant>(),
      env.DB.prepare(
        `SELECT u.id AS user_id, u.name AS participant_name,
                u.email AS participant_email, r.id AS round_id,
                r.title AS round_title,
                COUNT(DISTINCT CASE
                  WHEN sc.passed = 1 AND sc.provisional = 0 THEN d.exercise
                END) AS passed_exercises,
                COUNT(DISTINCT CASE
                  WHEN rv.status IN ('requested', 'in_review') THEN rv.id
                END) AS open_reviews,
                MAX(CASE WHEN c.revoked_at IS NULL THEN c.id END) AS active_certificate_id
           FROM enrolment e
           JOIN user u ON u.id = e.user_id
           JOIN assessment_round r ON r.id = e.round_id
           LEFT JOIN dataset_release d ON d.round_id = r.id AND d.mode = 'challenge'
           LEFT JOIN submission s ON s.release_id = d.id AND s.user_id = u.id
           LEFT JOIN score sc ON sc.submission_id = s.id
           LEFT JOIN review rv ON rv.submission_id = s.id
           LEFT JOIN certificate c ON c.user_id = u.id AND c.round_id = r.id
          WHERE e.status = 'active' AND datetime(r.closes_at) < datetime('now')
          GROUP BY u.id, r.id
          ORDER BY r.closes_at DESC, u.name, u.email`,
      ).all<AdminCertificateCandidate>(),
      env.DB.prepare(
        `SELECT c.id, c.public_code, c.issued_at, c.revoked_at,
                c.revocation_reason, c.user_id, u.name AS participant_name,
                u.email AS participant_email, c.round_id,
                r.title AS round_title
           FROM certificate c
           JOIN user u ON u.id = c.user_id
           JOIN assessment_round r ON r.id = c.round_id
          ORDER BY c.issued_at DESC
          LIMIT 250`,
      ).all<AdminCertificate>(),
      env.DB.prepare(
        `SELECT a.id, a.action, a.target_type, a.target_id, a.created_at,
                u.name AS actor_name, u.email AS actor_email
           FROM audit_event a
           LEFT JOIN user u ON u.id = a.actor_user_id
          ORDER BY a.created_at DESC
          LIMIT 50`,
      ).all<AdminAuditEvent>(),
    ]);

    const statsRow = stats ?? {};
    const overview: AdminOverview = {
      stats: {
        participants: Number(statsRow.participants ?? 0),
        activeEnrolments: Number(statsRow.active_enrolments ?? 0),
        submissions: Number(statsRow.submissions ?? 0),
        openReviews: Number(statsRow.open_reviews ?? 0),
        registeredReleases: Number(statsRow.registered_releases ?? 0),
        activeCertificates: Number(statsRow.active_certificates ?? 0),
      } satisfies AdminStats,
      rounds: rounds.results,
      releases: releases.results,
      participants: participants.results,
      certificateCandidates: certificateCandidates.results,
      certificates: certificates.results,
      auditEvents: auditEvents.results,
    };
    return Response.json(overview);
  } catch (error) {
    return jsonError(error);
  }
}
