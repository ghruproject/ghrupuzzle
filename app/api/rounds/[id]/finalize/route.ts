import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const env = await getEnv();
    const actor = await requireUser(request);
    await requireRole(env.DB, actor.id, ['administrator']);
    const { id } = await context.params;
    const round = await env.DB.prepare('SELECT closes_at FROM assessment_round WHERE id = ?')
      .bind(id)
      .first<{ closes_at: string }>();
    if (!round) {
      return Response.json({ error: 'Round not found' }, { status: 404 });
    }
    if (new Date() <= new Date(round.closes_at)) {
      return Response.json({ error: 'Round has not closed' }, { status: 409 });
    }
    const result = await env.DB.prepare(
      `UPDATE score SET provisional = 0
        WHERE provisional = 1
          AND submission_id IN (
            SELECT s.id
              FROM submission s
              JOIN dataset_release d ON d.id = s.release_id
             WHERE d.round_id = ?
               AND NOT EXISTS (
                 SELECT 1 FROM review r
                  WHERE r.submission_id = s.id
                    AND r.status IN ('requested', 'in_review')
               )
          )`,
    )
      .bind(id)
      .run();
    await env.DB.prepare(
      `INSERT INTO audit_event (id, actor_user_id, action, target_type, target_id, after_json)
       VALUES (?, ?, 'round.scores_finalized', 'assessment_round', ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        actor.id,
        id,
        JSON.stringify({ changed: result.meta.changes }),
      )
      .run();
    return Response.json({ roundId: id, finalizedScores: result.meta.changes });
  } catch (error) {
    return jsonError(error);
  }
}
