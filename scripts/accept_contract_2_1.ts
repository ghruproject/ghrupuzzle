import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  assertMatchingReleaseContracts,
  type ScoringPolicy,
  type SubmissionField,
  type SubmissionSchema,
} from '../lib/release-contract';
import { scoreSubmission, type AnswerKey } from '../lib/scoring';

const RELEASES = [
  '2026-website-typing-practice',
  '2026-website-assembly-practice',
  '2026-website-hybrid-practice',
  '2026-website-outbreak-practice',
  'challenge-2-typing',
  'challenge-2-assembly',
  'challenge-2-hybrid',
  'challenge-2-outbreak',
] as const;

interface DatasetManifest {
  schema_version: string;
  release_id: string;
  exercise: SubmissionSchema['exercise'];
  mode: SubmissionSchema['mode'];
  samples: Array<{
    sample_id: string;
    files: Record<string, { filename: string; size: number; sha256: string }>;
  }>;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function participantValue(
  field: SubmissionField,
  answers: Record<string, unknown>,
  clusterLabels: Map<string, string>,
): string {
  if (field.identifier) return '';
  const qc = String(answers.qc_status ?? '');
  if (qc === 'FAIL' && !['qc_status', 'failure_reason'].includes(field.name)) {
    return '';
  }
  const raw = String(answers[field.name] ?? '');
  if (field.scorer === 'partition') {
    if (!raw) return '';
    if (!clusterLabels.has(raw)) {
      clusterLabels.set(raw, `participant-group-${clusterLabels.size + 1}`);
    }
    return clusterLabels.get(raw) ?? '';
  }
  if (field.normalizer === 'sequence_type' && raw) return `ST${raw}`;
  if (field.normalizer === 'species' && raw) return `  ${raw.toLocaleUpperCase('en')}  `;
  if (field.normalizer === 'unordered_list' && raw) {
    return raw.split(/[,;|]+/).reverse().join(' ; ');
  }
  if (field.name === 'wzi' && raw === '-') return '';
  return raw;
}

function buildPerfectParticipantSheet(
  schema: SubmissionSchema,
  answerKey: AnswerKey,
): string {
  const clusterLabels = new Map<string, string>();
  const rows = answerKey.samples.map((sample) =>
    schema.fields.map((field) =>
      escapeCsv(
        field.identifier
          ? sample.sample_id
          : participantValue(field, sample.answers, clusterLabels),
      ),
    ).join(','),
  );
  return [
    schema.fields.map((field) => escapeCsv(field.name)).join(','),
    ...rows,
  ].join('\n');
}

async function main(): Promise<void> {
  const contractRoot = process.argv[2];
  if (!contractRoot) {
    throw new Error('Usage: tsx scripts/accept_contract_2_1.ts <downloaded-contract-directory>');
  }
  let totalSamples = 0;
  let zeroByteFiles = 0;
  for (const releaseId of RELEASES) {
    const directory = join(contractRoot, releaseId);
    const [manifest, releaseIndex, complete, schema, answerKey, policy] = await Promise.all([
      readJson<DatasetManifest>(join(directory, 'dataset_manifest.json')),
      readJson<Record<string, unknown>>(join(directory, 'release.json')),
      readJson<Record<string, unknown>>(join(directory, 'COMPLETE.json')),
      readJson<SubmissionSchema>(join(directory, 'submission_schema.json')),
      readJson<AnswerKey>(join(directory, 'answer_key.json')),
      readJson<ScoringPolicy>(join(directory, 'scoring_policy.json')),
    ]);
    assert.equal(basename(directory), releaseId);
    assert.equal(manifest.schema_version, '2.1');
    assert.equal(schema.schema_version, '2.1');
    assert.equal(answerKey.schema_version, '2.1');
    assert.equal(policy.schema_version, '2.1');
    assertMatchingReleaseContracts({
      releaseId,
      exercise: manifest.exercise,
      mode: manifest.mode,
      requestedSchemaVersion: '2.1',
      manifest: manifest as unknown as Record<string, unknown>,
      releaseIndex,
      complete,
      submissionSchema: schema,
      answerKey,
      scoringPolicy: policy,
    });
    assert.deepEqual(
      manifest.samples.map((sample) => sample.sample_id),
      answerKey.samples.map((sample) => sample.sample_id),
      `${releaseId} manifest and answer-key sample order differs`,
    );
    assert.ok(
      !JSON.stringify(manifest).includes('/private/'),
      `${releaseId} public manifest contains a private path`,
    );
    for (const sample of manifest.samples) {
      for (const file of Object.values(sample.files)) {
        assert.equal(basename(file.filename), file.filename);
        assert.match(file.sha256, /^[a-f0-9]{64}$/);
        assert.ok(file.size >= 0);
        if (file.size === 0) zeroByteFiles += 1;
      }
    }
    const score = scoreSubmission(
      buildPerfectParticipantSheet(schema, answerKey),
      answerKey,
      policy,
      schema,
    );
    assert.equal(score.earned, score.possible, `${releaseId} blinded-equivalent sheet did not score fully`);
    assert.equal(score.passed, true, `${releaseId} blinded-equivalent sheet did not pass`);
    const truthFailures = answerKey.samples.filter(
      (sample) => sample.answers.qc_status === 'FAIL',
    );
    for (const sample of truthFailures) {
      assert.deepEqual(
        score.items
          .filter((item) => item.sampleId === sample.sample_id)
          .map((item) => item.field),
        ['qc_status', 'failure_reason'],
        `${releaseId} scored unavailable analytical fields for ${sample.sample_id}`,
      );
    }
    totalSamples += manifest.samples.length;
    process.stdout.write(
      `PASS ${releaseId}: ${manifest.samples.length} samples, ${score.possible} weighted points\n`,
    );
  }
  assert.equal(totalSamples, 69);
  assert.ok(zeroByteFiles >= 6, 'Expected assessment zero-byte files were not represented');
  process.stdout.write(
    `PASS all schema 2.1 contracts: ${RELEASES.length} releases, ${totalSamples} samples, ${zeroByteFiles} zero-byte files represented\n`,
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
