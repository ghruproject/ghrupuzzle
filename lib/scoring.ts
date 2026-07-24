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

export interface ScoringPolicy {
  schema_version: string;
  release_id: string;
  scorer_version: string;
  pass_threshold: number;
  require_all_samples: boolean;
  reject_unexpected_samples: boolean;
  fields: Array<{
    name: string;
    scored: boolean;
    scorer: 'exact' | 'unordered_list' | 'partition';
    weight: number;
    aliases: string[];
  }>;
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
  constructor(message: string) {
    super(message);
    this.name = 'SubmissionValidationError';
  }
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
): ScoreResult {
  validateScoringContract(answerKey, policy);
  const rows = parseDelimitedText(csvText);
  const sampleField = SAMPLE_ID_FIELDS.find((field) => field in rows[0]);
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
      const expected = normalizeValue(rawExpected, field, scorer);
      const submittedValue = submittedField(row, field, definition?.aliases ?? []);
      const actual = normalizeValue(submittedValue, field, scorer);
      items.push({
        sampleId: sample.sample_id,
        field,
        correct: Boolean(row) && actual === expected,
        submitted: submittedValue,
        expected: String(rawExpected ?? ''),
        weight: definition
          ? definition.weight / answerKey.samples.length
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
): string {
  if (scorer === 'unordered_list') {
    const values = Array.isArray(value) ? value : String(value ?? '').split(/[,;|\n]+/);
    return [...new Set(values.map((item) => normalizeScalar(item, field)).filter(Boolean))]
      .sort()
      .join(',');
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeScalar(item, field)).join(',');
  }
  return normalizeScalar(value, field);
}

function normalizeScalar(value: unknown, field: string): string {
  let normalized = String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en');
  if (MISSING_VALUE_TOKENS.has(normalized)) {
    return '';
  }
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
): void {
  const pairCount = (answerKey.samples.length * (answerKey.samples.length - 1)) / 2;
  for (let left = 0; left < answerKey.samples.length; left += 1) {
    for (let right = left + 1; right < answerKey.samples.length; right += 1) {
      const a = answerKey.samples[left];
      const b = answerKey.samples[right];
      const expectedA = normalizeValue(a.answers[field], field, 'partition');
      const expectedB = normalizeValue(b.answers[field], field, 'partition');
      const actualA = normalizeValue(
        submittedField(submitted.get(normalizeSampleId(a.sample_id)), field, aliases),
        field,
        'partition',
      );
      const actualB = normalizeValue(
        submittedField(submitted.get(normalizeSampleId(b.sample_id)), field, aliases),
        field,
        'partition',
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

function validateScoringContract(answerKey: AnswerKey, policy?: ScoringPolicy): void {
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
        (sample) => !Object.hasOwn(sample.answers, definition.name),
      )
    ) {
      throw new Error(`Answer key is missing assessed field ${definition.name}`);
    }
  }
}

function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}

function roundScore(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000_000) / 1_000_000_000;
}
