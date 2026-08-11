'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ExerciseDataset, ExerciseDefinition } from '@/lib/exercises';
import type { ParticipantFileView } from '@/lib/participant-files';
import { SubmissionPanel } from './submission-panel';
import type { PublicChallengeRound, PublicChallengeSchedule } from '@/lib/challenge';

function isReleased(releaseDate?: string) {
  if (!releaseDate) {
    return false;
  }

  const normalized = releaseDate.includes('T') ? releaseDate : releaseDate.replace(' ', 'T');
  return Date.now() >= new Date(normalized).getTime();
}

function fileNameFromUrl(value: string) {
  return value.split('/').pop() ?? value;
}

const GUIDE_PATHS = {
  assembly: '/guides/short-read-assembly',
  hybrid: '/guides/hybrid-assembly',
  typing: '/guides/genotyping',
  outbreak: '/guides/outbreak-analysis',
} as const;

const SAMPLE_PAGE_SIZE = 25;

const FAILURE_REASON_DETAILS: Record<string, string> = {
  NONE: 'No input-quality failure was identified. Use only when QC status is PASS.',
  EMPTY_FILE: 'A required input file contains no sequence data.',
  MISSING_MATE: 'One file from a paired-end read set is not provided.',
  TOO_FEW_READS: 'The available short-read data are insufficient for reliable analysis.',
  LOW_COVERAGE: 'Sequence coverage is insufficient for reliable analysis.',
  MISSING_LONG_READS: 'The required long-read file is not provided.',
  TOO_FEW_LONG_READS: 'The long-read yield is insufficient for reliable analysis.',
  CONTAMINATED: 'The data contain evidence of more than the intended isolate.',
  WRONG_ORGANISM: 'The data do not represent the target organism.',
  DISCORDANT_READ_SETS: 'The short- and long-read data do not appear to represent the same isolate.',
};

export function ExercisePage<
  TSample extends {
    public_name: string;
    participant_files?: Record<string, ParticipantFileView | null>;
  },
