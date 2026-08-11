import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';
import {
  createPasswordSetupCode,
  hashPasswordSetupCode,
  passwordSetupExpiry,
} from '@/lib/password-access';

export async function POST(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const actor = await requireUser(request);
    await requireRole(env.DB, actor, ['administrator']);
    const body = await readJson(request);
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!userId) {
      return Response.json({ error: 'A participant is required' }, { status: 400 });
    }

    const participant = await env.DB.prepare(
      'SELECT id, name, email FROM user WHERE id = ? LIMIT 1',
    )
      .bind(userId)
      .first<{ id: string; name: string; email: string }>();
    if (!participant) {
      return Response.json({ error: 'Participant not found' }, { status: 404 });
    }

    const code = createPasswordSetupCode();
    const tokenHash = await hashPasswordSetupCode(code);
    const expiresAt = passwordSetupExpiry();
    const codeId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE password_setup_code
            SET used_at = COALESCE(used_at, CURRENT_TIMESTAMP)
          WHERE user_id = ? AND used_at IS NULL`,
      ).bind(userId),
      env.DB.prepare(
        `INSERT INTO password_setup_code
           (id, user_id, token_hash, expires_at, created_by)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(codeId, userId, tokenHash, expiresAt, actor.id),
      env.DB.prepare(
        `INSERT INTO audit_event
           (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, ?, 'participant.password_setup_code.created', 'user', ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        actor.id,
        userId,
        JSON.stringify({ expiresAt }),
      ),
    ]);

    const setupUrl = new URL('/set-password', env.BETTER_AUTH_URL);
    setupUrl.searchParams.set('email', participant.email);
    return Response.json({
      code,
      expiresAt,
      setupUrl: setupUrl.toString(),
      participant: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
      },
    }, {
      status: 201,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return jsonError(error);
  }
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    throw new Response('Invalid JSON request', { status: 400 });
  }
}
