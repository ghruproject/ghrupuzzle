import {
  conditionMatches,
  type ContractNormalizer,
  type ScoringPolicy,
  type SubmissionSchema,
} from './release-contract';
export type { ScoringPolicy } from './release-contract';

export interface AnswerSample {
  sample_id: string;
  answers: Record<string, unknown>;
}

export interface AnswerKey {
  schema_version: string;
  release_id: string;
  exercise: string;
  mode: 'practice' | 'challenge';
  samples: AnswerSample[];
}

export interface ScoreResult {
  earned: number;
  possible: number;
  passed: boolean;
  missingSamples: string[];
  unexpectedSamples: string[];
  items: Array<{
    sampleId: string;
    field: string;
    correct: boolean;
    submitted: string;
    expected: string;
    weight: number;
  }>;
  validationIssues?: SubmissionValidationIssue[];
}

const SAMPLE_ID_FIELDS = ['sample_id', 'sample', 'id', 'public_name'];
const UNSCORED_FIELDS = new Set(['analysis_status', 'fasta', 'r1', 'r2', 'long_reads']);
const CONTROLLED_TOKEN_FIELDS = new Set(['error', 'qc', 'qc_decision']);
const MISSING_VALUE_TOKENS = new Set(['', '-', 'na', 'n/a', 'none', 'not applicable']);
const UNCLUSTERED_TOKENS = new Set([
  '',
  '-',
  'na',
  'n/a',
  'none',
  'not applicable',
  'unclustered',
  'not clustered',
  'no cluster',
  'singleton',
]);

type Delimiter = ',' | '\t';

export class SubmissionValidationError extends Error {
  readonly issues: SubmissionValidationIssue[];

  constructor(message: string, issues: SubmissionValidationIssue[] = []) {
    super(message);
    this.name = 'SubmissionValidationError';
    this.issues = issues;
  }
}

export interface SubmissionValidationIssue {
  row: number | null;
  sampleId?: string;
  field: string;
  message: string;
}

export function detectDelimiter(text: string): Delimiter {
  const source = text.replace(/^\uFEFF/, '');
  if (!source.trim()) {
    throw new SubmissionValidationError('Result sheet is empty');
  }
  let quoted = false;
  let commas = 0;
  let tabs = 0;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (character === '\n' || character === '\r')) {
      break;
    } else if (!quoted && character === ',') {
      commas += 1;
    } else if (!quoted && character === '\t') {
      tabs += 1;
    }
  }
  if (commas === 0 && tabs === 0) {
    throw new SubmissionValidationError(
      'Result sheet must be comma-separated CSV or tab-separated TSV with a header row',
    );
  }
  if (commas > 0 && tabs > 0 && commas === tabs) {
    throw new SubmissionValidationError(
      'Result-sheet delimiter is ambiguous; use either CSV commas or TSV tabs consistently',
    );
  }
  return tabs > commas ? '\t' : ',';
}

export function parseDelimitedText(text: string): Array<Record<string, string>> {
  const source = text.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let quoteClosed = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        quoteClosed = true;
      } else {
        field += character;
      }
    } else if (quoteClosed) {
      if (character === delimiter) {
        row.push(field);
        field = '';
        quoteClosed = false;
      } else if (character === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        quoteClosed = false;
      } else if (character !== '\r' && !/\s/.test(character)) {
        throw new SubmissionValidationError(
          'Result sheet contains text after a closing quote; check its quoting',
        );
      }
    } else if (character === '"') {
      if (field.trim()) {
        throw new SubmissionValidationError(
          'Result sheet contains a quote inside an unquoted value; check its quoting',
        );
      }
      field = '';
      quoted = true;
    } else if (character === delimiter) {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (quoted) {
    throw new SubmissionValidationError('Result sheet contains an unterminated quoted field');
  }
  if (quoteClosed || field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  const populatedRows = rows.filter((values, index) =>
    index === 0 || values.some((value) => value.trim()),
  );
  if (populatedRows.length < 2) {
    throw new SubmissionValidationError(
      'Result sheet must contain a header and at least one result row',
    );
  }
  const headers = populatedRows[0].map(normalizeKey);
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) {
    throw new SubmissionValidationError(
      'Result sheet contains blank or duplicate column names',
    );
  }
  return populatedRows
    .slice(1)
    .map((values, index) => {
      if (values.length !== headers.length) {
        throw new SubmissionValidationError(
          `Result sheet row ${index + 2} has ${values.length} columns; expected ${headers.length}. Check the delimiter and quoting`,
        );
      }
      return Object.fromEntries(
        headers.map((header, column) => [header, values[column].trim()]),
      );
    });
}