>({
  definition,
}: {
  definition: ExerciseDefinition<TSample>;
}) {
  const [dataset, setDataset] = useState<ExerciseDataset<TSample> | null>(
    definition.mode === 'challenge'
      ? {
          samples: [],
          answer_sheet: { species: [] },
          sample_sheet: { url: '' },
        } as ExerciseDataset<TSample>
      : null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredChallenge, setFeaturedChallenge] = useState<PublicChallengeRound | null>(null);
  const [sampleQuery, setSampleQuery] = useState('');
  const [samplePage, setSamplePage] = useState(1);

  useEffect(() => {
    let active = true;

    async function loadDataset() {
      const releasesResponse = await fetch(
        `/api/releases?exercise=${definition.exercise}&mode=${definition.mode}`,
      );
      if (releasesResponse.ok) {
        const releaseResult = (await releasesResponse.json()) as {
          releases: Array<{ id: string }>;
        };
        if (releaseResult.releases.length) {
          const datasetResponse = await fetch(
            `/api/releases/${encodeURIComponent(releaseResult.releases[0].id)}`,
          );
          if (!datasetResponse.ok) {
            throw new Error('The published release could not be loaded.');
          }
          return datasetResponse.json() as Promise<ExerciseDataset<TSample>>;
        }
      }

      return {
        samples: [],
        answer_sheet: { species: [] },
        sample_sheet: { url: '' },
      } as ExerciseDataset<TSample>;
    }

    loadDataset()
      .then((payload) => {
        if (!active) {
          return;
        }

        setDataset(payload);
        setLoading(false);
      })
      .catch((fetchError: Error) => {
        if (!active) {
          return;
        }

        setError(fetchError.message);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [definition.datasetPath, definition.exercise, definition.mode]);

  useEffect(() => {
    if (definition.mode !== 'challenge') return;
    let active = true;
    fetch('/api/challenges')
      .then((response) => response.json() as Promise<PublicChallengeSchedule>)
      .then((schedule) => {
        if (active) setFeaturedChallenge(schedule.featured);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [definition.mode]);

  const hasSamples = (dataset?.samples.length ?? 0) > 0;
  const administratorPreview = Boolean(dataset?.access?.administratorPreview);
  const releaseReady = useMemo(
    () => hasSamples && (administratorPreview || isReleased(dataset?.release_date)),
    [administratorPreview, dataset?.release_date, hasSamples],
  );
  const hasSampleSheet = Boolean(dataset?.sample_sheet?.url);
  const canDownload = hasSamples && hasSampleSheet;
  const releaseDefinition = dataset?.releaseDefinition;
  const pageTitle = releaseDefinition?.title ?? definition.title;
  const pageSummary = definition.summary;
  const taskInstructions = releaseDefinition?.instructions.length
    ? releaseDefinition.instructions
    : definition.instructions;
  const answerColumns = releaseDefinition?.fields.map((field) => ({
    name: field.name,
    description: field.description,
    required: field.required,
    requiredWhen: field.required_when,
    allowedValues: field.allowed_values ?? [],
    scored: field.scored,
    scorer: field.scorer,
    scoreWhen: field.score_when,
  })) ?? definition.answerColumns.map((column) => ({
    ...column,
    required: false,
    requiredWhen: null,
    allowedValues: [] as string[],
    scored: false,
    scorer: 'exact' as const,
    scoreWhen: null,
  }));
  const failureReasonField = answerColumns.find((field) => field.name === 'failure_reason');
  const partitionField = answerColumns.find((field) => field.scorer === 'partition');
  const filteredSamples = useMemo(() => {
    const query = sampleQuery.trim().toLocaleLowerCase('en');
    if (!query) return dataset?.samples ?? [];
    return (dataset?.samples ?? []).filter((sample) =>
      sample.public_name.toLocaleLowerCase('en').includes(query),
    );
  }, [dataset?.samples, sampleQuery]);
  const samplePageCount = Math.max(1, Math.ceil(filteredSamples.length / SAMPLE_PAGE_SIZE));
  const currentSamplePage = Math.min(samplePage, samplePageCount);
  const visibleSamples = filteredSamples.slice(
    (currentSamplePage - 1) * SAMPLE_PAGE_SIZE,
    currentSamplePage * SAMPLE_PAGE_SIZE,
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Hero */}
      <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-8 shadow-sm mb-8">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">
          {definition.kindLabel}
        </div>
        <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">{pageTitle}</h1>
        <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-5">{pageSummary}</p>
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)] text-xs font-semibold">
            {definition.mode === 'challenge' ? 'Challenge' : 'Practice'}
          </span>
          {definition.mode === 'practice' || hasSamples ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)] text-xs font-semibold">
              {loading
                ? 'Dataset loading'
                : hasSamples
                  ? `Dataset: ${dataset?.samples.length ?? 0} samples`
                  : 'Dataset coming soon'}
            </span>
          ) : null}
        </div>
        {definition.mode === 'challenge' && definition.practiceHref ? (
          <div className="mt-4">
            <Link
              href={definition.practiceHref}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl font-bold border border-[var(--gx-border)] text-[var(--gx-text)] hover:text-[var(--gx-text-bright)] bg-transparent transition-colors text-sm"
            >
              Open practice version →
            </Link>
          </div>
        ) : definition.mode === 'practice' ? (
          <div className="mt-4">
            <Link href={GUIDE_PATHS[definition.exercise]} className="gx-btn gx-btn-secondary">
              How to run this exercise
            </Link>
          </div>
        ) : null}
      </section>

      {/* Loading / error states */}
      {loading ? (
        <div className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 mb-6">
          Loading exercise metadata...
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-400/40 bg-[var(--gx-surface)] p-6 mb-6">{error}</div>
      ) : null}

      {!loading && !error && definition.mode === 'challenge' && administratorPreview ? (
        <div className="rounded-2xl border border-[var(--gx-accent)] bg-[var(--gx-accent-dim)] p-5 mb-6">
          <h2 className="text-lg font-bold text-[var(--gx-text)] mt-0 mb-2">
            Administrator preview
          </h2>
          <p className="text-sm text-[var(--gx-text-muted)] m-0">
            You can inspect and download this challenge release before it opens. Participant access
            and submissions remain locked until the configured challenge window.
          </p>
        </div>
      ) : null}

      {/* Locked challenge */}
      {!loading && !error && definition.mode === 'challenge' && !releaseReady ? (
        <div className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 mb-6">
          <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">
            {featuredChallenge?.phase === 'upcoming'
              ? `Challenge opens ${featuredChallenge.dateLabel}`
              : 'Challenge data are not currently available'}
          </h2>
          <p className="text-[var(--gx-text-muted)]">
            Challenge data and submissions are available to signed-in participants who have signed
            up during the challenge window. You can prepare now using the public practice version.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {definition.practiceHref ? (
              <Link
                href={definition.practiceHref}
                className="gx-btn gx-btn-primary"
              >
                Open practice exercise
              </Link>
            ) : null}
            <Link href="/challenge" className="font-semibold">
              View challenge signup →
            </Link>
          </div>
        </div>
      ) : null}

      {/* Main content grid */}
      {!loading && !error && (definition.mode !== 'challenge' || releaseReady) ? (
        <div className="space-y-6">
          {/* Task and result sheet */}
          <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 md:p-8 md:col-span-2">
            <h2 className="text-2xl font-bold text-[var(--gx-text)] mt-0 mb-3">
              Task and required results
            </h2>
            <p className="text-[var(--gx-text-muted)] mb-3">{definition.subtitle}</p>
            <ol className="pl-5 list-decimal space-y-2 text-[var(--gx-text-muted)] mb-4">
              {taskInstructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>
            <p className="text-[var(--gx-text-muted)] mb-7">{definition.submissionText}</p>

            <h3 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">
              Result-sheet columns
            </h3>
            <p className="text-[var(--gx-text-muted)] mb-4">
              The supplied template is pre-populated with every sample identifier. Complete the
              fields described below without changing the column names.
            </p>
            <div className="hidden md:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-3 border-b border-[var(--gx-border)] text-left text-xs uppercase tracking-wider text-[var(--gx-text-muted)]">
                      Column
                    </th>
                    <th className="px-4 py-3 border-b border-[var(--gx-border)] text-left text-xs uppercase tracking-wider text-[var(--gx-text-muted)]">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {answerColumns.map((column) => (
                    <tr
                      key={column.name}
                      className={column.required || column.requiredWhen ? 'bg-[var(--gx-accent-dim)]' : undefined}
                    >
                      <td className="px-4 py-3 border-b border-[var(--gx-border)] align-top text-[var(--gx-text)]">
                        <span className="font-mono font-bold text-sm">{column.name}</span>
                      </td>
                      <td className="px-4 py-3 border-b border-[var(--gx-border)] align-top text-[var(--gx-text-muted)]">
                        <span className="block">{column.description}</span>
                        <span className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex rounded-full border border-[var(--gx-border)] px-2 py-0.5 text-xs font-semibold text-[var(--gx-text)]">
                            {column.required
                              ? 'Required'
                              : column.requiredWhen
                                ? `Required when ${column.requiredWhen.field} = ${column.requiredWhen.equals}`
                                : 'Optional'}
                          </span>
                          <span className="inline-flex rounded-full border border-[var(--gx-border)] px-2 py-0.5 text-xs font-semibold">
                            {column.scored ? 'Scored' : 'Supporting evidence — unscored'}
                          </span>
                        </span>
                        {column.allowedValues.length && column.name !== 'failure_reason' ? (
                          <span className="block mt-2 text-sm">
                            Allowed values: {column.allowedValues.join(', ')}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="md:hidden divide-y divide-[var(--gx-border)]">
              {answerColumns.map((column) => (
                <div
                  key={column.name}
                  className={`p-3 first:pt-0 last:pb-0 ${
                    column.required || column.requiredWhen ? 'bg-[var(--gx-accent-dim)]' : ''
                  }`}
                >
                  <dt className="font-mono font-bold text-sm text-[var(--gx-text)]">{column.name}</dt>
                  <dd className="text-sm text-[var(--gx-text-muted)] mt-1 ml-0">{column.description}</dd>
                  <dd className="flex flex-wrap gap-2 mt-2 ml-0 text-xs">
                    <span className="rounded-full border border-[var(--gx-border)] px-2 py-0.5 font-semibold text-[var(--gx-text)]">
                      {column.required
                        ? 'Required'
                        : column.requiredWhen
                          ? `Required when ${column.requiredWhen.field} = ${column.requiredWhen.equals}`
                          : 'Optional'}
                    </span>
                    <span className="rounded-full border border-[var(--gx-border)] px-2 py-0.5 font-semibold">
                      {column.scored ? 'Scored' : 'Supporting evidence — unscored'}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>

            {partitionField ? (
              <div className="mt-7 rounded-xl border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] p-4">
                <h3 className="font-semibold text-[var(--gx-text)] mt-0 mb-2">
                  How to enter cluster labels
                </h3>
                <p className="text-sm text-[var(--gx-text-muted)] m-0">
                  Cluster names are your choice. Give samples the same label when you believe they
                  belong to the same outbreak cluster, and use a different label for each separate
                  cluster—for example A, B and C. Assessment compares the grouping of samples, not
                  the literal label text.
                </p>
              </div>
            ) : null}

            <div className="mt-7 border-t border-[var(--gx-border)] pt-6">
              <h3 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">
                Before you start
              </h3>
              <ul className="text-sm text-[var(--gx-text-muted)] pl-5 mb-4 space-y-1">
                <li>Every release sample must appear exactly once.</li>
                <li>Use PASS with a failure reason of NONE when the sample is suitable for analysis.</li>
                <li>
                  Use FAIL with one categorical failure reason when an input is unsuitable;
                  unavailable analytical fields are then neither required nor scored.
                </li>
                <li>Supporting-evidence fields do not affect the automatic result.</li>
              </ul>
              {hasSampleSheet ? (
                <>
                  <p className="text-sm text-[var(--gx-text-muted)] mb-3">
                    The result-sheet template contains every sample identifier and all required
                    columns for this release.
                  </p>
                  <a
                    className="gx-btn gx-btn-primary"
                    href={dataset?.sample_sheet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download result-sheet template
                  </a>
                </>
              ) : null}
            </div>

            {failureReasonField?.allowedValues.length ? (
              <div className="mt-7 border-t border-[var(--gx-border)] pt-6">
                <h3 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-2">
                  Failure-reason reference
                </h3>
                <p className="text-sm text-[var(--gx-text-muted)] mb-4">
                  Select the single reason that best explains why a sample cannot be analysed
                  reliably.
                </p>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {failureReasonField.allowedValues.map((reason) => (
                    <div
                      key={reason}
                      className="rounded-xl border border-[var(--gx-border)] bg-[var(--gx-bg)] p-3"
                    >
                      <dt className="font-mono font-bold text-sm text-[var(--gx-text)]">{reason}</dt>
                      <dd className="text-sm text-[var(--gx-text-muted)] mt-1 ml-0">
                        {FAILURE_REASON_DETAILS[reason] ?? 'Release-defined failure category.'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </section>

          {/* Samples — full width */}
          <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-1">Samples</h2>
                <p className="text-[var(--gx-text-muted)] text-sm m-0">
                  Public identifiers and downloadable inputs for this exercise. A “Not provided”
                  entry may be an intentional data-quality problem.
                </p>
              </div>
              {(dataset?.samples.length ?? 0) > 10 ? (
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

            {hasSamples ? (
              <div>
                {dataset?.bulk_download ? (
                  <div className="rounded-xl border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] p-4 mb-5">
                    <h3 className="text-base font-bold text-[var(--gx-text)] mt-0 mb-1">
                      Download all files
                    </h3>
                    <p className="text-sm text-[var(--gx-text-muted)] mt-0 mb-3">
                      Download a ready-to-run shell script for every input file and the result-sheet
                      template. The script also includes the published SHA-256 checksums.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a className="gx-btn gx-btn-primary" href={dataset.bulk_download.curl} download>
                        Download curl script
                      </a>
                      <a className="gx-btn gx-btn-secondary" href={dataset.bulk_download.wget} download>
                        Download wget script
                      </a>
                    </div>
                    <p className="text-xs text-[var(--gx-text-muted)] mt-3 mb-0">
                      Run with <code>bash downloaded-script.sh</code>. Challenge links are
                      time-limited and only generated while the challenge is open.
                    </p>
                  </div>
                ) : null}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[640px]">
                    <thead>
                      <tr>
                        {definition.sampleColumns.map((column) => (
                          <th
                            key={String(column.key)}
                            className="px-4 py-3 border-b border-[var(--gx-border)] text-left text-xs uppercase tracking-wider text-[var(--gx-text-muted)]"
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSamples.map((sample, sampleIndex) => (
                        <tr key={`${String(sample.public_name)}-${sampleIndex}`}>
                          {definition.sampleColumns.map((column) => {
                            const columnKey = String(column.key);
                            const value = String(sample[column.key] ?? '');
                            const file = sample.participant_files?.[columnKey];

                            return (
                              <td
                                key={columnKey}
                                className="px-4 py-3 border-b border-[var(--gx-border)] align-top text-[var(--gx-text)]"
                              >
                                {column.isFile ? (
                                  file || value ? (
                                    <a
                                      href={file?.url ?? value}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download
                                    >
                                      {file?.filename ?? fileNameFromUrl(value)}
                                    </a>
                                  ) : (
                                    <span className="font-semibold text-[var(--gx-text-muted)]">
                                      Not provided
                                    </span>
                                  )
                                ) : (
                                  value || '—'
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredSamples.length === 0 ? (
                  <p className="text-sm text-[var(--gx-text-muted)] mt-4 mb-0">
                    No sample identifiers match “{sampleQuery}”.
                  </p>
                ) : null}
                {(dataset?.samples.length ?? 0) > SAMPLE_PAGE_SIZE && filteredSamples.length ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                    <p className="text-sm text-[var(--gx-text-muted)] m-0">
                      Showing {(currentSamplePage - 1) * SAMPLE_PAGE_SIZE + 1}–
                      {Math.min(currentSamplePage * SAMPLE_PAGE_SIZE, filteredSamples.length)} of{' '}
                      {filteredSamples.length} matching samples
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
              </div>
            ) : (
              <p className="text-[var(--gx-text-muted)]">No uploaded samples yet.</p>
            )}
          </section>

          <SubmissionPanel
            exercise={definition.exercise}
            mode={definition.mode}
            datasetAvailable={canDownload}
            administratorPreview={administratorPreview}
          />
        </div>
      ) : null}
    </div>
  );
}
