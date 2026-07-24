'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { ExerciseMode } from '@/lib/exercises';

interface AvailableRelease {
  id: string;
  releaseId: string;
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
  const [authRequired, setAuthRequired] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!datasetAvailable) return;
    fetch(`/api/releases?exercise=${exercise}&mode=${mode}`)
      .then(async (response) => {
        if (response.status === 401) {
          setAuthRequired(true);
          return null;
        }
        if (!response.ok) {
          throw new Error('Release availability could not be checked');
        }
        setAuthRequired(false);
        return response.json() as Promise<{ releases: AvailableRelease[] }>;
      })
      .then((result) => setRelease(result?.releases[0] ?? null))
      .catch(() => setMessage('Release availability could not be checked.'));
  }, [datasetAvailable, exercise, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!release) return;
    const form = event.currentTarget;
    setBusy(true);
    setMessage('');
    const formData = new FormData(form);
    formData.set('releaseId', release.id);
    try {
      const response = await fetch('/api/submissions', { method: 'POST', body: formData });
      const contentType = response.headers.get('content-type') ?? '';
      const result = contentType.includes('application/json')
        ? ((await response.json()) as {
            error?: string;
            earned?: number;
            possible?: number;
            passed?: boolean;
          })
        : { error: (await response.text()).trim() };
      if (!response.ok) {
        setMessage(result.error || 'Submission failed.');
        return;
      }
      setMessage(
        mode === 'challenge'
          ? 'Submitted successfully. Your challenge result has been recorded; scores will be available after assessment.'
          : `Submitted successfully. Provisional score: ${result.earned}/${result.possible} — ${
              result.passed ? 'pass' : 'not yet passed'
            }.`,
      );
      form.reset();
    } catch {
      setMessage('Submission could not be completed. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">Submit results</h2>
      {!datasetAvailable ? (
        <p className="text-[var(--gx-text-muted)]">
          Submission will open when this practice dataset and sample sheet are published.
        </p>
      ) : authRequired ? (
        <div className="flex flex-col gap-3">
          <p className="text-[var(--gx-text-muted)] m-0">
            The preview and downloads are public. Sign in or create an account when you are ready
            to submit your completed result sheet for assessment and feedback.
          </p>
          <Link
            className="gx-btn gx-btn-primary self-start"
            href={`/sign-in?returnTo=${encodeURIComponent(pathname)}`}
          >
            Sign in to submit
          </Link>
        </div>
      ) : release ? (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div>
            <label className="label" htmlFor={`${exercise}-${mode}-submission`}>
              Completed CSV or TSV result sheet
            </label>
            <p className="text-sm text-[var(--gx-text-muted)] mt-1 mb-0">
              Use the supplied sample sheet, keep one row per sample and retain every assessed
              column. Files must be UTF-8 encoded. Header capitalisation and surrounding whitespace
              in answers do not affect scoring. Sample identifiers are matched case-insensitively;
              unordered gene lists may use commas, semicolons or pipes.
            </p>
          </div>
          <input
            id={`${exercise}-${mode}-submission`}
            className="gx-input w-full"
            type="file"
            name="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            required
          />
          <button className="gx-btn gx-btn-primary self-start" type="submit" disabled={busy}>
            {busy ? 'Checking submission…' : 'Submit for assessment'}
          </button>
        </form>
      ) : (
        <p className="text-[var(--gx-text-muted)]">
          {mode === 'challenge'
            ? 'No challenge release is currently open for your account.'
            : 'Assessment submissions for this practice exercise are being prepared. The preview and downloads remain available.'}
        </p>
      )}
      {message ? <p role="status" className="text-[var(--gx-text-muted)]">{message}</p> : null}
    </section>
  );
}
