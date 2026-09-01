import type { SubmissionField } from './release-contract';

export type SubmissionDraftRows = Record<string, Record<string, string>>;

interface StoredSubmissionDraft {
  version: 1;
  contract: string;
  savedAt: string;
  rows: SubmissionDraftRows;
}

export interface RestoredSubmissionDraft {
  savedAt: string;
  rows: SubmissionDraftRows;
}

export function buildInitialSubmissionRows(sampleIds: string[]): SubmissionDraftRows {
  return Object.fromEntries(
    sampleIds.map((sampleId) => [
      sampleId,
      {
        sample_id: sampleId,
        failure_reason: 'NONE',
      },
    ]),
  );
}

export function submissionDraftStorageKey(
  userId: string,
  releaseId: string,
  publishedReleaseId: string,
): string {
  return [
    'ghrupuzzles',
    'submission-draft',
    'v1',
    encodeURIComponent(userId),
    encodeURIComponent(releaseId),
    encodeURIComponent(publishedReleaseId),
  ].join(':');
}

export function submissionDraftContract(
  publishedReleaseId: string,
  sampleIds: string[],
  fields: SubmissionField[],
): string {
  return JSON.stringify([
    publishedReleaseId,
    sampleIds,
    fields.map((field) => [field.name, field.allowed_values ?? null]),
  ]);
}

export function serialiseSubmissionDraft(
  contract: string,
  rows: SubmissionDraftRows,
  savedAt: string,
): string {
  return JSON.stringify({
    version: 1,
    contract,
    savedAt,
    rows,
  } satisfies StoredSubmissionDraft);
}

export function restoreSubmissionDraft(
  value: string | null,
  contract: string,
  sampleIds: string[],
  fields: SubmissionField[],
): RestoredSubmissionDraft | null {
  if (!value) return null;

  let stored: StoredSubmissionDraft;
  try {
    stored = JSON.parse(value) as StoredSubmissionDraft;
  } catch {
    return null;
  }
  if (
    !stored
    || typeof stored !== 'object'
    || Array.isArray(stored)
    || stored.version !== 1
    || stored.contract !== contract
    || typeof stored.savedAt !== 'string'
    || Number.isNaN(Date.parse(stored.savedAt))
    || !stored.rows
    || typeof stored.rows !== 'object'
    || Array.isArray(stored.rows)
  ) {
    return null;
  }

  const initialRows = buildInitialSubmissionRows(sampleIds);
  const fieldMap = new Map(fields.map((field) => [field.name, field]));
  for (const sampleId of sampleIds) {
    const storedRow = stored.rows[sampleId];
    if (!storedRow || typeof storedRow !== 'object' || Array.isArray(storedRow)) continue;
    for (const [fieldName, rawValue] of Object.entries(storedRow)) {
      const field = fieldMap.get(fieldName);
      if (!field || field.identifier || typeof rawValue !== 'string') continue;
      if (field.allowed_values?.length && rawValue && !field.allowed_values.includes(rawValue)) {
        continue;
      }
      initialRows[sampleId][fieldName] = rawValue;
    }
  }

  return { savedAt: stored.savedAt, rows: initialRows };
}
