'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import type { ExerciseMode } from '@/lib/exercises';
import { DEMO_MODE } from '@/lib/demo';

interface AvailableRelease {
  id: string;
  releaseId: string;
}

export function SubmissionPanel({
  exercise,
  mode,
}: {
  exercise: 'typing' | 'assembly' | 'hybrid' | 'outbreak';
  mode: ExerciseMode;
}) {
  const [release, setRelease] = useState<AvailableRelease | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (DEMO_MODE) {
      setRelease({ id: 'demo-release', releaseId: `${exercise}-preview` });
      return;
    }
    fetch(`/api/releases?exercise=${exercise}&mode=${mode}`)
      .then(async (response) => {
        if (response.status === 401) {
          setAuthRequired(true);
          return null;
        }
        if (!response.ok) {
          throw new Error('Release availability could not be checked');
        }
        return response.json() as Promise<{ releases: AvailableRelease[] }>;
      })
      .then((result) => setRelease(result?.releases[0] ?? null))
      .catch(() => setMessage('Release availability could not be checked.'));
  }, [exercise, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!release) return;
    setBusy(true);
    setMessage('');
    const formData = new FormData(event.currentTarget);
    if (DEMO_MODE) {
      const upload = formData.get('file');
      if (!(upload instanceof File)) return;
      const text = await upload.text();
      const resultRows = Math.max(0, text.trim().split(/\r?\n/).length - 1);
      setBusy(false);
      setMessage(
        resultRows
          ? `Preview submission accepted: ${resultRows} result row${resultRows === 1 ? '' : 's'}. A live release would now return its provisional score.`
          : 'The preview CSV needs a header and at least one result row.',
      );
      event.currentTarget.reset();
      return;
    }
    formData.set('releaseId', release.id);
    const response = await fetch('/api/submissions', { method: 'POST', body: formData });
    const result = (await response.json()) as {
      error?: string;
      earned?: number;
      possible?: number;
      passed?: boolean;
    };
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error ?? 'Submission failed.');
      return;
    }
    setMessage(
      `Submitted successfully. Provisional score: ${result.earned}/${result.possible} — ${
        result.passed ? 'pass' : 'not yet passed'
      }.`,
    );
    event.currentTarget.reset();
  }

  return (
    <section className="card gx-panel">
      <h2>Submit results</h2>
      {authRequired ? (
        <p><Link href="/sign-in">Sign in</Link> to submit results and receive feedback.</p>
      ) : release ? (
        <form className="gx-auth-stack" onSubmit={submit}>
          <label htmlFor={`${exercise}-${mode}-submission`}>Completed CSV result sheet</label>
          <input
            id={`${exercise}-${mode}-submission`}
            className="gx-input"
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
          />
          <button className="gx-button" type="submit" disabled={busy}>
            {busy ? 'Checking submission…' : 'Submit for assessment'}
          </button>
        </form>
      ) : (
        <p className="gx-muted">
          {mode === 'challenge'
            ? 'No challenge release is currently open for your account.'
            : 'No practice release has been published yet.'}
        </p>
      )}
      {message ? <p role="status" className="gx-muted">{message}</p> : null}
    </section>
  );
}
