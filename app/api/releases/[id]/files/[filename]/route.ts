import { getEnv } from '@/lib/cloudflare';
import { jsonError, optionalUser, requireReleaseAccess } from '@/lib/assessment';
import {
  participantObjectKey,
  type ParticipantManifest,
} from '@/lib/participant-files';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; filename: string }> },
): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await optionalUser(request);
    const { id, filename } = await context.params;
    const release = await requireReleaseAccess(env, id, user?.id ?? null, 'download');
    const bucket = release.mode === 'practice' ? env.PRACTICE_ASSETS : env.PRIVATE_ASSETS;
    const manifestObject = await bucket.get(release.manifestKey);
    if (!manifestObject) {
      return new Response('Release manifest unavailable', { status: 503 });
    }
    const manifest = (await manifestObject.json()) as ParticipantManifest;
    const prefix = release.manifestKey.slice(0, release.manifestKey.lastIndexOf('/'));
    const key = participantObjectKey(manifest, prefix, filename);
    if (!key) {
      return new Response('File not found', { status: 404 });
    }
    const object = await bucket.get(key);
    if (!object) {
      return new Response('File not found', { status: 404 });
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('content-disposition', `attachment; filename="${filename}"`);
    headers.set(
      'cache-control',
      release.mode === 'practice' ? 'public, max-age=3600' : 'private, no-store',
    );
    return new Response(object.body, { headers });
  } catch (error) {
    return jsonError(error);
  }
}
