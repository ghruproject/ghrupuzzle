'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ExerciseDataset, ExerciseDefinition, ReferenceGenome } from '@/lib/exercises';
import { SubmissionPanel } from './submission-panel';
import { DEMO_MODE } from '@/lib/demo';

function isReleased(releaseDate?: string) {
  if (!releaseDate) {
    return false;
  }

  const normalized = releaseDate.includes('T') ? releaseDate : releaseDate.replace(' ', 'T');
  return Date.now() >= new Date(normalized).getTime();
}

function formatReleaseDate(releaseDate?: string) {
  if (!releaseDate) {
    return 'not scheduled';
  }

  const normalized = releaseDate.includes('T') ? releaseDate : releaseDate.replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? releaseDate : parsed.toLocaleString();
}

function fileNameFromUrl(value: string) {
  return value.split('/').pop() ?? value;
}

function ReferenceList({ references }: { references: ReferenceGenome[] }) {
  return (
    <div className="space-y-3 mt-2">
      {references.map((reference) => (
        <div
          key={reference.accession}
          className="grid gap-1 p-4 border border-[var(--gx-border)] rounded-xl bg-[var(--gx-surface)]"
        >
          <div>
            <p className="m-0 font-bold text-[var(--gx-text-bright)]">
              {reference.organism}{' '}
              <span className="ml-1 text-[var(--gx-accent)] font-mono text-sm">{reference.accession}</span>
            </p>
            {reference.assembly_name ? (
              <p className="mt-1 m-0 text-[var(--gx-text-muted)] text-sm">{reference.assembly_name}</p>
            ) : null}
          </div>
          <div>
            {reference.source ? <p className="m-0 text-[var(--gx-text-muted)] text-sm">{reference.source}</p> : null}
            {reference.note ? <p className="m-0 text-[var(--gx-text-muted)] text-sm">{reference.note}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ExercisePage<TSample extends { public_name: string }>({
  definition,
}: {
  definition: ExerciseDefinition<TSample>;
}) {
  const [dataset, setDataset] = useState<ExerciseDataset<TSample> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDataset() {
      if (DEMO_MODE) {
        const previewPath =
          definition.mode === 'challenge'
            ? definition.datasetPath.replace('/real_', '/practice_')
            : definition.datasetPath;
        const previewResponse = await fetch(previewPath);
        if (!previewResponse.ok) {
          throw new Error(`Failed to fetch ${previewPath}`);
        }
        const preview = (await previewResponse.json()) as ExerciseDataset<TSample>;
        return {
          ...preview,
          release_date: '2020-01-01T00:00:00Z',
          notes: [
            'Vercel preview: practice files are reused to demonstrate the challenge journey.',
            ...(preview.notes ?? []),
          ],
        };
      }

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

      if (definition.mode === 'challenge') {
        return {
          samples: [],
          answer_sheet: { species: [] },
          sample_sheet: { url: '' },
        } as ExerciseDataset<TSample>;
      }

      const legacyResponse = await fetch(definition.datasetPath);
      if (!legacyResponse.ok) {
        throw new Error(`Failed to fetch ${definition.datasetPath}`);
      }
      return legacyResponse.json() as Promise<ExerciseDataset<TSample>>;
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

  const releaseReady = useMemo(() => isReleased(dataset?.release_date), [dataset?.release_date]);
  const hasSamples = (dataset?.samples.length ?? 0) > 0;
  const hasSampleSheet = Boolean(dataset?.sample_sheet?.url);
  const canDownload = hasSamples && hasSampleSheet;
  const downloadPrefix =
    DEMO_MODE && definition.mode === 'challenge'
      ? definition.downloadPrefix.replace(/^real_/, 'practice_')
      : definition.downloadPrefix;
  const releaseDefinition = dataset?.releaseDefinition;
  const pageTitle = releaseDefinition?.title ?? definition.title;
  const pageSummary = releaseDefinition?.description ?? definition.summary;
  const taskInstructions = releaseDefinition?.instructions.length
    ? releaseDefinition.instructions
    : definition.instructions;
  const answerColumns = releaseDefinition?.fields.map((field) => ({
    name: field.name,
    description: `${field.description}${field.required ? ' Required.' : ' Optional.'}${
      field.scored ? ' Scored.' : ''
    }`,
  })) ?? definition.answerColumns;

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
          <span className="inline-flex items-center px-3 py-1 rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)] text-xs font-semibold">
            Dataset: {loading ? 'loading' : dataset?.samples.length ?? 0} samples
          </span>
          {dataset?.answer_sheet?.species?.length ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)] text-xs font-semibold">
              Expected species: {dataset.answer_sheet.species.join(', ')}
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
          <div className="mt-4 text-sm text-[var(--gx-text-muted)]">
            This is the practice set — lower stakes, same workflow.
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

      {/* Locked challenge */}
      {!loading && !error && definition.mode === 'challenge' && !releaseReady ? (
        <div className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 mb-6">
          <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">Challenge locked</h2>
          <p className="text-[var(--gx-text-muted)]">
            The challenge dataset will be available on <strong>{formatReleaseDate(dataset?.release_date)}</strong>.
          </p>
          {definition.practiceHref ? (
            <div className="flex flex-wrap gap-3 mt-4">
              <Link
                href={definition.practiceHref}
                className="inline-flex items-center justify-center px-4 py-3 rounded-xl font-bold text-[var(--gx-text-inverted)] hover:opacity-90 transition-opacity"
                style={{ background: 'var(--gx-gradient)' }}
              >
                Open practice exercise
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Main content grid */}
      {!loading && !error && (definition.mode !== 'challenge' || releaseReady) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Task */}
          <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6">
            <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">Task</h2>
            <p className="text-[var(--gx-text-muted)] mb-3">{definition.subtitle}</p>
            <ul className="pl-5 list-disc space-y-2 text-[var(--gx-text-muted)] mb-3">
              {taskInstructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ul>
            <p className="text-[var(--gx-text-muted)]">{definition.submissionText}</p>
          </section>

          {/* Sample Sheet Columns */}
          <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6">
            <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">Sample Sheet Columns</h2>
            <p className="text-[var(--gx-text-muted)] mb-4">{definition.sampleSheetIntro}</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[640px]">
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
                    <tr key={column.name}>
                      <td className="px-4 py-3 border-b border-[var(--gx-border)] align-top text-[var(--gx-text)]">
                        {column.name}
                      </td>
                      <td className="px-4 py-3 border-b border-[var(--gx-border)] align-top text-[var(--gx-text-muted)]">
                        {column.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Exercise Assets */}
          <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6">
            <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">Exercise Assets</h2>
            {canDownload ? (
              <>
                <p className="text-[var(--gx-text-muted)] mb-4">
                  Download the sample sheet and sequencing files directly.
                </p>
                <div className="flex flex-wrap gap-3 mb-4">
                  <a
                    href={dataset?.sample_sheet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-3 rounded-xl font-bold text-[var(--gx-text-inverted)] hover:opacity-90 transition-opacity text-sm"
                    style={{ background: 'var(--gx-gradient)' }}
                  >
                    Download sample sheet
                  </a>
                  {!dataset?.access ? (
                    <>
                      <a
                        href={`/${downloadPrefix}-curl-download_samples.txt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-3 rounded-xl font-bold border border-[var(--gx-border)] text-[var(--gx-text)] hover:text-[var(--gx-text-bright)] bg-transparent transition-colors text-sm"
                      >
                        curl helper
                      </a>
                      <a
                        href={`/${downloadPrefix}-wget-download_samples.txt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-3 rounded-xl font-bold border border-[var(--gx-border)] text-[var(--gx-text)] hover:text-[var(--gx-text-bright)] bg-transparent transition-colors text-sm"
                      >
                        wget helper
                      </a>
                    </>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-[var(--gx-text)] mb-2">{definition.emptyStateTitle}</h3>
                <p className="text-[var(--gx-text-muted)]">{definition.emptyStateBody}</p>
              </>
            )}

            {dataset?.notes?.length ? (
              <div className="mt-4 space-y-3">
                <h3 className="text-lg font-semibold text-[var(--gx-text)] mb-2">Dataset Notes</h3>
                <ul className="pl-5 list-disc space-y-2 text-[var(--gx-text-muted)]">
                  {dataset.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {dataset?.references?.length ? (
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-[var(--gx-text)] mb-2">Reference Genomes</h3>
                <p className="text-[var(--gx-text-muted)] mb-3">
                  These references are intended as starting material for simulation via NCBI Datasets plus your preferred short-read and
                  long-read simulators.
                </p>
                <ReferenceList references={dataset.references} />
              </div>
            ) : null}
          </section>

          <SubmissionPanel exercise={definition.exercise} mode={definition.mode} />

          {/* Samples — full width */}
          <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-6 md:col-span-2">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-1">Samples</h2>
                <p className="text-[var(--gx-text-muted)] text-sm">Public identifiers and downloadable inputs for this exercise.</p>
              </div>
            </div>

            {hasSamples ? (
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
                    {dataset?.samples.map((sample, sampleIndex) => (
                      <tr key={`${String(sample.public_name)}-${sampleIndex}`}>
                        {definition.sampleColumns.map((column) => {
                          const value = String(sample[column.key] ?? '');

                          return (
                            <td
                              key={String(column.key)}
                              className="px-4 py-3 border-b border-[var(--gx-border)] align-top text-[var(--gx-text)]"
                            >
                              {column.isFile && value ? (
                                <a href={value} target="_blank" rel="noopener noreferrer">
                                  {fileNameFromUrl(value)}
                                </a>
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
            ) : (
              <p className="text-[var(--gx-text-muted)]">No uploaded samples yet.</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
