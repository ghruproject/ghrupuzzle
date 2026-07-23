import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';

export async function GET(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    await requireRole(env.DB, user.id, ['reviewer', 'administrator']);
    const rows = await env.DB.prepare(
      `SELECT r.id, r.submission_id, r.reason, r.status, r.created_at,
              u.name AS participant_name, u.email AS participant_email,
              d.exercise, d.release_id, s.attempt_number,
              sc.earned, sc.possible, sc.passed, sc.details_json
         FROM review r
         JOIN submission s ON s.id = r.submission_id
         JOIN user u ON u.id = s.user_id
         JOIN dataset_release d ON d.id = s.release_id
         JOIN score sc ON sc.submission_id = s.id
        WHERE r.status IN ('requested', 'in_review')
        ORDER BY r.created_at`,
    ).all<Record<string, unknown>>();
    return Response.json({
      reviews: rows.results.map((row) => ({
        ...row,
        details: JSON.parse(String(row.details_json)),
        details_json: undefined,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    const body = (await request.json()) as { submissionId?: string; reason?: string };
    const reason = body.reason?.trim();
    if (!body.submissionId || !reason || reason.length > 2000) {
      return Response.json(
        { error: 'submissionId and a reason of at most 2,000 characters are required' },
        { status: 400 },
      );
    }
    const submission = await env.DB.prepare(
      'SELECT id FROM submission WHERE id = ? AND user_id = ?',
    )
      .bind(body.submissionId, user.id)
      .first();
    if (!submission) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }
    const existing = await env.DB.prepare(
      `SELECT id FROM review
        WHERE submission_id = ? AND status IN ('requested', 'in_review')`,
    )
      .bind(body.submissionId)
      .first();
    if (existing) {
      return Response.json({ error: 'An active review already exists' }, { status: 409 });
    }
    const reviewId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO review (id, submission_id, requested_by, reason)
         VALUES (?, ?, ?, ?)`,
      ).bind(reviewId, body.submissionId, user.id, reason),
      env.DB.prepare("UPDATE submission SET status = 'flagged' WHERE id = ?").bind(
        body.submissionId,
      ),
      env.DB.prepare(
        `INSERT INTO audit_event (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, ?, 'review.requested', 'review', ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        user.id,
        reviewId,
        JSON.stringify({ submissionId: body.submissionId, reason }),
      ),
    ]);
    return Response.json({ reviewId, status: 'requested' }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
