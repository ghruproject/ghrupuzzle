'use client';

import { useMemo, useState } from 'react';

interface AnswerSample {
  sample_id?: unknown;
  answers?: Record<string, unknown>;
}

interface AnswerKey {
  samples?: AnswerSample[];
  [key: string]: unknown;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.map(displayValue).join('; ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function AdminAnswerReveal({ releaseId }: { releaseId: string }) {
  const [answerKey, setAnswerKey] = useState<AnswerKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const endpoint = `/api/admin/releases/${encodeURIComponent(releaseId)}/answers`;
  const samples = useMemo(
    () => (Array.isArray(answerKey?.samples) ? answerKey.samples : []),
    [answerKey],
  );
  const fields = useMemo(() => {
    const found = new Set<string>();
    for (const sample of samples) {
      for (const field of Object.keys(sample.answers ?? {})) found.add(field);
    }
    return [...found];
  }, [samples]);

  async function reveal() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const body = await response.text();
      if (!response.ok) throw new Error(body || 'The answer key could not be loaded.');
      setAnswerKey(JSON.parse(body) as AnswerKey);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The answer key could not be loaded.');
    } finally {
      setBusy(false);
    }
  }

  if (!answerKey) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
        <p className="m-0 font-bold text-[var(--gx-text)]">Answers are hidden</p>
        <p className="mb-4 mt-2 text-sm text-[var(--gx-text-muted)]">
          Reveal only when you are ready to inspect the private truth. Viewing is recorded in the
          administration audit log.
        </p>
        <button className="gx-btn gx-btn-primary" disabled={busy} type="button" onClick={reveal}>
          {busy ? 'Loading answers…' : 'Reveal answers'}
        </button>
        {message ? <p className="mb-0 mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{message}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button className="gx-btn gx-btn-secondary" type="button" onClick={() => setAnswerKey(null)}>
          Hide answers
        </button>
        <a className="gx-btn gx-btn-secondary" href={endpoint} rel="noopener noreferrer" target="_blank">
          Open raw JSON
        </a>
        <a className="gx-btn gx-btn-secondary" href={`${endpoint}?download=1`}>
          Download JSON
        </a>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--gx-border)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-[var(--gx-bg-alt)]">
            <tr>
              <th className="border-b border-[var(--gx-border)] px-3 py-2">Sample</th>
              {fields.map((field) => (
                <th className="border-b border-[var(--gx-border)] px-3 py-2" key={field}>{field}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {samples.map((sample, index) => (
              <tr key={`${String(sample.sample_id ?? 'sample')}-${index}`}>
                <td className="border-b border-[var(--gx-border)] px-3 py-2 font-semibold">
                  {displayValue(sample.sample_id)}
                </td>
                {fields.map((field) => (
                  <td className="border-b border-[var(--gx-border)] px-3 py-2" key={field}>
                    {displayValue(sample.answers?.[field])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
