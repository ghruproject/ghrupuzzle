import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireReleaseAccess, requireUser } from '@/lib/assessment';

interface PublicManifest {
  samples: Array<{ files: Record<string, { filename: string }> }>;
  sample_sheet?: { filename?: string };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; filename: string }> },
): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    const { id, filename } = await context.params;
    if (filename !== filename.split(/[\\/]/).pop()) {
      return new Response('Invalid filename', { status: 400 });
    }
    const release = await requireReleaseAccess(env, id, user.id, 'download');
    const bucket = release.mode === 'practice' ? env.PRACTICE_ASSETS : env.PRIVATE_ASSETS;
    const manifestObject = await bucket.get(release.manifestKey);
    if (!manifestObject) {
      return new Response('Release manifest unavailable', { status: 503 });
    }
    const manifest = (await manifestObject.json()) as PublicManifest;
    const allowed = new Set(
      manifest.samples.flatMap((sample) =>
        Object.values(sample.files).map((details) => details.filename),
      ),
    );
    if (filename === 'sample_sheet.csv') {
      allowed.add(filename);
    }
    if (!allowed.has(filename)) {
      return new Response('File not found', { status: 404 });
    }
    const prefix = release.manifestKey.slice(0, release.manifestKey.lastIndexOf('/'));
    const key =
      filename === 'sample_sheet.csv'
        ? `${prefix}/sample_sheet.csv`
        : `${prefix}/files/${filename}`;
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
