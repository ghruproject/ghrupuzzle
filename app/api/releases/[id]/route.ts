import { getEnv } from '@/lib/cloudflare';
import { jsonError, optionalUser, requireReleaseAccess } from '@/lib/assessment';
import {
  buildParticipantSampleView,
  participantDownloadFiles,
  participantObjectKey,
  type ParticipantManifest,
} from '@/lib/participant-files';
import type { ScoringPolicy, SubmissionSchema } from '@/lib/release-contract';
import { presignParticipantR2Object, publicR2ObjectUrl } from '@/lib/r2-presign';

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
    const manifest = (await object.json()) as ParticipantManifest & {
      title: string;
      description: string;
      samples: Array<{
        sample_id: string;
        files: Record<
          string,
          { filename: string; size?: number; sha256?: string; url?: string }
        >;
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
    const directUrlByFilename = new Map<string, string>();
    const participantFiles = participantDownloadFiles(manifest);
    if (release.mode === 'challenge') {
      await Promise.all(
        participantFiles.map(async (file) => {
          const key = participantObjectKey(manifest, prefix, file.filename);
          if (!key) throw new Error(`Participant file is not in the manifest: ${file.filename}`);
          directUrlByFilename.set(
            file.filename,
            await presignParticipantR2Object(env, key),
          );
        }),
      );
    } else {
      for (const file of participantFiles) {
        const key = participantObjectKey(manifest, prefix, file.filename);
        if (!key) throw new Error(`Participant file is not in the manifest: ${file.filename}`);
        directUrlByFilename.set(
          file.filename,
          publicR2ObjectUrl(env.PRACTICE_R2_PUBLIC_URL, key),
        );
      }
    }
    const fileUrl = (file: { filename: string }) => {
      const directUrl = directUrlByFilename.get(file.filename);
      if (!directUrl) throw new Error(`No direct R2 URL for ${file.filename}`);
      return directUrl;
    };
    const samples = manifest.samples.map((sample) => {
      if (!sample.sample_id) throw new Error('Release sample is missing its public identifier');
      return buildParticipantSampleView(
        { ...sample, sample_id: sample.sample_id },
        fileUrl,
      );
    });
    return Response.json({
      samples,
      answer_sheet: { species: [] },
      sample_sheet: {
        filename: manifest.sample_sheet?.filename ?? 'sample_sheet.csv',
        url: fileUrl({ filename: manifest.sample_sheet?.filename ?? 'sample_sheet.csv' }),
      },
      bulk_download: {
        curl: `/api/releases/${encodeURIComponent(release.id)}/download-script?tool=curl`,
        wget: `/api/releases/${encodeURIComponent(release.id)}/download-script?tool=wget`,
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
