import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';
import { renderCertificate } from '@/lib/certificate';

const REQUIRED_EXERCISES = new Set(['typing', 'assembly', 'hybrid', 'outbreak']);

export async function POST(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const actor = await requireUser(request);
    await requireRole(env.DB, actor.id, ['administrator']);
    const body = (await request.json()) as {
      userId?: string;
      roundId?: string;
      supersedesId?: string;
    };
    if (!body.userId || !body.roundId) {
      return Response.json({ error: 'userId and roundId are required' }, { status: 400 });
    }
    const participant = await env.DB.prepare('SELECT id, name, email FROM user WHERE id = ?')
      .bind(body.userId)
      .first<{ id: string; name: string; email: string }>();
    const round = await env.DB.prepare(
      'SELECT id, title, closes_at FROM assessment_round WHERE id = ?',
    )
      .bind(body.roundId)
      .first<{ id: string; title: string; closes_at: string }>();
    if (!participant || !round) {
      return Response.json({ error: 'Participant or round not found' }, { status: 404 });
    }
    if (new Date() <= new Date(round.closes_at)) {
      return Response.json({ error: 'Certificates can only be issued after the round closes' }, { status: 409 });
    }
    const results = await env.DB.prepare(
      `SELECT d.exercise, MAX(sc.passed) AS passed
         FROM dataset_release d
         JOIN submission su ON su.release_id = d.id AND su.user_id = ?
         JOIN score sc ON sc.submission_id = su.id AND sc.provisional = 0
        WHERE d.round_id = ? AND d.mode = 'challenge'
        GROUP BY d.exercise`,
    )
      .bind(body.userId, body.roundId)
      .all<{ exercise: string; passed: number }>();
    const passed = new Set(
      results.results.filter((row) => Boolean(row.passed)).map((row) => row.exercise),
    );
    if ([...REQUIRED_EXERCISES].some((exercise) => !passed.has(exercise))) {
      return Response.json(
        { error: 'All four challenge exercises require a final passing score' },
        { status: 409 },
      );
    }
    const openReview = await env.DB.prepare(
      `SELECT r.id
         FROM review r
         JOIN submission s ON s.id = r.submission_id
         JOIN dataset_release d ON d.id = s.release_id
        WHERE s.user_id = ? AND d.round_id = ? AND r.status IN ('requested', 'in_review')
        LIMIT 1`,
    )
      .bind(body.userId, body.roundId)
      .first();
    if (openReview) {
      return Response.json({ error: 'An open review must be resolved first' }, { status: 409 });
    }
    const random = crypto.getRandomValues(new Uint8Array(18));
    const publicCode = btoa(String.fromCharCode(...random))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
    const certificateId = crypto.randomUUID();
    const issuedAt = new Date().toISOString();
    const verificationUrl = `${env.BETTER_AUTH_URL.replace(/\/$/, '')}/verify/${publicCode}`;
    const participantName = participant.name.trim() || participant.email;
    const snapshot = {
      participantName,
      roundTitle: round.title,
      exercises: [...REQUIRED_EXERCISES],
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
    const objectKey = `certificates/${body.roundId}/${certificateId}.pdf`;
    await env.PRIVATE_ASSETS.put(objectKey, pdf, {
      httpMetadata: { contentType: 'application/pdf' },
      customMetadata: { certificateId, publicCode },
    });
    try {
      const statements = [
        env.DB.prepare(
          `INSERT INTO certificate
             (id, public_code, user_id, round_id, issued_at, supersedes_id,
              pdf_object_key, snapshot_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          certificateId,
          publicCode,
          body.userId,
          body.roundId,
          issuedAt,
          body.supersedesId ?? null,
          objectKey,
          JSON.stringify(snapshot),
        ),
        env.DB.prepare(
          `INSERT INTO audit_event
             (id, actor_user_id, action, target_type, target_id, after_json)
           VALUES (?, ?, 'certificate.issued', 'certificate', ?, ?)`,
        ).bind(crypto.randomUUID(), actor.id, certificateId, JSON.stringify(snapshot)),
      ];
      if (body.supersedesId) {
        const previous = await env.DB.prepare(
          'SELECT id FROM certificate WHERE id = ? AND user_id = ? AND round_id = ? AND revoked_at IS NULL',
        )
          .bind(body.supersedesId, body.userId, body.roundId)
          .first();
        if (!previous) {
          await env.PRIVATE_ASSETS.delete(objectKey);
          return Response.json(
            { error: 'Certificate selected for reissue is not active' },
            { status: 409 },
          );
        }
        statements.push(
          env.DB.prepare(
            `UPDATE certificate
                SET revoked_at = CURRENT_TIMESTAMP, revocation_reason = 'Reissued'
              WHERE id = ?`,
          ).bind(body.supersedesId),
        );
      }
      await env.DB.batch(statements);
    } catch (error) {
      await env.PRIVATE_ASSETS.delete(objectKey);
      throw error;
    }
    return Response.json({ certificateId, publicCode, verificationUrl }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