export function parseCsv(text: string): Array<Record<string, string>> {
  return parseDelimitedText(text);
}

export function scoreSubmission(
  csvText: string,
  answerKey: AnswerKey,
  policy?: ScoringPolicy,
  schema?: SubmissionSchema,
): ScoreResult {
  validateScoringContract(answerKey, policy, schema);
  const rows = parseDelimitedText(csvText);
  const schemaIdentifier = schema?.fields.find((field) => field.identifier);
  const sampleField = [
    schemaIdentifier?.name,
    ...(schemaIdentifier?.aliases ?? []),
    ...SAMPLE_ID_FIELDS,
  ]
    .filter((field): field is string => Boolean(field))
    .map(normalizeKey)
    .find((field) => field in rows[0]);
  if (!sampleField) {
    throw new SubmissionValidationError(
      `Result sheet requires one sample identifier column: ${SAMPLE_ID_FIELDS.join(', ')}`,
    );
  }
  const scoredDefinitions = policy?.fields.filter((field) => field.scored);
  const inferredFields = policy
    ? []
    : [
        ...new Set(
          answerKey.samples.flatMap((sample) =>
            Object.keys(sample.answers)
              .map(normalizeKey)
              .filter((field) => !UNSCORED_FIELDS.has(field)),
          ),
        ),
      ];
  const missingColumns = scoredDefinitions
    ? scoredDefinitions
        .filter(
          (definition) =>
            ![definition.name, ...definition.aliases]
              .map(normalizeKey)
              .some((candidate) => candidate in rows[0]),
        )
        .map((definition) => normalizeKey(definition.name))
    : inferredFields.filter((field) => !(field in rows[0]));
  if (missingColumns.length) {
    throw new SubmissionValidationError(
      `Result sheet is missing assessed ${plural(missingColumns.length, 'column')}: ${missingColumns.join(', ')}`,
    );
  }
  const validationIssues = schema
    ? validateSubmissionRows(rows, sampleField, answerKey, schema)
    : [];
  if (validationIssues.length) {
    throw new SubmissionValidationError(
      summariseValidationIssues(validationIssues),
      validationIssues,
    );
  }
  const submitted = new Map<string, Record<string, string>>();
  const submittedLabels = new Map<string, string>();
  for (const row of rows) {
    const sampleId = row[sampleField].trim();
    const sampleKey = normalizeSampleId(sampleId);
    if (!sampleKey || submitted.has(sampleKey)) {
      throw new SubmissionValidationError(
        'Result sheet contains a blank or duplicate sample identifier',
      );
    }
    submitted.set(sampleKey, row);
    submittedLabels.set(sampleKey, sampleId);
  }

  const expectedIds = new Set(answerKey.samples.map((sample) => normalizeSampleId(sample.sample_id)));
  const unexpectedSamples = [...submitted.keys()]
    .filter((id) => !expectedIds.has(id))
    .map((id) => submittedLabels.get(id) ?? id);
  const items: ScoreResult['items'] = [];
  const missingSamples: string[] = [];
  const policyFields = scoredDefinitions;
  for (const sample of answerKey.samples) {
    const row = submitted.get(normalizeSampleId(sample.sample_id));
    if (!row) {
      missingSamples.push(sample.sample_id);
    }
    const expectedEntries = policyFields
      ? policyFields
          .filter((definition) => definition.scorer !== 'partition')
          .filter((definition) => conditionMatches(definition.score_when, sample.answers))
          .map((definition) => [definition.name, sample.answers[definition.name], definition] as const)
      : Object.entries(sample.answers).map(
          ([name, expected]) =>
            [name, expected, undefined] as const,
        );
    for (const [rawField, rawExpected, definition] of expectedEntries) {
      const field = normalizeKey(rawField);
      if (UNSCORED_FIELDS.has(field) || (answerKey.exercise === 'outbreak' && field === 'cluster')) {
        continue;
      }
      const scorer = definition?.scorer ?? (field === 'bla_carb' ? 'unordered_list' : 'exact');
      const expected = normalizeValue(
        rawExpected,
        field,
        scorer,
        definition?.normalizer,
      );
      const submittedValue = submittedField(row, field, definition?.aliases ?? []);
      const actual = normalizeValue(
        submittedValue,
        field,
        scorer,
        definition?.normalizer,
      );
      const eligibleSampleCount = definition
        ? answerKey.samples.filter((candidate) =>
            conditionMatches(definition.score_when, candidate.answers),
          ).length
        : answerKey.samples.length;
      items.push({
        sampleId: sample.sample_id,
        field,
        correct: Boolean(row) && actual === expected,
        submitted: submittedValue,
        expected: String(rawExpected ?? ''),
        weight: definition
          ? definition.weight / eligibleSampleCount
          : 1,
      });
    }
  }
  const partitionField = policyFields?.find((field) => field.scorer === 'partition');
  if (partitionField) {
    scoreClusterPairs(
      answerKey,
      submitted,
      items,
      partitionField.name,
      partitionField.aliases,
      partitionField.weight,
      partitionField.score_when,
      partitionField.normalizer,
    );
  } else if (answerKey.exercise === 'outbreak') {
    scoreClusterPairs(answerKey, submitted, items, 'cluster', [], undefined);
  }
  if (!items.length) {
    throw new Error('answer key contains no scoreable fields');
  }
  const rawEarned = items.reduce(
    (total, item) => total + (item.correct ? item.weight : 0),
    0,
  );
  const rawPossible = items.reduce((total, item) => total + item.weight, 0);
  const earned = roundScore(rawEarned);
  const possible = roundScore(rawPossible);
  const passThreshold = policy?.pass_threshold ?? 0.8;
  const completeEnough = policy?.require_all_samples === false || missingSamples.length === 0;
  const unexpectedOkay =
    policy?.reject_unexpected_samples === false || unexpectedSamples.length === 0;
  return {
    earned,
    possible,
    passed: rawEarned / rawPossible >= passThreshold && completeEnough && unexpectedOkay,
    missingSamples,
    unexpectedSamples,
    items,
    validationIssues,
  };
}

