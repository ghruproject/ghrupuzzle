import { certificateVerificationUrl } from './certificate';
import type { CloudflareEnv } from './cloudflare';
import { sendCertificateIssuedEmail } from './postmark';

export interface CertificateEmailRecipient {
  certificateId: string;
  publicCode: string;
  participantName: string;
  participantEmail: string;
  roundTitle: string;
}

export async function sendCertificateEmail(
  env: CloudflareEnv,
  actorUserId: string | null,
  recipient: CertificateEmailRecipient,
): Promise<{ sent: boolean; skipped: boolean; messageId: string | null; error?: string }> {
  const claim = await env.DB.prepare(
    `UPDATE certificate
        SET email_status = 'sending', email_error = NULL
      WHERE id = ? AND revoked_at IS NULL
        AND email_status IN ('not_sent', 'failed')`,
  ).bind(recipient.certificateId).run();
  if (!claim.meta.changes) {
    return { sent: false, skipped: true, messageId: null };
  }

  try {
    const messageId = await sendCertificateIssuedEmail(
      { token: env.POSTMARK_SERVER_TOKEN, from: env.POSTMARK_FROM_EMAIL },
      recipient.participantEmail,
      recipient.participantName.trim() || recipient.participantEmail,
      recipient.roundTitle,
      `${env.BETTER_AUTH_URL.replace(/\/$/, '')}/dashboard`,
      certificateVerificationUrl(env.BETTER_AUTH_URL, recipient.publicCode),
    );
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE certificate
            SET email_status = 'sent', email_message_id = ?,
                email_sent_at = CURRENT_TIMESTAMP, email_error = NULL
          WHERE id = ?`,
      ).bind(messageId, recipient.certificateId),
      env.DB.prepare(
        `INSERT INTO audit_event
           (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, ?, 'certificate.email_sent', 'certificate', ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        actorUserId,
        recipient.certificateId,
        JSON.stringify({ recipient: recipient.participantEmail, messageId }),
      ),
    ]);
    return { sent: true, skipped: false, messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Certificate email failed';
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE certificate
            SET email_status = 'failed', email_error = ?
          WHERE id = ?`,
      ).bind(message.slice(0, 500), recipient.certificateId),
      env.DB.prepare(
        `INSERT INTO audit_event
           (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, ?, 'certificate.email_failed', 'certificate', ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        actorUserId,
        recipient.certificateId,
        JSON.stringify({ recipient: recipient.participantEmail, error: message }),
      ),
    ]);
    return { sent: false, skipped: false, messageId: null, error: message };
  }
}

export async function sendPendingCertificateEmails(
  env: CloudflareEnv,
): Promise<{ sent: number; failed: number; skipped: number }> {
  const rows = await env.DB.prepare(
    `SELECT c.id AS certificateId, c.public_code AS publicCode,
            u.name AS participantName, u.email AS participantEmail,
            r.title AS roundTitle
       FROM certificate c
       JOIN user u ON u.id = c.user_id
       JOIN assessment_round r ON r.id = c.round_id
      WHERE c.revoked_at IS NULL
        AND c.email_status IN ('not_sent', 'failed')
      ORDER BY c.issued_at
      LIMIT 50`,
  ).all<CertificateEmailRecipient>();

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const recipient of rows.results) {
    const result = await sendCertificateEmail(env, null, recipient);
    if (result.sent) sent += 1;
    else if (result.skipped) skipped += 1;
    else failed += 1;
  }
  return { sent, failed, skipped };
}
