import { NEXT_CHALLENGE, challengePhase } from './challenge';
import type { CloudflareEnv } from './cloudflare';
import { sendChallengeOpeningEmail } from './postmark';

const DELIVERY_BATCH_SIZE = 50;

interface PendingSubscription {
  id: string;
  email: string;
}

export async function sendChallengeOpeningReminders(
  env: CloudflareEnv,
  now = new Date(),
): Promise<{ sent: number; failed: number; skipped: boolean }> {
  if (challengePhase(now) !== 'open') {
    return { sent: 0, failed: 0, skipped: true };
  }

  const pending = await env.DB.prepare(
    `SELECT id, email
       FROM challenge_notification_subscription
      WHERE challenge_slug = ? AND reminder_sent_at IS NULL
      ORDER BY subscribed_at
      LIMIT ?`,
  )
    .bind(NEXT_CHALLENGE.slug, DELIVERY_BATCH_SIZE)
    .all<PendingSubscription>();

  let sent = 0;
  let failed = 0;
  for (const subscription of pending.results) {
    try {
      const messageId = await sendChallengeOpeningEmail(
        { token: env.POSTMARK_SERVER_TOKEN, from: env.POSTMARK_FROM_EMAIL },
        subscription.email,
        `${env.BETTER_AUTH_URL}/challenge`,
        NEXT_CHALLENGE.dateLabel,
      );
      const update = await env.DB.prepare(
        `UPDATE challenge_notification_subscription
            SET reminder_sent_at = CURRENT_TIMESTAMP,
                reminder_message_id = ?,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND reminder_sent_at IS NULL`,
      )
        .bind(messageId, subscription.id)
        .run();
      sent += update.meta.changes;
    } catch (error) {
      failed += 1;
      console.error(`Challenge reminder failed for subscription ${subscription.id}`, error);
    }
  }

  return { sent, failed, skipped: false };
}
