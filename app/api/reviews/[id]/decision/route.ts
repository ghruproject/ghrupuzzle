import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    await requireRole(env.DB, user, ['reviewer', 'administrator']);
    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: 'upheld' | 'overruled';
      resolution?: string;
      earned?: number;
      possible?: number;
      passed?: boolean;
    };
    if (!['upheld', 'overruled'].includes(body.status ?? '') || !body.resolution?.trim()) {
      return Response.json({ error: 'A valid status and resolution are required' }, { status: 400 });
    }
    const review = await env.DB.prepare(
      `SELECT r.id, r.submission_id, r.status, s.earned, s.possible, s.passed
         FROM review r JOIN score s ON s.submission_id = r.submission_id
        WHERE r.id = ?`,
    )
      .bind(id)
      .first<Record<string, unknown>>();
    if (!review) {
      return Response.json({ error: 'Review not found' }, { status: 404 });
    }
    if (!['requested', 'in_review'].includes(String(review.status))) {
      return Response.json({ error: 'Review is already resolved' }, { status: 409 });
    }
    const before = {
      earned: Number(review.earned),
      possible: Number(review.possible),
      passed: Boolean(review.passed),
    };
    const after =
      body.status === 'overruled'
        ? {
            earned: Number(body.earned),
            possible: Number(body.possible),
            passed: Boolean(body.passed),
          }
        : before;
    if (
      !Number.isFinite(after.earned) ||
      !Number.isFinite(after.possible) ||
      after.possible <= 0 ||
      after.earned < 0 ||
      after.earned > after.possible
    ) {
      return Response.json({ error: 'Override score is invalid' }, { status: 400 });
    }
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE score SET earned = ?, possible = ?, passed = ?, provisional = 0
          WHERE submission_id = ?`,
      ).bind(after.earned, after.possible, after.passed ? 1 : 0, review.submission_id),
      env.DB.prepare(
        `UPDATE review
            SET assigned_to = ?, status = ?, resolution = ?, score_before_json = ?,
                score_after_json = ?, resolved_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
      ).bind(
        user.id,
        body.status,
        body.resolution.trim(),
        JSON.stringify(before),
        JSON.stringify(after),
        id,
      ),
      env.DB.prepare("UPDATE submission SET status = 'reviewed' WHERE id = ?").bind(
        review.submission_id,
      ),
      env.DB.prepare(
        `INSERT INTO audit_event
           (id, actor_user_id, action, target_type, target_id, before_json, after_json)
         VALUES (?, ?, 'review.decided', 'review', ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        user.id,
        id,
        JSON.stringify(before),
        JSON.stringify({ ...after, resolution: body.resolution.trim(), status: body.status }),
      ),
    ]);
    return Response.json({ reviewId: id, status: body.status, score: after });
  } catch (error) {
    return jsonError(error);
  }
}
