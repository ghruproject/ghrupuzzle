import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireReleaseAccess, requireUser } from '@/lib/assessment';

const FIELD_GUIDANCE: Partial<
  Record<
    'typing' | 'assembly' | 'hybrid' | 'outbreak',
    Record<string, string>
  >
> = {
  assembly: {
    error:
      'Detected problem type. Leave blank when no problem is detected; otherwise use CONTAMINATED or LOW_COVERAGE.',
  },
  hybrid: {
    error:
      'Detected problem type. Leave blank when no problem is detected; otherwise use CONTAMINATED or LOW_LONG_COVERAGE.',
  },
};

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
    const prefix = release.manifestKey.slice(0, release.manifestKey.lastIndexOf('/'));
    const [object, submissionObject, instructionsObject] = await Promise.all([
      bucket.get(release.manifestKey),
      bucket.get(`${prefix}/submission_schema.json`),
      bucket.get(`${prefix}/instructions.md`),
    ]);
    if (!object || !submissionObject || !instructionsObject) {
      return Response.json({ error: 'Release manifest is unavailable' }, { status: 503 });
    }
    const manifest = (await object.json()) as {
      title: string;
      description: string;
      samples: Array<{
        sample_id: string;
        files: Record<string, { filename: string }>;
        metadata?: Record<string, unknown>;
      }>;
    };
    const submission = (await submissionObject.json()) as {
      fields: Array<{
        name: string;
        label: string;
        description: string;
        required: boolean;
        scored: boolean;
      }>;
    };
    const instructionText = await instructionsObject.text();
    const instructions = instructionText
      .split(/\r?\n/)
      .map((line) => line.match(/^\d+\.\s+(.+)$/)?.[1])
      .filter((line): line is string => Boolean(line));
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
      releaseDefinition: {
        title: manifest.title,
        description: manifest.description,
        instructions,
        fields: submission.fields.map((field) => ({
          ...field,
          description:
            FIELD_GUIDANCE[release.exercise]?.[field.name] ?? field.description,
        })),
      },
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