export function validateSubmissionCompleteness(
  result: ScoreResult,
  policy?: ScoringPolicy,
): void {
  const missingCount = policy?.require_all_samples === false ? 0 : result.missingSamples.length;
  const unexpectedCount =
    policy?.reject_unexpected_samples === false ? 0 : result.unexpectedSamples.length;
  if (!missingCount && !unexpectedCount) {
    return;
  }
  const issues = [
    missingCount
      ? `missing ${missingCount} expected ${plural(missingCount, 'sample')}`
      : '',
    unexpectedCount
      ? `contains ${unexpectedCount} unrecognised sample ${plural(unexpectedCount, 'identifier')}`
      : '',
  ].filter(Boolean);
  throw new SubmissionValidationError(
    `Result sheet ${issues.join(' and ')}. Use the supplied sample sheet without adding or removing sample rows`,
  );
}

function submittedField(
  row: Record<string, string> | undefined,
  field: string,
  aliases: string[],
): string {
  if (!row) return '';
  for (const candidate of [field, ...aliases.map(normalizeKey)]) {
    if (candidate in row) return row[candidate];
  }
  return '';
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function normalizeSampleId(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en');
}

function normalizeValue(
  value: unknown,
  field = '',
  scorer: ScoringPolicy['fields'][number]['scorer'] = 'exact',
  normalizer?: ContractNormalizer,
): string {
  if (normalizer === 'unordered_list' || scorer === 'unordered_list') {
    const values = Array.isArray(value) ? value : String(value ?? '').split(/[,;|\n]+/);
    return [...new Set(values.map((item) => normalizeCasefold(item, true)).filter(Boolean))]
      .sort()
      .join(',');
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeContractValue(item, field, normalizer)).join(',');
  }
  return normalizeContractValue(value, field, normalizer);
}

function normalizeContractValue(
  value: unknown,
  field: string,
  normalizer?: ContractNormalizer,
): string {
  const trimmed = String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  switch (normalizer) {
    case 'identifier':
      return normalizeSampleId(trimmed);
    case 'integer':
      return /^[-+]?\d+$/.test(trimmed) ? BigInt(trimmed).toString() : trimmed;
    case 'qc_status':
      return trimmed.toLocaleUpperCase('en').replace(/[\s-]+/g, '_');
    case 'sequence_type':
      return normalizeCasefold(trimmed.replace(/^st[\s:_-]*/i, ''), false);
    case 'species':
    case 'trim_casefold':
      return normalizeCasefold(trimmed, true);
    case 'trim':
      return trimmed;
    case 'upper':
      return trimmed.toLocaleUpperCase('en');
    case 'unordered_list':
      return normalizeCasefold(trimmed, true);
    default:
      return normalizeScalarFallback(trimmed, field);
  }
}

