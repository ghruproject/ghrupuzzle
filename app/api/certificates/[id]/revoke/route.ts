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
    const body = (await request.json()) as { reason?: string };
    const reason = body.reason?.trim();
    if (!reason || reason.length > 1000) {
      return Response.json({ error: 'A revocation reason is required' }, { status: 400 });
    }
    const certificate = await env.DB.prepare(
      'SELECT id, revoked_at FROM certificate WHERE id = ?',
    )
      .bind(id)
      .first<Record<string, unknown>>();
    if (!certificate) {
      return Response.json({ error: 'Certificate not found' }, { status: 404 });
    }
    if (certificate.revoked_at) {
      return Response.json({ error: 'Certificate is already revoked' }, { status: 409 });
    }
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE certificate
            SET revoked_at = CURRENT_TIMESTAMP, revocation_reason = ?
          WHERE id = ?`,
      ).bind(reason, id),
      env.DB.prepare(
        `INSERT INTO audit_event
           (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, ?, 'certificate.revoked', 'certificate', ?, ?)`,
      ).bind(crypto.randomUUID(), actor.id, id, JSON.stringify({ reason })),
    ]);
    return Response.json({ certificateId: id, status: 'revoked' });
  } catch (error) {
    return jsonError(error);
  }
}
