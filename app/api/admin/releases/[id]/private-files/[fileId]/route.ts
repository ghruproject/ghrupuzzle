import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';
import {
  findAdminPrivateFile,
  getAdminReleaseDetails,
  safePrivateContentType,
  safePrivateFileName,
} from '@/lib/admin-release-details';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; fileId: string }> },
): Promise<Response> {
  try {
    const env = await getEnv();
    const actor = await requireUser(request);
    await requireRole(env.DB, actor, ['administrator']);
    const { id, fileId } = await context.params;
    const release = await getAdminReleaseDetails(env.DB, id);
    if (!release) return new Response('Release not found', { status: 404 });
    const file = await findAdminPrivateFile(env.PRIVATE_ASSETS, release, fileId);
    if (!file) return new Response('Private file not found', { status: 404 });

    const object = await env.PRIVATE_ASSETS.get(`${release.privatePrefix}${file.relativePath}`);
    if (!object) return new Response('Private file unavailable', { status: 503 });
    const download = new URL(request.url).searchParams.get('download') === '1';
    await env.DB.prepare(
      `INSERT INTO audit_event
         (id, actor_user_id, action, target_type, target_id, after_json)
       VALUES (?, ?, ?, 'dataset_release', ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        actor.id,
        download ? 'release.private_file_downloaded' : 'release.private_file_viewed',
        release.id,
        JSON.stringify({ releaseId: release.releaseId, file: file.relativePath }),
      )
      .run();

    const contentType = safePrivateContentType(file.relativePath);
    const disposition = download || contentType === 'application/octet-stream'
      ? 'attachment'
      : 'inline';
    return new Response(object.body, {
      headers: {
        'cache-control': 'private, no-store',
        'content-disposition': `${disposition}; filename="${safePrivateFileName(file.relativePath)}"`,
        'content-security-policy': "default-src 'none'; sandbox",
        'content-type': contentType,
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
