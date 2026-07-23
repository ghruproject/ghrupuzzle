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

export function scoreSubmission(csvText: string, answerKey: AnswerKey): ScoreResult {
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
  const items: ScoreResult['items'] = [];
  const missingSamples: string[] = [];
  for (const sample of answerKey.samples) {
    const row = submitted.get(sample.sample_id);
    if (!row) {
      missingSamples.push(sample.sample_id);
    }
    for (const [rawField, rawExpected] of Object.entries(sample.answers)) {
      const field = normalizeKey(rawField);
      if (UNSCORED_FIELDS.has(field) || (answerKey.exercise === 'outbreak' && field === 'cluster')) {
        continue;
      }
      const expected = normalizeValue(rawExpected, field);
      const actual = normalizeValue(row?.[field] ?? '', field);
      items.push({
        sampleId: sample.sample_id,
        field,
        correct: Boolean(row) && actual === expected,
        submitted: row?.[field] ?? '',
        expected: String(rawExpected ?? ''),
      });
    }
  }
  if (answerKey.exercise === 'outbreak') {
    scoreClusterPairs(answerKey, submitted, items);
  }
  if (!items.length) {
    throw new Error('answer key contains no scoreable fields');
  }
  const earned = items.filter((item) => item.correct).length;
  const possible = items.length;
  return {
    earned,
    possible,
    passed: earned / possible >= 0.8 && missingSamples.length === 0,
    missingSamples,
    unexpectedSamples: [...submitted.keys()].filter((id) => !expectedIds.has(id)),
    items,
  };
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
): void {
  for (let left = 0; left < answerKey.samples.length; left += 1) {
    for (let right = left + 1; right < answerKey.samples.length; right += 1) {
      const a = answerKey.samples[left];
      const b = answerKey.samples[right];
      const expectedA = normalizeValue(a.answers.cluster);
      const expectedB = normalizeValue(b.answers.cluster);
      const actualA = normalizeValue(submitted.get(a.sample_id)?.cluster ?? '');
      const actualB = normalizeValue(submitted.get(b.sample_id)?.cluster ?? '');
      const expectedTogether = isCluster(expectedA) && expectedA === expectedB;
      const actualTogether = isCluster(actualA) && actualA === actualB;
      items.push({
        sampleId: a.sample_id,
        field: `cluster_with_${b.sample_id}`,
        correct: Boolean(submitted.get(a.sample_id) && submitted.get(b.sample_id))
          && expectedTogether === actualTogether,
        submitted: actualTogether ? 'same cluster' : 'different clusters',
        expected: expectedTogether ? 'same cluster' : 'different clusters',
      });
    }
  }
}

function isCluster(value: string): boolean {
  return Boolean(value && !['-', 'none', 'unclustered', 'na', 'n/a'].includes(value));
}
