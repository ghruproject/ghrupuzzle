import { getEnv } from '@/lib/cloudflare';
import {
  jsonError, optionalUser, requireReleaseAccess, requireSignedChallengeDownloadAccess,
} from '@/lib/assessment';
import { verifyParticipantDownloadToken } from '@/lib/download-script';
import {
  participantFileDetails,
  participantObjectKey,
  type ParticipantManifest,
} from '@/lib/participant-files';
import { presignParticipantR2Object } from '@/lib/r2-presign';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; filename: string }> },
): Promise<Response> {
  try {
    const env = await getEnv();
    const { id, filename } = await context.params;
    const token = new URL(request.url).searchParams.get('token');
    let release;
    if (token) {
      const valid = await verifyParticipantDownloadToken(
        env.BETTER_AUTH_SECRET,
        id,
        filename,
        token,
      );
      if (!valid) return new Response('Download link is invalid or has expired', { status: 403 });
      release = await requireSignedChallengeDownloadAccess(env, id);
    } else {
      const user = await optionalUser(request);
      release = await requireReleaseAccess(env, id, user?.id ?? null, 'download');
    }
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
    const directUrl =
      release.mode === 'practice'
        ? participantFileDetails(manifest, filename)?.url
        : await presignParticipantR2Object(env, key);
    if (!directUrl) return new Response('Direct R2 URL unavailable', { status: 503 });
    return Response.redirect(directUrl, 307);
  } catch (error) {
    return jsonError(error);
  }
}
