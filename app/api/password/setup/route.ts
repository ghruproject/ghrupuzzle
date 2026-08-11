import { hashPassword } from 'better-auth/crypto';
import { getEnv } from '@/lib/cloudflare';
import { jsonError } from '@/lib/assessment';
import {
  hashPasswordSetupCode,
  isPasswordSetupOriginAllowed,
  normaliseSignInEmail,
  passwordSetupRateLimitKey,
  validateParticipantPassword,
} from '@/lib/password-access';

const MAX_SETUP_ATTEMPTS = 10;
const NO_STORE_HEADERS = { 'cache-control': 'no-store' };

interface SetupCodeRecord {
  id: string;
  user_id: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    requireSameOrigin(request, env.BETTER_AUTH_URL);
    const body = await readJson(request);
    const email = normaliseSignInEmail(String(body.email ?? ''));
    const code = String(body.code ?? '');
    const password = String(body.password ?? '');
    if (!email || !code) {
      return Response.json(
        { error: 'Email address and setup code are required' },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    const passwordError = validateParticipantPassword(password);
    if (passwordError) {
      return Response.json(
        { error: passwordError },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const rateLimitKey = await passwordSetupRateLimitKey(
      env.BETTER_AUTH_SECRET,
      request,
      email,
    );
    const attempt = await env.DB.prepare(
      `INSERT INTO rateLimit (id, key, count, lastRequest)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         count = rateLimit.count + 1,
         lastRequest = excluded.lastRequest
       RETURNING count`,
    )
      .bind(crypto.randomUUID(), rateLimitKey, Date.now())
      .first<{ count: number }>();
    if (Number(attempt?.count ?? 1) > MAX_SETUP_ATTEMPTS) {
      return Response.json(
        { error: 'Too many attempts. Wait 15 minutes before trying again.' },
        {
          status: 429,
          headers: { ...NO_STORE_HEADERS, 'retry-after': '900' },
        },
      );
    }

    const tokenHash = await hashPasswordSetupCode(code);
    const setupCode = await env.DB.prepare(
      `SELECT p.id, p.user_id
         FROM password_setup_code p
         JOIN user u ON u.id = p.user_id
        WHERE p.token_hash = ?
          AND u.email = ? COLLATE NOCASE
          AND p.used_at IS NULL
          AND p.expires_at > ?
        LIMIT 1`,
    )
      .bind(tokenHash, email, new Date().toISOString())
      .first<SetupCodeRecord>();
    if (!setupCode) return invalidCodeResponse();

    const passwordHash = await hashPassword(password);
    const consumed = await env.DB.prepare(
      `UPDATE password_setup_code
          SET used_at = CURRENT_TIMESTAMP
        WHERE id = ? AND used_at IS NULL AND expires_at > ?
        RETURNING user_id`,
    )
      .bind(setupCode.id, new Date().toISOString())
      .first<{ user_id: string }>();
    if (!consumed || consumed.user_id !== setupCode.user_id) return invalidCodeResponse();

    const existingAccount = await env.DB.prepare(
      `SELECT id
         FROM account
        WHERE userId = ? AND providerId = 'credential'
        LIMIT 1`,
    )
      .bind(setupCode.user_id)
      .first<{ id: string }>();
    const now = new Date().toISOString();
    const credentialStatement = existingAccount
      ? env.DB.prepare(
        `UPDATE account
            SET password = ?, updatedAt = ?
          WHERE id = ?`,
      ).bind(passwordHash, now, existingAccount.id)
      : env.DB.prepare(
        `INSERT INTO account
           (id, accountId, providerId, userId, password, createdAt, updatedAt)
         VALUES (?, ?, 'credential', ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        setupCode.user_id,
        setupCode.user_id,
        passwordHash,
        now,
        now,
      );

    await env.DB.batch([
      credentialStatement,
      env.DB.prepare(
        'UPDATE user SET emailVerified = 1, updatedAt = ? WHERE id = ?',
      ).bind(now, setupCode.user_id),
      env.DB.prepare('DELETE FROM session WHERE userId = ?').bind(setupCode.user_id),
      env.DB.prepare(
        `UPDATE password_setup_code
            SET used_at = COALESCE(used_at, CURRENT_TIMESTAMP)
          WHERE user_id = ? AND used_at IS NULL`,
      ).bind(setupCode.user_id),
      env.DB.prepare(
        `INSERT INTO audit_event
           (id, action, target_type, target_id, after_json)
         VALUES (?, 'participant.password.set', 'user', ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        setupCode.user_id,
        JSON.stringify({ method: 'administrator_setup_code' }),
      ),
    ]);

    return Response.json(
      { status: true },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return jsonError(error);
  }
}

function invalidCodeResponse(): Response {
  return Response.json(
    { error: 'The email address or setup code is invalid or has expired.' },
    { status: 400, headers: NO_STORE_HEADERS },
  );
}

function requireSameOrigin(request: Request, publicSiteUrl: string): void {
  if (!isPasswordSetupOriginAllowed(request.headers.get('origin'), publicSiteUrl)) {
    throw Response.json(
      { error: 'Invalid request origin' },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    throw Response.json(
      { error: 'Invalid JSON request' },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
}
