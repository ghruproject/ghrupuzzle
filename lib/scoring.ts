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

export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
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
    throw new Error('CSV contains an unterminated quoted field');
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  if (rows.length < 2) {
    throw new Error('CSV must contain a header and at least one result row');
  }
  const headers = rows[0].map(normalizeKey);
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) {
    throw new Error('CSV contains blank or duplicate column names');
  }
  return rows
    .slice(1)
    .filter((values) => values.some((value) => value.trim()))
    .map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ''])),
    );
}

export function scoreSubmission(
  csvText: string,
  answerKey: AnswerKey,
  policy?: ScoringPolicy,
): ScoreResult {
  const rows = parseCsv(csvText);
  const sampleField = SAMPLE_ID_FIELDS.find((field) => field in rows[0]);
  if (!sampleField) {
    throw new Error(`CSV requires one sample identifier column: ${SAMPLE_ID_FIELDS.join(', ')}`);
  }
  const submitted = new Map<string, Record<string, string>>();
  for (const row of rows) {
    const sampleId = row[sampleField].trim();
    if (!sampleId || submitted.has(sampleId)) {
      throw new Error('CSV contains a blank or duplicate sample identifier');
    }
    submitted.set(sampleId, row);
  }

  const expectedIds = new Set(answerKey.samples.map((sample) => sample.sample_id));
  const unexpectedSamples = [...submitted.keys()].filter((id) => !expectedIds.has(id));
  const items: ScoreResult['items'] = [];
  const missingSamples: string[] = [];
  const policyFields = policy?.fields.filter((field) => field.scored);
  for (const sample of answerKey.samples) {
    const row = submitted.get(sample.sample_id);
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
      const expected = normalizeValue(rawExpected, field);
      const submittedValue = submittedField(row, field, definition?.aliases ?? []);
      const actual = normalizeValue(submittedValue, field);
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
  const earned = items.reduce((total, item) => total + (item.correct ? item.weight : 0), 0);
  const possible = items.reduce((total, item) => total + item.weight, 0);
  const passThreshold = policy?.pass_threshold ?? 0.8;
  const completeEnough = policy?.require_all_samples === false || missingSamples.length === 0;
  const unexpectedOkay =
    policy?.reject_unexpected_samples === false || unexpectedSamples.length === 0;
  return {
    earned,
    possible,
    passed: earned / possible >= passThreshold && completeEnough && unexpectedOkay,
    missingSamples,
    unexpectedSamples,
    items,
  };
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
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function normalizeValue(value: unknown, field = ''): string {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, field)).sort().join(',');
  }
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (field === 'bla_carb') {
    return normalized
      .split(/[,;|]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .sort()
      .join(',');
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
      const expectedA = normalizeValue(a.answers[field]);
      const expectedB = normalizeValue(b.answers[field]);
      const actualA = normalizeValue(
        submittedField(submitted.get(a.sample_id), field, aliases),
      );
      const actualB = normalizeValue(
        submittedField(submitted.get(b.sample_id), field, aliases),
      );
      const expectedTogether = isCluster(expectedA) && expectedA === expectedB;
      const actualTogether = isCluster(actualA) && actualA === actualB;
      items.push({
        sampleId: a.sample_id,
        field: `${field}_with_${b.sample_id}`,
        correct: Boolean(submitted.get(a.sample_id) && submitted.get(b.sample_id))
          && expectedTogether === actualTogether,
        submitted: actualTogether ? 'same cluster' : 'different clusters',
        expected: expectedTogether ? 'same cluster' : 'different clusters',
        weight: totalWeight === undefined ? 1 : totalWeight / pairCount,
      });
    }
  }
}

function isCluster(value: string): boolean {
  return Boolean(value && !['-', 'none', 'unclustered', 'na', 'n/a'].includes(value));
}
