import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';

const EXERCISES = new Set(['typing', 'assembly', 'hybrid', 'outbreak']);

export async function POST(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const actor = await requireUser(request);
    await requireRole(env.DB, actor.id, ['administrator']);
    const body = (await request.json()) as {
      releaseId?: string;
      exercise?: string;
      mode?: 'practice' | 'challenge';
      roundId?: string;
      schemaVersion?: string;
    };
    if (
      !body.releaseId?.match(/^[A-Za-z0-9][A-Za-z0-9._-]*$/) ||
      !EXERCISES.has(body.exercise ?? '') ||
      !['practice', 'challenge'].includes(body.mode ?? '') ||
      (body.mode === 'challenge' && !body.roundId) ||
      (body.mode === 'practice' && body.roundId)
    ) {
      return Response.json({ error: 'Release fields are invalid' }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const prefix = `releases/${body.releaseId}/${body.exercise}/${body.mode}`;
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO dataset_release
           (id, release_id, exercise, mode, manifest_key, answer_key, round_id,
            schema_version, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      ).bind(
        id,
        body.releaseId,
        body.exercise,
        body.mode,
        `${prefix}/dataset_manifest.json`,
        `${prefix}/private/answer_key.json`,
        body.roundId ?? null,
        body.schemaVersion ?? '1.0',
      ),
      env.DB.prepare(
        `INSERT INTO audit_event
           (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, ?, 'release.registered', 'dataset_release', ?, ?)`,
      ).bind(crypto.randomUUID(), actor.id, id, JSON.stringify(body)),
    ]);
    return Response.json({ id, prefix }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
