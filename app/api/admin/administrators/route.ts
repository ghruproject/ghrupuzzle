import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';
import { normaliseAdministratorEmail } from '@/lib/admin-helpers';
import { canGrantAdministratorAccess } from '@/lib/identity-policy';
import { defaultNameFromEmail } from '@/lib/profile';

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
    if (!(await canGrantAdministratorAccess(env.DB, email))) {
      return Response.json(
        {
          error: 'Confirm this account with a setup code or verified sign-in before granting administrator access.',
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO user
         (id, name, email, emailVerified, createdAt, updatedAt)
       VALUES (?, ?, ?, 0, ?, ?)
       ON CONFLICT(email) DO NOTHING`,
    )
      .bind(crypto.randomUUID(), defaultNameFromEmail(email), email, now, now)
      .run();

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
