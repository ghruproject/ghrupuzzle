import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireUser } from '@/lib/assessment';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    const { id } = await context.params;
    const round = await env.DB.prepare(
      `SELECT id, slug, registration_mode, registration_opens_at, opens_at, closes_at, status
         FROM assessment_round WHERE id = ?`,
    )
      .bind(id)
      .first<Record<string, unknown>>();
    if (!round || round.status !== 'published') {
      return Response.json({ error: 'Challenge signup is not available' }, { status: 404 });
    }
    const now = new Date();
    if (round.registration_opens_at && now < new Date(String(round.registration_opens_at))) {
      return Response.json({ error: 'Registration has not opened' }, { status: 403 });
    }
    if (now > new Date(String(round.closes_at))) {
      return Response.json({ error: 'Registration has closed' }, { status: 403 });
    }
    let invitationId: string | null = null;
    if (round.registration_mode === 'invite') {
      const invitation = await env.DB.prepare(
        `SELECT id FROM invitation
          WHERE round_id = ? AND email = ? COLLATE NOCASE AND accepted_by IS NULL`,
      )
        .bind(id, user.email)
        .first<{ id: string }>();
      if (!invitation) {
        return Response.json({ error: 'An invitation is required for this round' }, { status: 403 });
      }
      invitationId = invitation.id;
    }
    const enrolmentId = crypto.randomUUID();
    const openingReminder = now < new Date(String(round.opens_at));
    const statements = [
      env.DB.prepare(
        `INSERT INTO enrolment (id, round_id, user_id)
         VALUES (?, ?, ?)
         ON CONFLICT(round_id, user_id) DO UPDATE SET status = 'active'`,
      ).bind(enrolmentId, id, user.id),
      env.DB.prepare(
        `INSERT INTO audit_event (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, ?, 'enrolment.created', 'assessment_round', ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        user.id,
        id,
        JSON.stringify({ enrolmentId, openingReminder }),
      ),
    ];
    if (openingReminder) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO challenge_notification_subscription (id, challenge_slug, email)
           VALUES (?, ?, ?)
           ON CONFLICT(challenge_slug, email) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
        ).bind(crypto.randomUUID(), String(round.slug), user.email),
      );
    }
    if (invitationId) {
      statements.push(
        env.DB.prepare(
          `UPDATE invitation
              SET accepted_by = ?, accepted_at = CURRENT_TIMESTAMP
            WHERE id = ? AND accepted_by IS NULL`,
        ).bind(user.id, invitationId),
      );
    }
    await env.DB.batch(statements);
    return Response.json({ roundId: id, status: 'active', openingReminder }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