function normalizeCasefold(value: unknown, unavailableAsBlank: boolean): string {
  const normalized = String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en');
  if (unavailableAsBlank && MISSING_VALUE_TOKENS.has(normalized)) {
    return '';
  }
  return normalized;
}

function normalizeScalarFallback(value: unknown, field: string): string {
  let normalized = normalizeCasefold(value, true);
  if (CONTROLLED_TOKEN_FIELDS.has(field)) {
    normalized = normalized.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  }
  return normalized;
}

function scoreClusterPairs(
  answerKey: AnswerKey,
  submitted: Map<string, Record<string, string>>,
  items: ScoreResult['items'],
  field: string,
  aliases: string[],
  totalWeight: number | undefined,
  condition = null as ScoringPolicy['fields'][number]['score_when'],
  normalizer?: ContractNormalizer,
): void {
  const eligibleSamples = answerKey.samples.filter((sample) =>
    conditionMatches(condition, sample.answers),
  );
  const pairCount = (eligibleSamples.length * (eligibleSamples.length - 1)) / 2;
  for (let left = 0; left < eligibleSamples.length; left += 1) {
    for (let right = left + 1; right < eligibleSamples.length; right += 1) {
      const a = eligibleSamples[left];
      const b = eligibleSamples[right];
      const expectedA = normalizeValue(a.answers[field], field, 'partition', normalizer);
      const expectedB = normalizeValue(b.answers[field], field, 'partition', normalizer);
      const actualA = normalizeValue(
        submittedField(submitted.get(normalizeSampleId(a.sample_id)), field, aliases),
        field,
        'partition',
        normalizer,
      );
      const actualB = normalizeValue(
        submittedField(submitted.get(normalizeSampleId(b.sample_id)), field, aliases),
        field,
        'partition',
        normalizer,
      );
      const expectedTogether = isCluster(expectedA) && expectedA === expectedB;
      const actualTogether = isCluster(actualA) && actualA === actualB;
      items.push({
        sampleId: a.sample_id,
        field: `${field}_with_${b.sample_id}`,
        correct: Boolean(
          submitted.get(normalizeSampleId(a.sample_id))
            && submitted.get(normalizeSampleId(b.sample_id)),
        )
          && expectedTogether === actualTogether,
        submitted: actualTogether ? 'same cluster' : 'different clusters',
        expected: expectedTogether ? 'same cluster' : 'different clusters',
        weight: totalWeight === undefined ? 1 : totalWeight / pairCount,
      });
    }
  }
}

function isCluster(value: string): boolean {
  return !UNCLUSTERED_TOKENS.has(value);
}

function validateScoringContract(
  answerKey: AnswerKey,
  policy?: ScoringPolicy,
  schema?: SubmissionSchema,
): void {
  if (!answerKey.samples.length) {
    throw new Error('Answer key contains no samples');
  }
  const sampleIds = answerKey.samples.map((sample) => normalizeSampleId(sample.sample_id));
  if (sampleIds.some((sampleId) => !sampleId) || new Set(sampleIds).size !== sampleIds.length) {
    throw new Error('Answer key contains a blank or duplicate sample identifier');
  }
  if (!policy) {
    return;
  }
  if (policy.release_id !== answerKey.release_id) {
    throw new Error('Scoring policy and answer key release identifiers do not match');
  }
  if (schema && (
    schema.release_id !== answerKey.release_id
    || schema.exercise !== answerKey.exercise
    || schema.mode !== answerKey.mode
  )) {
    throw new Error('Submission schema and answer key release metadata do not match');
  }
  if (schema && (
    schema.schema_version !== answerKey.schema_version
    || policy.schema_version !== answerKey.schema_version
  )) {
    throw new Error('Release contract schema versions do not match');
  }
  const scoredFields = policy.fields.filter((field) => field.scored);
  if (!scoredFields.length) {
    throw new Error('Scoring policy contains no assessed fields');
  }
  for (const definition of scoredFields) {
    if (!Number.isFinite(definition.weight) || definition.weight <= 0) {
      throw new Error(`Scoring policy has an invalid weight for ${definition.name}`);
    }
    if (
      answerKey.samples.some(
        (sample) =>
          conditionMatches(definition.score_when, sample.answers)
          && !Object.hasOwn(sample.answers, definition.name),
      )
    ) {
      throw new Error(`Answer key is missing assessed field ${definition.name}`);
    }
  }
}

