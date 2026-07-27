import { createAuth } from './auth';
import type { CloudflareEnv } from './cloudflare';
import { isSupportedReleaseSchemaVersion } from './release-contract';

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
  schemaVersion: string;
}

export async function optionalUser(request: Request): Promise<AuthenticatedUser | null> {
  const session = await (await createAuth()).api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const user = await optionalUser(request);
  if (!user) {
    throw new Response('Authentication required', { status: 401 });
  }
  return user;
}

export async function requireRole(
  db: D1Database,
  user: AuthenticatedUser,
  roles: Array<'reviewer' | 'administrator'>,
): Promise<void> {
  if (
    roles.includes('administrator') &&
    (await hasAdministratorAccess(db, user.email))
  ) {
    return;
  }
  const remainingRoles = roles.filter((role) => role !== 'administrator');
  if (remainingRoles.length) {
    const placeholders = remainingRoles.map(() => '?').join(',');
    const row = await db
      .prepare(`SELECT role FROM user_role WHERE user_id = ? AND role IN (${placeholders}) LIMIT 1`)
      .bind(user.id, ...remainingRoles)
      .first();
    if (row) return;
  }
  throw new Response('Insufficient permission', { status: 403 });
}

export async function hasAdministratorAccess(
  db: D1Database,
  email: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      'SELECT email FROM administrator_email WHERE email = ? COLLATE NOCASE LIMIT 1',
    )
    .bind(email.trim().toLowerCase())
    .first();
  return Boolean(row);
}

export async function requireReleaseAccess(
  env: CloudflareEnv,
  releaseId: string,
  userId: string | null,
  purpose: 'download' | 'submit',
  now = new Date(),
): Promise<ReleaseAccess> {
  const release = await env.DB.prepare(
    `SELECT d.id, d.release_id, d.exercise, d.mode, d.answer_key, d.manifest_key,
            d.schema_version,
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
  if (!isSupportedReleaseSchemaVersion(release.schema_version)) {
    throw new Response('Release schema is not supported', { status: 409 });
  }
  if (mode === 'challenge') {
    if (!userId) {
      throw new Response('Authentication required', { status: 401 });
    }
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
    if (now > effectiveClose) {
      throw new Response(
        purpose === 'submit'
          ? 'Challenge submission window has closed'
          : 'Challenge download window has closed',
        { status: 403 },
      );
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
    schemaVersion: String(release.schema_version),
  };
}

export async function requireSignedChallengeDownloadAccess(
  env: CloudflareEnv,
  releaseId: string,
  now = new Date(),
): Promise<ReleaseAccess> {
  const release = await env.DB.prepare(
    `SELECT d.id, d.release_id, d.exercise, d.mode, d.answer_key, d.manifest_key,
            d.schema_version,
            d.round_id, r.opens_at, r.closes_at, r.grace_seconds
       FROM dataset_release d
       LEFT JOIN assessment_round r ON r.id = d.round_id
      WHERE d.id = ? AND d.published_at IS NOT NULL`,
  )
    .bind(releaseId)
    .first<Record<string, unknown>>();
  if (!release) throw new Response('Release not found', { status: 404 });
  if (String(release.mode) !== 'challenge') {
    throw new Response('Signed downloads are only available for challenge releases', {
      status: 403,
    });
  }
  if (!isSupportedReleaseSchemaVersion(release.schema_version)) {
    throw new Response('Release schema is not supported', { status: 409 });
  }
  const opensAt = new Date(String(release.opens_at));
  const closesAt = new Date(String(release.closes_at));
  const effectiveClose = new Date(
    closesAt.getTime() + Number(release.grace_seconds ?? 0) * 1000,
  );
  if (now < opensAt) throw new Response('Challenge has not opened', { status: 403 });
  if (now > effectiveClose) {
    throw new Response('Challenge download window has closed', { status: 403 });
  }
  return {
    id: String(release.id),
    releaseId: String(release.release_id),
    exercise: String(release.exercise) as ReleaseAccess['exercise'],
    mode: 'challenge',
    answerKey: String(release.answer_key),
    manifestKey: String(release.manifest_key),
    roundId: release.round_id ? String(release.round_id) : null,
    opensAt: release.opens_at ? String(release.opens_at) : null,
    closesAt: release.closes_at ? String(release.closes_at) : null,
    graceSeconds: Number(release.grace_seconds ?? 0),
    schemaVersion: String(release.schema_version),
  };
}

export function jsonError(error: unknown): Response {
  if (error instanceof Response) {
    return error;
  }
  console.error(error);
  return Response.json({ error: 'Request could not be completed' }, { status: 500 });
}

export function safeFilename(value: string, format: 'csv' | 'tsv' = 'csv'): string {
  const basename = value.split(/[\\/]/).pop() ?? `submission.${format}`;
  const safe = basename.replace(/[^A-Za-z0-9._-]/g, '_');
  return /\.(csv|tsv)$/i.test(safe) ? safe : `${safe}.${format}`;
}
