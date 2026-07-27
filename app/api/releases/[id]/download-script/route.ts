import { getEnv } from '@/lib/cloudflare';
import { jsonError, optionalUser, requireReleaseAccess } from '@/lib/assessment';
import {
  buildBulkDownloadScript,
} from '@/lib/download-script';
import {
  participantDownloadFiles,
  participantObjectKey,
  type ParticipantManifest,
} from '@/lib/participant-files';
import { presignParticipantR2Object, publicR2ObjectUrl } from '@/lib/r2-presign';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await optionalUser(request);
    const { id } = await context.params;
    const url = new URL(request.url);
    const tool = url.searchParams.get('tool');
    if (tool !== 'curl' && tool !== 'wget') {
      return Response.json({ error: 'Choose either curl or wget' }, { status: 400 });
    }
    const release = await requireReleaseAccess(env, id, user?.id ?? null, 'download');
    const bucket = release.mode === 'practice' ? env.PRACTICE_ASSETS : env.PRIVATE_ASSETS;
    const manifestObject = await bucket.get(release.manifestKey);
    if (!manifestObject) {
      return new Response('Release manifest unavailable', { status: 503 });
    }
    const manifest = (await manifestObject.json()) as ParticipantManifest;
    const files = participantDownloadFiles(manifest);
    const prefix = release.manifestKey.slice(0, release.manifestKey.lastIndexOf('/'));
    const directUrlByFilename = new Map<string, string>();
    if (release.mode === 'challenge') {
      await Promise.all(
        files.map(async (file) => {
          const key = participantObjectKey(manifest, prefix, file.filename);
          if (!key) throw new Error(`Participant file is not in the manifest: ${file.filename}`);
          directUrlByFilename.set(
            file.filename,
            await presignParticipantR2Object(env, key),
          );
        }),
      );
    } else {
      for (const file of files) {
        const key = participantObjectKey(manifest, prefix, file.filename);
        if (!key) throw new Error(`Participant file is not in the manifest: ${file.filename}`);
        directUrlByFilename.set(
          file.filename,
          publicR2ObjectUrl(env.PRACTICE_R2_PUBLIC_URL, key),
        );
      }
    }
    const script = buildBulkDownloadScript({
      tool,
      releaseId: release.releaseId,
      files,
      fileUrl: (file) => {
        const directUrl = directUrlByFilename.get(file.filename);
        if (!directUrl) throw new Error(`No direct R2 URL for ${file.filename}`);
        return directUrl;
      },
    });
    const filename = `${release.releaseId}-${tool}-download.sh`.replace(
      /[^A-Za-z0-9._-]/g,
      '_',
    );
    return new Response(script, {
      headers: {
        'content-type': 'text/x-shellscript; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': release.mode === 'practice' ? 'public, max-age=300' : 'private, no-store',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
