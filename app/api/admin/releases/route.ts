import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';
import {
  assertMatchingReleaseContracts,
  type AnswerKeyContractMetadata,
  type ScoringPolicy,
  type SubmissionSchema,
} from '@/lib/release-contract';

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
    const releaseId = body.releaseId;
    const exercise = body.exercise as 'typing' | 'assembly' | 'hybrid' | 'outbreak';
    const mode = body.mode as 'practice' | 'challenge';
    const prefix = `releases/${releaseId}/${exercise}/${mode}`;
    const bucket = mode === 'practice' ? env.PRACTICE_ASSETS : env.PRIVATE_ASSETS;
    const [manifestObject, indexObject, completeObject, sampleSheet, submissionObject,
      answerObject, policyObject] =
      await Promise.all([
        bucket.get(`${prefix}/dataset_manifest.json`),
        bucket.get(`${prefix}/release.json`),
        bucket.get(`${prefix}/COMPLETE.json`),
        bucket.head(`${prefix}/sample_sheet.csv`),
        bucket.get(`${prefix}/submission_schema.json`),
        env.PRIVATE_ASSETS.get(`${prefix}/private/answer_key.json`),
        env.PRIVATE_ASSETS.get(`${prefix}/private/scoring_policy.json`),
      ]);
    if (
      !manifestObject ||
      !indexObject ||
      !completeObject ||
      !sampleSheet ||
      !submissionObject ||
      !answerObject ||
      !policyObject
    ) {
      return Response.json(
        { error: 'The uploaded release contract is incomplete' },
        { status: 400 },
      );
    }
    const manifest = (await manifestObject.json()) as Record<string, unknown>;
    const index = (await indexObject.json()) as Record<string, unknown>;
    const complete = (await completeObject.json()) as Record<string, unknown>;
    const submissionSchema = (await submissionObject.json()) as SubmissionSchema;
    const answerKey = (await answerObject.json()) as AnswerKeyContractMetadata;
    const scoringPolicy = (await policyObject.json()) as ScoringPolicy;
    let schemaVersion: string;
    try {
      schemaVersion = assertMatchingReleaseContracts({
        releaseId,
        exercise,
        mode,
        requestedSchemaVersion: body.schemaVersion,
        manifest,
        releaseIndex: index,
        complete,
        submissionSchema,
        answerKey,
        scoringPolicy,
      });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Release contract is invalid' },
        { status: 400 },
      );
    }
    const existing = await env.DB.prepare(
      `SELECT id, schema_version
         FROM dataset_release
        WHERE release_id = ? AND exercise = ? AND mode = ?`,
    )
      .bind(body.releaseId, body.exercise, body.mode)
      .first<{ id: string; schema_version: string }>();
    const id = existing?.id ?? crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO dataset_release
           (id, release_id, exercise, mode, manifest_key, answer_key, round_id,
            schema_version, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(release_id, exercise, mode) DO UPDATE SET
           manifest_key = excluded.manifest_key,
           answer_key = excluded.answer_key,
           round_id = excluded.round_id,
           schema_version = excluded.schema_version,
           published_at = CURRENT_TIMESTAMP`,
      ).bind(
        id,
        body.releaseId,
        body.exercise,
        body.mode,
        `${prefix}/dataset_manifest.json`,
        `${prefix}/private/answer_key.json`,
        body.roundId ?? null,
        schemaVersion,
      ),
      env.DB.prepare(
        `INSERT INTO audit_event
           (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, ?, 'release.registered', 'dataset_release', ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        actor.id,
        id,
        JSON.stringify({
          ...body,
          prefix,
          schemaVersion,
          replacedSchemaVersion: existing?.schema_version ?? null,
        }),
      ),
    ]);
    return Response.json(
      {
        id,
        prefix,
        releaseId: manifest.release_id,
        exercise: manifest.exercise,
        mode: manifest.mode,
        schemaVersion,
      },
      { status: existing ? 200 : 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
