import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';
import { getAdminReleaseDetails } from '@/lib/admin-release-details';

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
    const release = await getAdminReleaseDetails(env.DB, id);
    if (!release) {
      return new Response('Release not found', { status: 404 });
    }

    const answerObject = await env.PRIVATE_ASSETS.get(release.answerKey);
    if (!answerObject) {
      return new Response('Answer key unavailable', { status: 503 });
    }
    const answerKey = (await answerObject.json()) as RegisteredAnswerKey;
    if (
      answerKey.release_id !== release.releaseId
      || answerKey.exercise !== release.exercise
      || answerKey.mode !== release.mode
    ) {
      throw new Error(`Answer key does not match registered release ${release.id}`);
    }

    const download = new URL(request.url).searchParams.get('download') === '1';
    await env.DB.prepare(
      `INSERT INTO audit_event
         (id, actor_user_id, action, target_type, target_id, after_json)
       VALUES (?, ?, ?, 'dataset_release', ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        actor.id,
        download ? 'release.answers_downloaded' : 'release.answers_viewed',
        release.id,
        JSON.stringify({
          releaseId: release.releaseId,
          exercise: release.exercise,
          mode: release.mode,
        }),
      )
      .run();

    const filename = `${release.releaseId.replace(/[^A-Za-z0-9._-]/g, '_')}-answer-key.json`;
    return new Response(`${JSON.stringify(answerKey, null, 2)}\n`, {
      headers: {
        'cache-control': 'private, no-store',
        'content-disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
        'content-security-policy': "default-src 'none'; sandbox",
        'content-type': 'application/json; charset=utf-8',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
