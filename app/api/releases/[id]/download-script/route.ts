import { getEnv } from '@/lib/cloudflare';
import { jsonError, optionalUser, requireReleaseAccess } from '@/lib/assessment';
import {
  buildBulkDownloadScript,
  createParticipantDownloadToken,
} from '@/lib/download-script';
import {
  participantDownloadFiles,
  type ParticipantManifest,
} from '@/lib/participant-files';

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
    const expiresAt = Math.min(
      Date.now() + 60 * 60 * 1000,
      release.closesAt
        ? new Date(release.closesAt).getTime() + release.graceSeconds * 1000
        : Number.MAX_SAFE_INTEGER,
    );
    const tokenByFilename = new Map<string, string>();
    if (release.mode === 'challenge') {
      await Promise.all(
        files.map(async (file) => {
          tokenByFilename.set(
            file.filename,
            await createParticipantDownloadToken(
              env.BETTER_AUTH_SECRET,
              release.id,
              file.filename,
              expiresAt,
            ),
          );
        }),
      );
    }
    const script = buildBulkDownloadScript({
      tool,
      releaseId: release.releaseId,
      files,
      fileUrl: (filename) => {
        const fileUrl = new URL(
          `/api/releases/${encodeURIComponent(release.id)}/files/${encodeURIComponent(filename)}`,
          url.origin,
        );
        const token = tokenByFilename.get(filename);
        if (token) fileUrl.searchParams.set('token', token);
        return fileUrl.toString();
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
