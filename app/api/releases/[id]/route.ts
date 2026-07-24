import { getEnv } from '@/lib/cloudflare';
import { jsonError, optionalUser, requireReleaseAccess } from '@/lib/assessment';
import { buildParticipantSampleView } from '@/lib/participant-files';
import type { ScoringPolicy, SubmissionSchema } from '@/lib/release-contract';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await optionalUser(request);
    const { id } = await context.params;
    const release = await requireReleaseAccess(env, id, user?.id ?? null, 'download');
    const bucket = release.mode === 'practice' ? env.PRACTICE_ASSETS : env.PRIVATE_ASSETS;
    const prefix = release.manifestKey.slice(0, release.manifestKey.lastIndexOf('/'));
    const policyKey = release.answerKey.replace(/answer_key\.json$/, 'scoring_policy.json');
    const [object, submissionObject, instructionsObject, policyObject] = await Promise.all([
      bucket.get(release.manifestKey),
      bucket.get(`${prefix}/submission_schema.json`),
      bucket.get(`${prefix}/instructions.md`),
      env.PRIVATE_ASSETS.get(policyKey),
    ]);
    if (!object || !submissionObject || !instructionsObject || !policyObject) {
      return Response.json({ error: 'Release manifest is unavailable' }, { status: 503 });
    }
    const manifest = (await object.json()) as {
      title: string;
      description: string;
      samples: Array<{
        sample_id: string;
        files: Record<string, { filename: string; size?: number }>;
        metadata?: Record<string, unknown>;
      }>;
    };
    const submission = (await submissionObject.json()) as SubmissionSchema;
    const policy = (await policyObject.json()) as ScoringPolicy;
    if (
      submission.release_id !== release.releaseId
      || submission.exercise !== release.exercise
      || submission.mode !== release.mode
      || submission.schema_version !== release.schemaVersion
      || policy.release_id !== release.releaseId
      || policy.schema_version !== release.schemaVersion
    ) {
      throw new Error(`Release contracts do not match registration ${release.id}`);
    }
    const scoringFields = new Map(policy.fields.map((field) => [field.name, field]));
    const instructionText = await instructionsObject.text();
    const instructions = instructionText
      .split(/\r?\n/)
      .map((line) => line.match(/^\d+\.\s+(.+)$/)?.[1])
      .filter((line): line is string => Boolean(line));
    const fileUrl = (filename: string) =>
      `/api/releases/${encodeURIComponent(release.id)}/files/${encodeURIComponent(filename)}`;
    const samples = manifest.samples.map((sample) =>
      buildParticipantSampleView(sample, fileUrl),
    );
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
          score_when: scoringFields.get(field.name)?.score_when ?? null,
          scored: scoringFields.get(field.name)?.scored ?? field.scored,
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
