import { challengeDateLabel, type ChallengeRoundRecord } from '@/lib/challenge';
import { getEnv } from '@/lib/cloudflare';
import { jsonError } from '@/lib/assessment';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const RATE_LIMIT_MAX = 10;

export async function POST(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const payload = (await request.json()) as { email?: unknown; challengeSlug?: unknown };
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const challengeSlug =
      typeof payload.challengeSlug === 'string' ? payload.challengeSlug.trim() : '';
    if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (!challengeSlug) {
      return Response.json({ error: 'Choose an upcoming challenge.' }, { status: 400 });
    }
    const challenge = await env.DB.prepare(
      `SELECT id, slug, title, registration_mode, registration_opens_at,
              opens_at, closes_at, status
         FROM assessment_round
        WHERE slug = ? AND status = 'published'
          AND closes_at >= ?
        LIMIT 1`,
    )
      .bind(challengeSlug, new Date().toISOString())
      .first<ChallengeRoundRecord>();
    if (!challenge) {
      return Response.json({ error: 'That challenge is no longer available.' }, { status: 404 });
    }

    const clientAddress = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const key = `challenge-notification:${await digest(clientAddress)}`;
    const now = Math.floor(Date.now() / 1000);
    const limit = await env.DB.prepare(
      `INSERT INTO rateLimit (id, key, count, lastRequest)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE
           WHEN excluded.lastRequest - rateLimit.lastRequest >= ? THEN 1
           ELSE rateLimit.count + 1
         END,
         lastRequest = excluded.lastRequest
       RETURNING count`,
    )
      .bind(crypto.randomUUID(), key, now, RATE_LIMIT_WINDOW_SECONDS)
      .first<{ count: number }>();
    if (Number(limit?.count ?? 0) > RATE_LIMIT_MAX) {
      return Response.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 },
      );
    }

    await env.DB.prepare(
      `INSERT INTO challenge_notification_subscription
         (id, challenge_slug, email)
       VALUES (?, ?, ?)
       ON CONFLICT(challenge_slug, email) DO UPDATE SET
         updated_at = CURRENT_TIMESTAMP`,
    )
      .bind(crypto.randomUUID(), challenge.slug, email)
      .run();

    return Response.json({
      registered: true,
      message: `You are registered for the ${challengeDateLabel(challenge)} opening reminder.`,
    });
  } catch (error) {
    return jsonError(error);
  }
}

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
