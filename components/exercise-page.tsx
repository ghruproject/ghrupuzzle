'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ExerciseDataset, ExerciseDefinition, ReferenceGenome } from '@/lib/exercises';

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
    <div className="gx-stack-sm">
      {references.map((reference) => (
        <div key={reference.accession} className="gx-reference-item">
          <div>
            <p className="gx-reference-title">
              {reference.organism} <span>{reference.accession}</span>
            </p>
            {reference.assembly_name ? <p className="gx-reference-copy">{reference.assembly_name}</p> : null}
          </div>
          <div>
            {reference.source ? <p className="gx-reference-copy">{reference.source}</p> : null}
            {reference.note ? <p className="gx-reference-copy">{reference.note}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ExercisePage<TSample extends { public_name: string } & Record<string, string>>({
  definition,
}: {
  definition: ExerciseDefinition<TSample>;
}) {
  const [dataset, setDataset] = useState<ExerciseDataset<TSample> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch(definition.datasetPath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch ${definition.datasetPath}`);
        }

        return response.json();
      })
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
  }, [definition.datasetPath]);

  const releaseReady = useMemo(() => isReleased(dataset?.release_date), [dataset?.release_date]);
  const hasSamples = (dataset?.samples.length ?? 0) > 0;
  const hasSampleSheet = Boolean(dataset?.sample_sheet?.url);
  const canDownload = hasSamples && hasSampleSheet;

  return (
    <div className="gx-page">
      <section className="gx-hero">
        <div className="gx-kicker">{definition.kindLabel}</div>
        <h1>{definition.title}</h1>
        <p className="gx-hero-copy">{definition.summary}</p>
        <div className="gx-hero-meta">
          <span className="gx-tag">{definition.mode === 'challenge' ? 'Challenge' : 'Practice'}</span>
          <span className="gx-tag">Dataset: {loading ? 'loading' : dataset?.samples.length ?? 0} samples</span>
          {dataset?.answer_sheet?.species?.length ? (
            <span className="gx-tag">Expected species: {dataset.answer_sheet.species.join(', ')}</span>
          ) : null}
        </div>
      </section>

      {loading ? <div className="card gx-message-card">Loading exercise metadata...</div> : null}
      {error ? <div className="card gx-message-card gx-message-error">{error}</div> : null}

      {!loading && !error && definition.mode === 'challenge' && !releaseReady ? (
        <div className="card gx-message-card">
          <h2>Challenge locked</h2>
          <p>
            The challenge dataset will be available on <strong>{formatReleaseDate(dataset?.release_date)}</strong>.
          </p>
          {definition.practiceHref ? (
            <div className="gx-button-row">
              <Link href={definition.practiceHref} className="gx-button">
                Open practice exercise
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && (definition.mode !== 'challenge' || releaseReady) ? (
        <div className="gx-grid">
          <section className="card gx-panel">
            <h2>Task</h2>
            <p>{definition.subtitle}</p>
            <ul className="gx-list">
              {definition.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ul>
            <p className="gx-muted">{definition.submissionText}</p>
          </section>

          <section className="card gx-panel">
            <h2>Sample Sheet Columns</h2>
            <p>{definition.sampleSheetIntro}</p>
            <div className="gx-table-wrap">
              <table className="gx-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {definition.answerColumns.map((column) => (
                    <tr key={column.name}>
                      <td>{column.name}</td>
                      <td>{column.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card gx-panel">
            <h2>Exercise Assets</h2>
            {canDownload ? (
              <>
                <p>Download the sample sheet and sequencing files directly, or use the generated shell helpers.</p>
                <div className="gx-button-row">
                  <a href={dataset?.sample_sheet.url} target="_blank" rel="noopener noreferrer" className="gx-button">
                    Download sample sheet
                  </a>
                  <a
                    href={`/${definition.downloadPrefix}-curl-download_samples.txt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gx-button gx-button-secondary"
                  >
                    curl helper
                  </a>
                  <a
                    href={`/${definition.downloadPrefix}-wget-download_samples.txt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gx-button gx-button-secondary"
                  >
                    wget helper
                  </a>
                </div>
              </>
            ) : (
              <>
                <h3>{definition.emptyStateTitle}</h3>
                <p>{definition.emptyStateBody}</p>
              </>
            )}

            {dataset?.notes?.length ? (
              <div className="gx-stack-sm">
                <h3>Dataset Notes</h3>
                <ul className="gx-list">
                  {dataset.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {dataset?.references?.length ? (
              <div className="gx-stack-sm">
                <h3>Reference Genomes</h3>
                <p className="gx-muted">
                  These references are intended as starting material for simulation via NCBI Datasets plus your preferred short-read and
                  long-read simulators.
                </p>
                <ReferenceList references={dataset.references} />
              </div>
            ) : null}
          </section>

          <section className="card gx-panel gx-panel-wide">
            <div className="gx-panel-heading">
              <div>
                <h2>Samples</h2>
                <p className="gx-muted">Public identifiers and downloadable inputs for this exercise.</p>
              </div>
            </div>

            {hasSamples ? (
              <div className="gx-table-wrap">
                <table className="gx-table">
                  <thead>
                    <tr>
                      {definition.sampleColumns.map((column) => (
                        <th key={String(column.key)}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataset?.samples.map((sample, sampleIndex) => (
                      <tr key={`${String(sample.public_name)}-${sampleIndex}`}>
                        {definition.sampleColumns.map((column) => {
                          const value = String(sample[column.key] ?? '');

                          return (
                            <td key={String(column.key)}>
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
              <p className="gx-muted">No uploaded samples yet.</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
