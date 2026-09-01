import { getEnv } from '@/lib/cloudflare';
import { sendCertificateEmail, type CertificateEmailRecipient } from '@/lib/certificate-email';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const env = await getEnv();
    const actor = await requireUser(request);
    await requireRole(env.DB, actor, ['administrator']);
    const { id } = await context.params;
    const round = await env.DB.prepare('SELECT id FROM assessment_round WHERE id = ?')
      .bind(id)
      .first();
    if (!round) return Response.json({ error: 'Challenge round not found' }, { status: 404 });

    const rows = await env.DB.prepare(
      `SELECT c.id AS certificateId, c.public_code AS publicCode,
              u.name AS participantName, u.email AS participantEmail,
              r.title AS roundTitle
         FROM certificate c
         JOIN user u ON u.id = c.user_id
         JOIN assessment_round r ON r.id = c.round_id
        WHERE c.round_id = ? AND c.revoked_at IS NULL
          AND c.email_status IN ('not_sent', 'failed')
        ORDER BY c.issued_at, u.name
        LIMIT 100`,
    ).bind(id).all<CertificateEmailRecipient>();

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ certificateId: string; error: string }> = [];
    for (const recipient of rows.results) {
      const result = await sendCertificateEmail(env, actor.id, recipient);
      if (result.sent) sent += 1;
      else if (result.skipped) skipped += 1;
      else {
        failed += 1;
        errors.push({ certificateId: recipient.certificateId, error: result.error || 'Failed' });
      }
    }
    return Response.json({ attempted: rows.results.length, sent, failed, skipped, errors });
  } catch (error) {
    return jsonError(error);
  }
}