function validateSubmissionRows(
  rows: Array<Record<string, string>>,
  sampleField: string,
  answerKey: AnswerKey,
  schema: SubmissionSchema,
): SubmissionValidationIssue[] {
  const issues: SubmissionValidationIssue[] = [];
  const expected = new Map(
    answerKey.samples.map((sample) => [normalizeSampleId(sample.sample_id), sample.sample_id]),
  );
  const seen = new Map<string, number>();
  const qcField = schema.fields.find((field) => field.name === 'qc_status');
  const failureField = schema.fields.find((field) => field.name === 'failure_reason');

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const sampleId = row[sampleField]?.trim() ?? '';
    const sampleKey = normalizeSampleId(sampleId);
    if (!sampleKey) {
      issues.push({
        row: rowNumber,
        field: schema.fields.find((field) => field.identifier)?.name ?? 'sample_id',
        message: 'Sample identifier is required.',
      });
    } else if (seen.has(sampleKey)) {
      issues.push({
        row: rowNumber,
        sampleId,
        field: schema.fields.find((field) => field.identifier)?.name ?? 'sample_id',
        message: `Duplicate sample identifier; it first appears on row ${seen.get(sampleKey)}.`,
      });
    } else {
      seen.set(sampleKey, rowNumber);
      if (!expected.has(sampleKey)) {
        issues.push({
          row: rowNumber,
          sampleId,
          field: schema.fields.find((field) => field.identifier)?.name ?? 'sample_id',
          message: 'This sample is not part of the release.',
        });
      }
    }

    const values = Object.fromEntries(
      schema.fields.map((field) => [
        field.name,
        submittedField(row, normalizeKey(field.name), field.aliases),
      ]),
    );
    const qcStatus = qcField
      ? normalizeValue(values[qcField.name], qcField.name, 'exact', qcField.normalizer)
      : '';
    const failed = qcStatus === 'FAIL';

    for (const field of schema.fields) {
      if (field.identifier) continue;
      const submittedValue = String(values[field.name] ?? '');
      const required = !failed && (
        field.required
        || (field.required_when ? conditionMatches(field.required_when, values) : false)
      );
      if (required && !submittedValue.trim()) {
        issues.push({
          row: rowNumber,
          sampleId,
          field: field.name,
          message: `${field.label} is required.`,
        });
        continue;
      }
      if (field.allowed_values?.length && submittedValue.trim()) {
        const normalised = normalizeValue(
          submittedValue,
          field.name,
          field.scorer === 'identifier' ? 'exact' : field.scorer,
          field.normalizer,
        );
        const allowed = field.allowed_values.map((value) =>
          normalizeValue(
            value,
            field.name,
            field.scorer === 'identifier' ? 'exact' : field.scorer,
            field.normalizer,
          ),
        );
        if (!allowed.includes(normalised)) {
          issues.push({
            row: rowNumber,
            sampleId,
            field: field.name,
            message: `Use one of: ${field.allowed_values.join(', ')}.`,
          });
        }
      }
    }

    if (qcField && failureField) {
      const reason = normalizeValue(
        values[failureField.name],
        failureField.name,
        'exact',
        failureField.normalizer,
      );
      if (qcStatus === 'PASS' && reason !== 'NONE') {
        issues.push({
          row: rowNumber,
          sampleId,
          field: failureField.name,
          message: 'A passing sample must use NONE.',
        });
      } else if (qcStatus === 'FAIL' && (!reason || reason === 'NONE')) {
        issues.push({
          row: rowNumber,
          sampleId,
          field: failureField.name,
          message: 'A failed sample requires a non-NONE failure reason.',
        });
      }
    }
  });

  for (const [sampleKey, sampleId] of expected) {
    if (!seen.has(sampleKey)) {
      issues.push({
        row: null,
        sampleId,
        field: schema.fields.find((field) => field.identifier)?.name ?? 'sample_id',
        message: `Missing sample row: ${sampleId}.`,
      });
    }
  }
  return issues;
}

function summariseValidationIssues(issues: SubmissionValidationIssue[]): string {
  const first = issues[0];
  const location = first.row ? `Row ${first.row}` : 'Result sheet';
  const remainder = issues.length > 1 ? ` ${issues.length - 1} more issue${issues.length === 2 ? '' : 's'} found.` : '';
  return `${location}, ${first.field}: ${first.message}${remainder}`;
}

function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}

function roundScore(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000_000) / 1_000_000_000;
}
