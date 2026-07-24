export const SUPPORTED_RELEASE_SCHEMA_VERSIONS = new Set(['2.0', '2.1']);

export interface ContractCondition {
  field: string;
  equals: string;
}

export type ContractScorer = 'identifier' | 'exact' | 'unordered_list' | 'partition';

export type ContractNormalizer =
  | 'identifier'
  | 'integer'
  | 'qc_status'
  | 'sequence_type'
  | 'species'
  | 'trim'
  | 'trim_casefold'
  | 'unordered_list'
  | 'upper';

export interface SubmissionField {
  name: string;
  label: string;
  description: string;
  type: 'string';
  identifier: boolean;
  required: boolean;
  required_when?: ContractCondition | null;
  allowed_values?: string[];
  aliases: string[];
  normalizer: ContractNormalizer;
  scored: boolean;
  scorer: ContractScorer;
}

export interface SubmissionSchema {
  schema_version: string;
  release_id: string;
  exercise: 'typing' | 'assembly' | 'hybrid' | 'outbreak';
  mode: 'practice' | 'challenge';
  fields: SubmissionField[];
}

export interface ScoringField {
  name: string;
  scored: boolean;
  scorer: Exclude<ContractScorer, 'identifier'>;
  normalizer?: ContractNormalizer;
  weight: number;
  aliases: string[];
  score_when?: ContractCondition | null;
}

export interface ScoringPolicy {
  schema_version: string;
  release_id: string;
  scorer_version: string;
  pass_threshold: number;
  require_all_samples: boolean;
  reject_unexpected_samples: boolean;
  fields: ScoringField[];
  manual_review?: {
    enabled?: boolean;
    flag_on_parse_error?: boolean;
    flag_within_pass_margin?: number;
  };
}

export interface AnswerKeyContractMetadata {
  schema_version: string;
  release_id: string;
  exercise: string;
  mode: string;
}

export function assertMatchingReleaseContracts({
  releaseId,
  exercise,
  mode,
  requestedSchemaVersion,
  manifest,
  releaseIndex,
  complete,
  submissionSchema,
  answerKey,
  scoringPolicy,
}: {
  releaseId: string;
  exercise: string;
  mode: 'practice' | 'challenge';
  requestedSchemaVersion?: string;
  manifest: Record<string, unknown>;
  releaseIndex: Record<string, unknown>;
  complete: Record<string, unknown>;
  submissionSchema: SubmissionSchema;
  answerKey: AnswerKeyContractMetadata;
  scoringPolicy: ScoringPolicy;
}): string {
  const schemaVersion = manifest.schema_version;
  if (!isSupportedReleaseSchemaVersion(schemaVersion)) {
    throw new Error(`Unsupported release schema version: ${String(schemaVersion)}`);
  }
  if (requestedSchemaVersion && requestedSchemaVersion !== schemaVersion) {
    throw new Error('Requested schema version does not match the uploaded release');
  }
  const metadata = [
    ['release index', releaseIndex],
    ['submission schema', submissionSchema],
    ['answer key', answerKey],
    ['scoring policy', scoringPolicy],
  ] as const;
  for (const [label, contract] of metadata) {
    if (contract.schema_version !== schemaVersion) {
      throw new Error(`${label} schema version does not match the manifest`);
    }
    if (contract.release_id !== releaseId) {
      throw new Error(`${label} release identifier does not match the request`);
    }
  }
  if (
    manifest.release_id !== releaseId
    || manifest.exercise !== exercise
    || manifest.mode !== mode
    || submissionSchema.exercise !== exercise
    || submissionSchema.mode !== mode
    || answerKey.exercise !== exercise
    || answerKey.mode !== mode
    || releaseIndex.exercise !== exercise
    || releaseIndex.mode !== mode
    || complete.release_id !== releaseId
    || complete.status !== 'complete'
  ) {
    throw new Error('Uploaded release metadata does not match the registration request');
  }
  if (!submissionSchema.fields.length || !scoringPolicy.fields.length) {
    throw new Error('Submission or scoring field contract is empty');
  }
  const submissionFields = new Set(submissionSchema.fields.map((field) => field.name));
  const identifiers = submissionSchema.fields.filter((field) => field.identifier);
  if (identifiers.length !== 1 || identifiers[0].name !== 'sample_id') {
    throw new Error('Submission schema requires one sample_id identifier field');
  }
  for (const field of scoringPolicy.fields) {
    if (!submissionFields.has(field.name)) {
      throw new Error(`Scoring field ${field.name} is absent from the submission schema`);
    }
  }
  return schemaVersion;
}

export function isSupportedReleaseSchemaVersion(value: unknown): value is string {
  return typeof value === 'string' && SUPPORTED_RELEASE_SCHEMA_VERSIONS.has(value);
}

export function conditionMatches(
  condition: ContractCondition | null | undefined,
  values: Record<string, unknown>,
): boolean {
  if (!condition) return true;
  return normaliseConditionValue(values[condition.field])
    === normaliseConditionValue(condition.equals);
}

function normaliseConditionValue(value: unknown): string {
  return String(value ?? '').normalize('NFKC').trim().toLocaleUpperCase('en');
}
