'use client';

import Link from 'next/link';
import {
  type DragEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import type { ExerciseMode } from '@/lib/exercises';
import {
  conditionMatches,
  type ContractCondition,
  type SubmissionField,
} from '@/lib/release-contract';

interface AvailableRelease {
  id: string;
  releaseId: string;
}

interface ParticipantField extends SubmissionField {
  score_when?: ContractCondition | null;
}

interface ReleaseDetails {
  samples: Array<{ public_name: string }>;
  sample_sheet: { filename?: string; url: string };
  releaseDefinition: {
    fields: ParticipantField[];
  };
}

interface ValidationIssue {
  row: number | null;
  sampleId?: string;
  field: string;
  message: string;
}

interface ScoreItem {
  sampleId: string;
  field: string;
  correct: boolean;
  submitted: string;
  expected: string;
}

interface SubmissionResult {
  error?: string;
  issues?: ValidationIssue[];
  submissionId?: string;
  attemptNumber?: number;
  submittedAt?: string;
  earned?: number;
  possible?: number;
  passed?: boolean;
  details?: { items: ScoreItem[] };
}

type SubmissionRows = Record<string, Record<string, string>>;

const SUBMISSION_PAGE_SIZE = 25;

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function buildCsv(fields: ParticipantField[], sampleIds: string[], rows: SubmissionRows): string {
  const header = fields.map((field) => escapeCsv(field.name)).join(',');
  const body = sampleIds.map((sampleId) =>
    fields.map((field) => escapeCsv(rows[sampleId]?.[field.name] ?? '')).join(','),
  );
  return [header, ...body].join('\n');
}

function issueKey(sampleId: string | undefined, field: string): string {
  return `${sampleId ?? ''}\u0000${field}`;
}

export function SubmissionPanel({
  exercise,
  mode,
  datasetAvailable = true,
}: {
  exercise: 'typing' | 'assembly' | 'hybrid' | 'outbreak';
  mode: ExerciseMode;
  datasetAvailable?: boolean;
}) {
  const [release, setRelease] = useState<AvailableRelease | null>(null);
  const [details, setDetails] = useState<ReleaseDetails | null>(null);
  const [rows, setRows] = useState<SubmissionRows>({});
  const [authRequired, setAuthRequired] = useState(true);
  const [message, setMessage] = useState('');
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [feedback, setFeedback] = useState<SubmissionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [sampleQuery, setSampleQuery] = useState('');
  const [samplePage, setSamplePage] = useState(1);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!datasetAvailable) return;
    let active = true;
    Promise.all([
      fetch(`/api/releases?exercise=${exercise}&mode=${mode}`),
      fetch('/api/submissions'),
    ])
      .then(async ([releaseResponse, sessionResponse]) => {
        if (releaseResponse.status === 401) {
          if (active) setAuthRequired(true);
          return null;
        }
        if (!releaseResponse.ok) {
          throw new Error('Release availability could not be checked');
        }
        if (active) setAuthRequired(sessionResponse.status === 401);
        const result = (await releaseResponse.json()) as { releases: AvailableRelease[] };
        const selected = result.releases[0] ?? null;
        if (!selected) return null;
        const detailResponse = await fetch(`/api/releases/${encodeURIComponent(selected.id)}`);
        if (!detailResponse.ok) {
          throw new Error('Release submission contract could not be loaded');
        }
        return {
          release: selected,
          details: (await detailResponse.json()) as ReleaseDetails,
        };
      })
      .then((result) => {
        if (!active || !result) return;
        setRelease(result.release);
        setDetails(result.details);
        const initialRows = Object.fromEntries(
          result.details.samples.map((sample) => [
            sample.public_name,
            {
              sample_id: sample.public_name,
              failure_reason: 'NONE',
            },
          ]),
        );
        setRows(initialRows);
      })
      .catch(() => {
        if (active) setMessage('Release availability could not be checked.');
      });
    return () => {
      active = false;
    };
  }, [datasetAvailable, exercise, mode]);

  const fields = details?.releaseDefinition.fields ?? [];
  const sampleIds = useMemo(
    () => details?.samples.map((sample) => sample.public_name) ?? [],
    [details],
  );
  const issueMap = useMemo(
    () => new Map(issues.map((issue) => [issueKey(issue.sampleId, issue.field), issue])),
    [issues],
  );
  const filteredSampleIds = useMemo(() => {
    const query = sampleQuery.trim().toLocaleLowerCase('en');
    if (!query) return sampleIds;
    return sampleIds.filter((sampleId) =>
      sampleId.toLocaleLowerCase('en').includes(query),
    );
  }, [sampleIds, sampleQuery]);
  const samplePageCount = Math.max(
    1,
    Math.ceil(filteredSampleIds.length / SUBMISSION_PAGE_SIZE),
  );
  const currentSamplePage = Math.min(samplePage, samplePageCount);
  const visibleSampleIds = filteredSampleIds.slice(
    (currentSamplePage - 1) * SUBMISSION_PAGE_SIZE,
    currentSamplePage * SUBMISSION_PAGE_SIZE,
  );

  function updateValue(sampleId: string, field: string, value: string) {
    setRows((current) => {
      const row = { ...current[sampleId], [field]: value };
      if (field === 'qc_status') {
        row.failure_reason = value === 'PASS' ? 'NONE' : value === 'FAIL' ? '' : row.failure_reason;
      }
      return { ...current, [sampleId]: row };
    });
    setIssues((current) =>
      current.filter((issue) => issueKey(issue.sampleId, issue.field) !== issueKey(sampleId, field)),
    );
  }

  async function postSubmission(file: File): Promise<boolean> {
    if (!release) return false;
    setBusy(true);
    setMessage('');
    setIssues([]);
    setFeedback(null);
    const formData = new FormData();
    formData.set('releaseId', release.id);
    formData.set('file', file);
    try {
      const response = await fetch('/api/submissions', { method: 'POST', body: formData });
      const contentType = response.headers.get('content-type') ?? '';
      const result: SubmissionResult = contentType.includes('application/json')
        ? ((await response.json()) as SubmissionResult)
        : { error: (await response.text()).trim() };
      if (!response.ok) {
        setIssues(result.issues ?? []);
        setMessage(result.error || 'Submission failed.');
        return false;
      }
      setFeedback(result);
      if (mode === 'challenge') {
        const submitted = result.submittedAt
          ? new Date(result.submittedAt).toLocaleString('en-GB')
          : 'just now';
        setMessage(
          `Submission received ${submitted}. This is version ${result.attemptNumber}. You may replace it before the challenge closes.`,
        );
      } else {
        setMessage(
          `Practice submission scored: ${result.earned}/${result.possible} — ${
            result.passed ? 'pass' : 'not yet passed'
          }. You can revise and submit again at any time.`,
        );
      }
      return true;
    } catch {
      setMessage('Submission could not be completed. Check your connection and try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitStructured(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const csv = buildCsv(fields, sampleIds, rows);
    await postSubmission(
      new File([csv], `${release?.releaseId ?? exercise}-results.csv`, {
        type: 'text/csv;charset=utf-8',
      }),
    );
  }

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!uploadFile) {
      setMessage('Choose a CSV or TSV result sheet before uploading.');
      return;
    }
    if (await postSubmission(uploadFile)) {
      form.reset();
      setUploadFile(null);
    }
  }

  function selectUpload(file: File | null) {
    if (!file) return;
    const accepted =
      /\.(csv|tsv)$/i.test(file.name)
      || ['text/csv', 'text/tab-separated-values'].includes(file.type);
    if (!accepted) {
      setUploadFile(null);
      setMessage('Choose a CSV or TSV result sheet.');
      if (uploadInput.current) uploadInput.current.value = '';
      return;
    }
    if (!file.size) {
      setUploadFile(null);
      setMessage('The selected result sheet is empty.');
      if (uploadInput.current) uploadInput.current.value = '';
      return;
    }
    setMessage('');
    setUploadFile(file);
  }

  function dropUpload(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    selectUpload(event.dataTransfer.files[0] ?? null);
  }

  return (
    <section className="card md:col-span-2">
      <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">Submit results</h2>
      {!datasetAvailable ? (
        <p className="text-[var(--gx-text-muted)]">
          Submission will open when this practice dataset and sample sheet are published.
        </p>
      ) : authRequired ? (
        <div className="flex flex-col gap-3">
          <p className="text-[var(--gx-text-muted)] m-0">
            The preview, result-sheet contract and practice downloads are public. Sign in or create
            an account when you are ready to complete and submit your results.
          </p>
          <Link
            className="gx-btn gx-btn-primary self-start"
            href={`/sign-in?returnTo=${encodeURIComponent(pathname)}`}
          >
            Sign in to submit
          </Link>
        </div>
      ) : release && details ? (
        <div className="flex flex-col gap-7">
          <form className="flex flex-col gap-4" onSubmit={submitStructured}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
              <h3 className="text-lg font-semibold text-[var(--gx-text)] mt-0 mb-1">
                Complete results online
              </h3>
              <p className="text-sm text-[var(--gx-text-muted)] mt-0">
                Sample identifiers are fixed by this release. Controlled fields use only the
                choices declared in its submission schema.
              </p>
              </div>
              {sampleIds.length > 10 ? (
                <label className="min-w-64 text-sm text-[var(--gx-text-muted)]">
                  Search samples
                  <input
                    className="gx-input w-full mt-1"
                    type="search"
                    value={sampleQuery}
                    onChange={(event) => {
                      setSampleQuery(event.target.value);
                      setSamplePage(1);
                    }}
                    placeholder="Enter a sample identifier"
                  />
                </label>
              ) : null}
            </div>
            <div className="overflow-x-auto border border-[var(--gx-border)] rounded-xl">
              <table className="w-full border-collapse min-w-max">
                <thead>
                  <tr>
                    {fields.map((field) => (
                      <th
                        key={field.name}
                        className="px-3 py-3 border-b border-[var(--gx-border)] text-left align-bottom text-xs text-[var(--gx-text-muted)]"
                      >
                        <span className="block font-mono text-[var(--gx-text)]">{field.name}</span>
                        <span className="block mt-1 font-normal max-w-52">{field.label}</span>
                        {!field.scored ? (
                          <span className="block mt-1 font-semibold">Supporting evidence — unscored</span>
                        ) : field.required || field.required_when ? (
                          <span className="block mt-1 font-semibold">Required when applicable</span>
                        ) : (
                          <span className="block mt-1 font-semibold">Scored</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleSampleIds.map((sampleId) => {
                    const values = rows[sampleId] ?? {};
                    return (
                      <tr key={sampleId}>
                        {fields.map((field) => {
                          const issue = issueMap.get(issueKey(sampleId, field.name));
                          const active = conditionMatches(field.score_when, values);
                          const disabledByQc = Boolean(field.score_when) && !active;
                          return (
                            <td
                              key={field.name}
                              className="px-3 py-3 border-b border-[var(--gx-border)] align-top"
                            >
                              {field.identifier ? (
                                <span className="font-mono text-sm text-[var(--gx-text)]">
                                  {sampleId}
                                </span>
                              ) : disabledByQc ? (
                                <span className="text-xs text-[var(--gx-text-muted)]">
                                  Not required for {values.qc_status || 'unselected'} QC
                                </span>
                              ) : field.allowed_values?.length ? (
                                <select
                                  aria-label={`${field.label} for ${sampleId}`}
                                  className="gx-input min-w-44"
                                  value={values[field.name] ?? ''}
                                  onChange={(event) =>
                                    updateValue(sampleId, field.name, event.target.value)
                                  }
                                >
                                  <option value="">Select…</option>
                                  {field.allowed_values.map((value) => (
                                    <option key={value} value={value}>{value}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  aria-label={`${field.label} for ${sampleId}`}
                                  className="gx-input min-w-44"
                                  placeholder={field.scorer === 'partition' ? 'e.g. A' : undefined}
                                  value={values[field.name] ?? ''}
                                  onChange={(event) =>
                                    updateValue(sampleId, field.name, event.target.value)
                                  }
                                />
                              )}
                              {issue ? (
                                <span className="block mt-1 max-w-48 text-xs text-red-500" role="alert">
                                  Row {issue.row ?? sampleIds.indexOf(sampleId) + 2}: {issue.message}
                                </span>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredSampleIds.length === 0 ? (
              <p className="text-sm text-[var(--gx-text-muted)] m-0">
                No sample identifiers match “{sampleQuery}”.
              </p>
            ) : null}
            {sampleIds.length > SUBMISSION_PAGE_SIZE && filteredSampleIds.length ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[var(--gx-text-muted)] m-0">
                  Showing {(currentSamplePage - 1) * SUBMISSION_PAGE_SIZE + 1}–
                  {Math.min(currentSamplePage * SUBMISSION_PAGE_SIZE, filteredSampleIds.length)} of{' '}
                  {filteredSampleIds.length} matching samples
                </p>
                <div className="flex gap-2">
                  <button
                    className="gx-btn gx-btn-secondary"
                    type="button"
                    disabled={currentSamplePage <= 1}
                    onClick={() => setSamplePage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <span className="self-center text-sm text-[var(--gx-text-muted)]">
                    Page {currentSamplePage} of {samplePageCount}
                  </span>
                  <button
                    className="gx-btn gx-btn-secondary"
                    type="button"
                    disabled={currentSamplePage >= samplePageCount}
                    onClick={() =>
                      setSamplePage((page) => Math.min(samplePageCount, page + 1))
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
            <button className="gx-btn gx-btn-primary self-start" type="submit" disabled={busy}>
              {busy ? 'Checking submission…' : 'Submit online results'}
            </button>
          </form>

          <form
            className="flex flex-col gap-4 border-t border-[var(--gx-border)] pt-6"
            onSubmit={submitUpload}
          >
            <div>
              <label className="label" htmlFor={`${exercise}-${mode}-submission`}>
                Or upload a completed CSV or TSV result sheet
              </label>
              <p className="text-sm text-[var(--gx-text-muted)] mt-1 mb-0">
                Use the supplied template and keep every expected sample and column. Files must be
                UTF-8 encoded. Harmless case and surrounding whitespace are normalised according to
                the release contract.
              </p>
            </div>
            <div className="gx-file-upload">
              <label
                className={`gx-file-upload-area ${
                  dragActive ? 'border-[var(--gx-accent)] bg-[var(--gx-accent-dim)]' : ''
                }`}
                htmlFor={`${exercise}-${mode}-submission`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragActive(false)}
                onDrop={dropUpload}
              >
                <svg
                  className="gx-file-upload-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M12 16V4m0 0-4 4m4-4 4 4M5 14v5h14v-5" />
                </svg>
                <span className="gx-file-upload-label">
                  {uploadFile ? uploadFile.name : 'Drop a completed CSV or TSV result sheet here'}
                </span>
                <span className="gx-file-upload-hint">
                  <span className="text-[var(--gx-accent)] underline underline-offset-2">
                    {uploadFile ? 'Choose a different file' : 'Choose a file from your computer'}
                  </span>
                </span>
                <input
                  ref={uploadInput}
                  id={`${exercise}-${mode}-submission`}
                  type="file"
                  name="file"
                  accept=".csv,.tsv,text/csv,text/tab-separated-values"
                  onChange={(event) => selectUpload(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <button
              className="gx-btn gx-btn-primary self-start"
              type="submit"
              disabled={busy || !uploadFile}
            >
              {busy ? 'Checking submission…' : 'Upload result sheet'}
            </button>
          </form>

          {issues.length ? (
            <div className="rounded-xl border border-red-400/40 p-4" role="alert">
              <h3 className="font-semibold text-[var(--gx-text)] mt-0 mb-2">
                Correct these submission issues
              </h3>
              <ul className="text-sm text-[var(--gx-text-muted)] pl-5 mb-0 space-y-1">
                {issues.map((issue, index) => (
                  <li key={`${issue.row}-${issue.field}-${index}`}>
                    {issue.row ? `Row ${issue.row}` : 'Result sheet'}
                    {issue.sampleId ? ` (${issue.sampleId})` : ''}, {issue.field}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {mode === 'practice' && feedback?.details ? (
            <div className="rounded-xl border border-[var(--gx-border)] p-4">
              <h3 className="font-semibold text-[var(--gx-text)] mt-0 mb-2">
                Practice feedback
              </h3>
              <div className="space-y-3">
                {sampleIds.map((sampleId) => {
                  const sampleItems = feedback.details?.items.filter(
                    (item) => item.sampleId === sampleId,
                  ) ?? [];
                  const feedbackItems = sampleItems.filter(
                    (item) =>
                      ['qc_status', 'failure_reason'].includes(item.field) || !item.correct,
                  );
                  return (
                    <div key={sampleId}>
                      <h4 className="font-mono text-sm text-[var(--gx-text)] my-0">{sampleId}</h4>
                      <ul className="text-sm text-[var(--gx-text-muted)] pl-5 my-1">
                        {feedbackItems.map((item) => (
                          <li key={item.field}>
                            {item.field}: {item.correct ? 'correct' : `check this field (expected ${item.expected || 'blank'})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-[var(--gx-text-muted)]">
          {mode === 'challenge'
            ? 'No challenge release is currently open for your account.'
            : 'Assessment submissions for this practice exercise are being prepared. The preview and downloads remain available.'}
        </p>
      )}
      {message ? <p role="status" className="text-[var(--gx-text-muted)] mt-4">{message}</p> : null}
    </section>
  );
}
