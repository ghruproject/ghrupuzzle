import { getEnv } from '@/lib/cloudflare';
import { hasAdministratorAccess, jsonError, optionalUser } from '@/lib/assessment';

const EXERCISES = new Set(['typing', 'assembly', 'hybrid', 'outbreak']);
const MODES = new Set(['practice', 'challenge']);

export async function GET(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await optionalUser(request);
    const url = new URL(request.url);
    const exercise = url.searchParams.get('exercise') ?? '';
    const mode = url.searchParams.get('mode') ?? '';
    if (!EXERCISES.has(exercise) || !MODES.has(mode)) {
      return Response.json({ error: 'Valid exercise and mode are required' }, { status: 400 });
    }
    if (mode === 'challenge' && !user) {
      return new Response('Authentication required', { status: 401 });
    }
    const administrator = user
      ? await hasAdministratorAccess(env.DB, user.email)
      : false;
    const rows = await env.DB.prepare(
      `SELECT d.id, d.release_id, d.exercise, d.mode, r.opens_at, r.closes_at
         FROM dataset_release d
         LEFT JOIN assessment_round r ON r.id = d.round_id
         LEFT JOIN enrolment e ON e.round_id = d.round_id AND e.user_id = ?
        WHERE d.exercise = ? AND d.mode = ? AND d.published_at IS NOT NULL
          AND (
            d.mode = 'practice'
            OR ? = 1
            OR (
              e.status = 'active'
              AND datetime('now') >= datetime(r.opens_at)
              AND datetime('now') <= datetime(r.closes_at, '+' || r.grace_seconds || ' seconds')
            )
          )
        ORDER BY d.published_at DESC`,
    )
      .bind(user?.id ?? null, exercise, mode, administrator ? 1 : 0)
      .all<Record<string, unknown>>();
    return Response.json({
      releases: rows.results.map((row) => ({
        id: String(row.id),
        releaseId: String(row.release_id),
        exercise: String(row.exercise),
        mode: String(row.mode),
        opensAt: row.opens_at,
        closesAt: row.closes_at,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
