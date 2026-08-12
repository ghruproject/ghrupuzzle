import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';

interface RegisteredAnswerKey {
  release_id?: unknown;
  exercise?: unknown;
  mode?: unknown;
  [key: string]: unknown;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const env = await getEnv();
    const actor = await requireUser(request);
    await requireRole(env.DB, actor, ['administrator']);
    const { id } = await context.params;
    const release = await env.DB.prepare(
      `SELECT id, release_id, exercise, mode, answer_key
         FROM dataset_release
        WHERE id = ? AND published_at IS NOT NULL`,
    )
      .bind(id)
      .first<{
        id: string;
        release_id: string;
        exercise: string;
        mode: string;
        answer_key: string;
      }>();
    if (!release) {
      return new Response('Release not found', { status: 404 });
    }

    const answerObject = await env.PRIVATE_ASSETS.get(release.answer_key);
    if (!answerObject) {
      return new Response('Answer key unavailable', { status: 503 });
    }
    const answerKey = (await answerObject.json()) as RegisteredAnswerKey;
    if (
      answerKey.release_id !== release.release_id
      || answerKey.exercise !== release.exercise
      || answerKey.mode !== release.mode
    ) {
      throw new Error(`Answer key does not match registered release ${release.id}`);
    }

    await env.DB.prepare(
      `INSERT INTO audit_event
         (id, actor_user_id, action, target_type, target_id, after_json)
       VALUES (?, ?, 'release.answers_viewed', 'dataset_release', ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        actor.id,
        release.id,
        JSON.stringify({
          releaseId: release.release_id,
          exercise: release.exercise,
          mode: release.mode,
        }),
      )
      .run();

    const filename = `${release.release_id.replace(/[^A-Za-z0-9._-]/g, '_')}-answer-key.json`;
    return new Response(`${JSON.stringify(answerKey, null, 2)}\n`, {
      headers: {
        'cache-control': 'private, no-store',
        'content-disposition': `inline; filename="${filename}"`,
        'content-type': 'application/json; charset=utf-8',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
