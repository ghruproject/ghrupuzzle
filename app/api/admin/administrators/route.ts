import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';
import { normaliseAdministratorEmail } from '@/lib/admin-helpers';

export async function POST(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const actor = await requireUser(request);
    await requireRole(env.DB, actor, ['administrator']);
    const body = (await request.json()) as { email?: string };
    const email = normaliseAdministratorEmail(body.email ?? '');
    if (!email) {
      return Response.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const result = await env.DB.prepare(
      `INSERT INTO administrator_email (email, added_by)
       VALUES (?, ?)
       ON CONFLICT(email) DO NOTHING`,
    )
      .bind(email, actor.id)
      .run();
    if (result.meta.changes) {
      await env.DB.prepare(
        `INSERT INTO audit_event
           (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, ?, 'administrator.added', 'administrator_email', ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          actor.id,
          email,
          JSON.stringify({ email }),
        )
        .run();
    }
    return Response.json(
      { email, added: Boolean(result.meta.changes) },
      { status: result.meta.changes ? 201 : 200 },
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const actor = await requireUser(request);
    await requireRole(env.DB, actor, ['administrator']);
    const body = (await request.json()) as { email?: string };
    const email = normaliseAdministratorEmail(body.email ?? '');
    if (!email) {
      return Response.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const existing = await env.DB.prepare(
      'SELECT email FROM administrator_email WHERE email = ? COLLATE NOCASE',
    )
      .bind(email)
      .first();
    if (!existing) {
      return Response.json({ error: 'Administrator email not found' }, { status: 404 });
    }
    const removal = await env.DB.prepare(
      `DELETE FROM administrator_email
        WHERE email = ? COLLATE NOCASE
          AND (SELECT COUNT(*) FROM administrator_email) > 1`,
    )
      .bind(email)
      .run();
    if (!removal.meta.changes) {
      return Response.json(
        { error: 'The final administrator cannot be removed' },
        { status: 409 },
      );
    }

    await env.DB.prepare(
        `INSERT INTO audit_event
           (id, actor_user_id, action, target_type, target_id, before_json)
         VALUES (?, ?, 'administrator.removed', 'administrator_email', ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        actor.id,
        email,
        JSON.stringify({ email }),
      )
      .run();
    return Response.json({ email, removed: true });
  } catch (error) {
    return jsonError(error);
  }
}
