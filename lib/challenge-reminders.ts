import { challengeDateLabel, type ChallengeRoundRecord } from './challenge';
import type { CloudflareEnv } from './cloudflare';
import { sendChallengeOpeningEmail } from './postmark';

const DELIVERY_BATCH_SIZE = 50;

interface PendingSubscription extends ChallengeRoundRecord {
  subscription_id: string;
  email: string;
}

export async function sendChallengeOpeningReminders(
  env: CloudflareEnv,
  now = new Date(),
): Promise<{ sent: number; failed: number; skipped: boolean }> {
  const timestamp = now.toISOString();
  const pending = await env.DB.prepare(
    `SELECT s.id AS subscription_id, s.email,
            r.id, r.slug, r.title, r.registration_mode, r.registration_opens_at,
            r.opens_at, r.closes_at, r.status
       FROM challenge_notification_subscription s
       JOIN assessment_round r ON r.slug = s.challenge_slug
      WHERE s.reminder_sent_at IS NULL
        AND r.status = 'published'
        AND r.opens_at <= ?
        AND r.closes_at >= ?
      ORDER BY r.opens_at, s.subscribed_at
      LIMIT ?`,
  )
    .bind(timestamp, timestamp, DELIVERY_BATCH_SIZE)
    .all<PendingSubscription>();

  if (!pending.results.length) {
    return { sent: 0, failed: 0, skipped: true };
  }

  let sent = 0;
  let failed = 0;
  for (const subscription of pending.results) {
    try {
      const messageId = await sendChallengeOpeningEmail(
        { token: env.POSTMARK_SERVER_TOKEN, from: env.POSTMARK_FROM_EMAIL },
        subscription.email,
        `${env.BETTER_AUTH_URL}/challenge`,
        subscription.title,
        challengeDateLabel(subscription),
      );
      const update = await env.DB.prepare(
        `UPDATE challenge_notification_subscription
            SET reminder_sent_at = CURRENT_TIMESTAMP,
                reminder_message_id = ?,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND reminder_sent_at IS NULL`,
      )
        .bind(messageId, subscription.subscription_id)
        .run();
      sent += update.meta.changes;
    } catch (error) {
      failed += 1;
      console.error(`Challenge reminder failed for subscription ${subscription.subscription_id}`, error);
    }
  }

  return { sent, failed, skipped: false };
}
