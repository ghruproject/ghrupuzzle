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
    const prefix = `releases/${body.releaseId}/${body.exercise}/${body.mode}`;
    const bucket = body.mode === 'practice' ? env.PRACTICE_ASSETS : env.PRIVATE_ASSETS;
    const [manifestObject, indexObject, completeObject, sampleSheet, submissionSchema] =
      await Promise.all([
        bucket.get(`${prefix}/dataset_manifest.json`),
        bucket.get(`${prefix}/release.json`),
        bucket.get(`${prefix}/COMPLETE.json`),
        bucket.head(`${prefix}/sample_sheet.csv`),
        bucket.head(`${prefix}/submission_schema.json`),
      ]);
    if (
      !manifestObject ||
      !indexObject ||
      !completeObject ||
      !sampleSheet ||
      !submissionSchema
    ) {
      return Response.json(
        { error: 'The uploaded release contract is incomplete' },
        { status: 400 },
      );
    }
    const manifest = (await manifestObject.json()) as Record<string, unknown>;
    const index = (await indexObject.json()) as Record<string, unknown>;
    const complete = (await completeObject.json()) as Record<string, unknown>;
    if (
      manifest.schema_version !== '2.0' ||
      index.schema_version !== '2.0' ||
      complete.status !== 'complete' ||
      manifest.release_id !== body.releaseId ||
      manifest.exercise !== body.exercise ||
      manifest.mode !== body.mode ||
      index.release_id !== body.releaseId ||
      complete.release_id !== body.releaseId
    ) {
      return Response.json(
        { error: 'Uploaded release metadata does not match the registration request' },
        { status: 400 },
      );
    }
    const id = crypto.randomUUID();
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
        String(manifest.schema_version),
      ),
      env.DB.prepare(
        `INSERT INTO audit_event
           (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, ?, 'release.registered', 'dataset_release', ?, ?)`,
      ).bind(crypto.randomUUID(), actor.id, id, JSON.stringify(body)),
    ]);
    return Response.json(
      {
        id,
        prefix,
        releaseId: manifest.release_id,
        exercise: manifest.exercise,
        mode: manifest.mode,
        schemaVersion: manifest.schema_version,
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
