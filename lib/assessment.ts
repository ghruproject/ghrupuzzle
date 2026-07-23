import { createAuth } from './auth';
import type { CloudflareEnv } from './cloudflare';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
}

export interface ReleaseAccess {
  id: string;
  releaseId: string;
  exercise: 'typing' | 'assembly' | 'hybrid' | 'outbreak';
  mode: 'practice' | 'challenge';
  answerKey: string;
  manifestKey: string;
  roundId: string | null;
  opensAt: string | null;
  closesAt: string | null;
  graceSeconds: number;
}

export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const session = await (await createAuth()).api.getSession({ headers: request.headers });
  if (!session) {
    throw new Response('Authentication required', { status: 401 });
  }
  return session.user;
}

export async function requireRole(
  db: D1Database,
  userId: string,
  roles: Array<'reviewer' | 'administrator'>,
): Promise<void> {
  const placeholders = roles.map(() => '?').join(',');
  const row = await db
    .prepare(`SELECT role FROM user_role WHERE user_id = ? AND role IN (${placeholders}) LIMIT 1`)
    .bind(userId, ...roles)
    .first();
  if (!row) {
    throw new Response('Insufficient permission', { status: 403 });
  }
}

export async function requireReleaseAccess(
  env: CloudflareEnv,
  releaseId: string,
  userId: string,
  purpose: 'download' | 'submit',
  now = new Date(),
): Promise<ReleaseAccess> {
  const release = await env.DB.prepare(
    `SELECT d.id, d.release_id, d.exercise, d.mode, d.answer_key, d.manifest_key,
            d.round_id, r.opens_at, r.closes_at, r.grace_seconds,
            e.status AS enrolment_status
       FROM dataset_release d
       LEFT JOIN assessment_round r ON r.id = d.round_id
       LEFT JOIN enrolment e ON e.round_id = d.round_id AND e.user_id = ?
      WHERE d.id = ? AND d.published_at IS NOT NULL`,
  )
    .bind(userId, releaseId)
    .first<Record<string, unknown>>();
  if (!release) {
    throw new Response('Release not found', { status: 404 });
  }
  const mode = String(release.mode);
  if (mode === 'challenge') {
    if (release.enrolment_status !== 'active') {
      throw new Response('Challenge signup required', { status: 403 });
    }
    const opensAt = new Date(String(release.opens_at));
    const closesAt = new Date(String(release.closes_at));
    const effectiveClose = new Date(
      closesAt.getTime() + Number(release.grace_seconds ?? 0) * 1000,
    );
    if (now < opensAt) {
      throw new Response('Challenge has not opened', { status: 403 });
    }
    if (purpose === 'submit' && now > effectiveClose) {
      throw new Response('Challenge submission window has closed', { status: 403 });
    }
  }
  return {
    id: String(release.id),
    releaseId: String(release.release_id),
    exercise: String(release.exercise) as ReleaseAccess['exercise'],
    mode: mode as ReleaseAccess['mode'],
    answerKey: String(release.answer_key),
    manifestKey: String(release.manifest_key),
    roundId: release.round_id ? String(release.round_id) : null,
    opensAt: release.opens_at ? String(release.opens_at) : null,
    closesAt: release.closes_at ? String(release.closes_at) : null,
    graceSeconds: Number(release.grace_seconds ?? 0),
  };
}

export function jsonError(error: unknown): Response {
  if (error instanceof Response) {
    return error;
  }
  console.error(error);
  return Response.json({ error: 'Request could not be completed' }, { status: 500 });
}

export function safeFilename(value: string): string {
  const basename = value.split(/[\\/]/).pop() ?? 'submission.csv';
  const safe = basename.replace(/[^A-Za-z0-9._-]/g, '_');
  return safe.toLowerCase().endsWith('.csv') ? safe : `${safe}.csv`;
}
