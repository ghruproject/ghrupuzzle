import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';
import { defaultNameFromEmail } from '@/lib/profile';

export async function POST(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const actor = await requireUser(request);
    await requireRole(env.DB, actor, ['administrator']);
    const body = (await request.json()) as {
      roundId?: string;
      invitations?: Array<{ email?: string; name?: string }>;
    };
    if (!body.roundId || !body.invitations?.length || body.invitations.length > 1000) {
      return Response.json({ error: 'roundId and 1–1,000 invitations are required' }, { status: 400 });
    }
    const clean = body.invitations.map((invitation) => ({
      id: crypto.randomUUID(),
      email: invitation.email?.trim().toLowerCase() ?? '',
      name: invitation.name?.trim() || null,
    }));
    if (clean.some((invitation) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(invitation.email))) {
      return Response.json({ error: 'One or more email addresses are invalid' }, { status: 400 });
    }
    await env.DB.batch([
      ...clean.map((invitation) => {
        const now = new Date().toISOString();
        return env.DB.prepare(
          `INSERT INTO user
             (id, name, email, emailVerified, createdAt, updatedAt)
           VALUES (?, ?, ?, 0, ?, ?)
           ON CONFLICT(email) DO NOTHING`,
        ).bind(
          crypto.randomUUID(),
          invitation.name || defaultNameFromEmail(invitation.email),
          invitation.email,
          now,
          now,
        );
      }),
      ...clean.map((invitation) =>
        env.DB.prepare(
          `INSERT INTO invitation (id, round_id, email, name)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(round_id, email) DO UPDATE SET name = excluded.name`,
        ).bind(invitation.id, body.roundId, invitation.email, invitation.name),
      ),
      env.DB.prepare(
        `INSERT INTO audit_event
           (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, ?, 'invitation.imported', 'assessment_round', ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        actor.id,
        body.roundId,
        JSON.stringify({ count: clean.length }),
      ),
    ]);
    return Response.json(
      { imported: clean.length, accountsReserved: clean.length },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
