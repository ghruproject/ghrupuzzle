import { CHALLENGE_EXERCISES } from './admin-round-completion';
import {
  certificateVerificationUrl,
  createCertificatePublicCode,
  renderCertificate,
} from './certificate';
import { sendCertificateEmail } from './certificate-email';
import type { CloudflareEnv } from './cloudflare';

export class CertificateIssueError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export type CertificateIssueResult = {
  certificateId: string;
  publicCode: string;
  verificationUrl: string;
  alreadyIssued: boolean;
  emailStatus: 'sent' | 'skipped' | 'failed';
  emailError?: string;
};

export async function issueCertificate(
  env: CloudflareEnv,
  actorUserId: string | null,
  userId: string,
  roundId: string,
  supersedesId?: string,
): Promise<CertificateIssueResult> {
  const participant = await env.DB.prepare('SELECT id, name, email FROM user WHERE id = ?')
    .bind(userId)
    .first<{ id: string; name: string; email: string }>();
  const round = await env.DB.prepare(
    'SELECT id, title, closes_at FROM assessment_round WHERE id = ?',
  )
    .bind(roundId)
    .first<{ id: string; title: string; closes_at: string }>();
  if (!participant || !round) throw new CertificateIssueError('Participant or round not found', 404);
  if (new Date() <= new Date(round.closes_at)) {
    throw new CertificateIssueError('Certificates can only be issued after the round closes', 409);
  }

  const activeCertificate = await env.DB.prepare(
    `SELECT id, public_code, email_status FROM certificate
      WHERE user_id = ? AND round_id = ? AND revoked_at IS NULL
      LIMIT 1`,
  )
    .bind(userId, roundId)
    .first<{ id: string; public_code: string; email_status: string }>();
  if (activeCertificate && !supersedesId) {
    return {
      certificateId: activeCertificate.id,
      publicCode: activeCertificate.public_code,
      verificationUrl: certificateVerificationUrl(env.BETTER_AUTH_URL, activeCertificate.public_code),
      alreadyIssued: true,
      emailStatus: activeCertificate.email_status === 'not_sent' || activeCertificate.email_status === 'failed'
        ? 'failed'
        : 'skipped',
    };
  }
  if (supersedesId && activeCertificate?.id !== supersedesId) {
    throw new CertificateIssueError('Certificate selected for reissue is not the active certificate', 409);
  }

  const results = await env.DB.prepare(
    `SELECT d.exercise, MAX(sc.passed) AS passed
       FROM dataset_release d
       JOIN submission su ON su.release_id = d.id AND su.user_id = ?
       JOIN score sc ON sc.submission_id = su.id AND sc.provisional = 0
      WHERE d.round_id = ? AND d.mode = 'challenge'
      GROUP BY d.exercise`,
  )
    .bind(userId, roundId)
    .all<{ exercise: string; passed: number }>();
  const passed = new Set(
    results.results.filter((row) => Boolean(row.passed)).map((row) => row.exercise),
  );
  if (CHALLENGE_EXERCISES.some((exercise) => !passed.has(exercise))) {
    throw new CertificateIssueError('All four challenge exercises require a final passing score', 409);
  }
  const openReview = await env.DB.prepare(
    `SELECT rv.id
       FROM review rv
       JOIN submission s ON s.id = rv.submission_id
       JOIN dataset_release d ON d.id = s.release_id
      WHERE s.user_id = ? AND d.round_id = ?
        AND rv.status IN ('requested', 'in_review')
      LIMIT 1`,
  ).bind(userId, roundId).first();
  if (openReview) throw new CertificateIssueError('An open review must be resolved first', 409);

  const publicCode = createCertificatePublicCode();
  const certificateId = crypto.randomUUID();
  const issuedAt = new Date().toISOString();
  const verificationUrl = certificateVerificationUrl(env.BETTER_AUTH_URL, publicCode);
  const participantName = participant.name.trim() || participant.email;
  const snapshot = {
    participantName,
    roundTitle: round.title,
    exercises: [...CHALLENGE_EXERCISES],
    results: results.results,
    issuedAt,
  };
  const pdf = await renderCertificate({
    participantName,
    roundTitle: round.title,
    issuedAt,
    verificationUrl,
    publicCode,
  });
  const objectKey = `certificates/${roundId}/${certificateId}.pdf`;
  await env.PRIVATE_ASSETS.put(objectKey, pdf, {
    httpMetadata: { contentType: 'application/pdf' },
    customMetadata: { certificateId, publicCode },
  });
  try {
    const statements = [];
    if (supersedesId) {
      statements.push(env.DB.prepare(
        `UPDATE certificate
            SET revoked_at = CURRENT_TIMESTAMP, revocation_reason = 'Reissued'
          WHERE id = ? AND user_id = ? AND round_id = ? AND revoked_at IS NULL`,
      ).bind(supersedesId, userId, roundId));
    }
    statements.push(
      env.DB.prepare(
        `INSERT INTO certificate
           (id, public_code, user_id, round_id, issued_at, supersedes_id,
            pdf_object_key, snapshot_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        certificateId,
        publicCode,
        userId,
        roundId,
        issuedAt,
        supersedesId ?? null,
        objectKey,
        JSON.stringify(snapshot),
      ),
      env.DB.prepare(
        `INSERT INTO audit_event
           (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, ?, 'certificate.issued', 'certificate', ?, ?)`,
      ).bind(crypto.randomUUID(), actorUserId, certificateId, JSON.stringify(snapshot)),
    );
    await env.DB.batch(statements);
  } catch (error) {
    await env.PRIVATE_ASSETS.delete(objectKey);
    const concurrent = await env.DB.prepare(
      `SELECT id, public_code, email_status FROM certificate
        WHERE user_id = ? AND round_id = ? AND revoked_at IS NULL LIMIT 1`,
    ).bind(userId, roundId).first<{ id: string; public_code: string; email_status: string }>();
    if (concurrent && !supersedesId) {
      return {
        certificateId: concurrent.id,
        publicCode: concurrent.public_code,
        verificationUrl: certificateVerificationUrl(env.BETTER_AUTH_URL, concurrent.public_code),
        alreadyIssued: true,
        emailStatus: 'skipped',
      };
    }
    throw error;
  }

  const email = await sendCertificateEmail(env, actorUserId, {
    certificateId,
    publicCode,
    participantName,
    participantEmail: participant.email,
    roundTitle: round.title,
  });
  return {
    certificateId,
    publicCode,
    verificationUrl,
    alreadyIssued: false,
    emailStatus: email.sent ? 'sent' : email.skipped ? 'skipped' : 'failed',
    emailError: email.error,
  };
}
