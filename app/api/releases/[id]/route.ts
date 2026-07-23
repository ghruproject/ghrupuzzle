import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireReleaseAccess, requireUser } from '@/lib/assessment';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    const { id } = await context.params;
    const release = await requireReleaseAccess(env, id, user.id, 'download');
    const bucket = release.mode === 'practice' ? env.PRACTICE_ASSETS : env.PRIVATE_ASSETS;
    const object = await bucket.get(release.manifestKey);
    if (!object) {
      return Response.json({ error: 'Release manifest is unavailable' }, { status: 503 });
    }
    const manifest = (await object.json()) as {
      samples: Array<{
        sample_id: string;
        files: Record<string, { filename: string }>;
        metadata?: Record<string, unknown>;
      }>;
    };
    const fileUrl = (filename: string) =>
      `/api/releases/${encodeURIComponent(release.id)}/files/${encodeURIComponent(filename)}`;
    const samples = manifest.samples.map((sample) => {
      const row: Record<string, unknown> = {
        public_name: sample.sample_id,
        ...sample.metadata,
      };
      if (sample.files.assembly) row.FASTA_URL = fileUrl(sample.files.assembly.filename);
      if (sample.files.read_1) row.R1_URL = fileUrl(sample.files.read_1.filename);
      if (sample.files.read_2) row.R2_URL = fileUrl(sample.files.read_2.filename);
      if (sample.files.long_reads) {
        row.LONG_READ_URL = fileUrl(sample.files.long_reads.filename);
      }
      return row;
    });
    return Response.json({
      samples,
      answer_sheet: { species: [] },
      sample_sheet: {
        filename: 'sample_sheet.csv',
        url: fileUrl('sample_sheet.csv'),
      },
      release_date: release.opensAt,
      access: {
        releaseDatabaseId: release.id,
        mode: release.mode,
        opensAt: release.opensAt,
        closesAt: release.closesAt,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
