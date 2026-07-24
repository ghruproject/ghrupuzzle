'use client';

import { FormEvent, useEffect, useState } from 'react';

interface Review {
  id: string;
  submission_id: string;
  reason: string;
  participant_name: string;
  participant_email: string;
  exercise: string;
  release_id: string;
  earned: number;
  possible: number;
  passed: number;
  attempt_number: number;
  original_filename: string;
  parsedRows: Array<Record<string, string>>;
  parsingWarnings: string[];
  details: {
    items: Array<{
      sampleId: string;
      field: string;
      correct: boolean;
      submitted: string;
      expected: string;
      weight: number;
    }>;
  };
  previousSubmissions: Array<{
    id: string;
    attempt_number: number;
    original_filename: string;
    submitted_at: string;
    status: string;
    earned: number;
    possible: number;
    passed: number;
    review_status?: string | null;
    resolution?: string | null;
  }>;
  auditTrail: Array<{
    action: string;
    actor_user_id: string | null;
    created_at: string;
  }>;
}

export function ReviewQueue() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [message, setMessage] = useState('');

  function load() {
    fetch('/api/reviews')
      .then((response) => response.json() as Promise<{ reviews?: Review[]; error?: string }>)
      .then((result) => {
        if (result.error) throw new Error(result.error);
        setReviews(result.reviews ?? []);
      })
      .catch((error: Error) => setMessage(error.message));
  }

  useEffect(load, []);

  async function decide(event: FormEvent<HTMLFormElement>, review: Review) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const status = String(data.get('status'));
    const response = await fetch(`/api/reviews/${review.id}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        status,
        resolution: data.get('resolution'),
        earned: Number(data.get('earned')),
        possible: Number(data.get('possible')),
        passed: data.get('passed') === 'on',
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? 'Review decision failed.');
      return;
    }
    setMessage('Review decision recorded.');
    load();
  }

  if (!reviews.length) {
    return <p className="text-[var(--gx-text-muted)]">{message || 'There are no open reviews.'}</p>;
  }
  return (
    <div className="flex flex-col gap-3 mt-3">
      {reviews.map((review) => (
        <article className="card" key={review.id}>
          <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">{review.exercise}: {review.participant_name}</h2>
          <p className="text-[var(--gx-text-muted)]">{review.participant_email} · {review.release_id}</p>
          <p className="text-sm text-[var(--gx-text-muted)]">
            Attempt {review.attempt_number} · {review.original_filename}
          </p>
          <p><strong>Request:</strong> {review.reason}</p>
          <p>Automatic score: {review.earned}/{review.possible} ({review.passed ? 'pass' : 'fail'})</p>
          {review.parsingWarnings.length ? (
            <div className="rounded-xl border border-red-400/40 p-4 mb-4">
              <strong>Validation or parsing warnings</strong>
              <ul className="mb-0">
                {review.parsingWarnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          ) : null}
          <details className="mb-4">
            <summary className="font-semibold cursor-pointer">Submitted rows</summary>
            {review.parsedRows.length ? (
              <div className="overflow-x-auto mt-3">
                <table className="w-full border-collapse min-w-max text-sm">
                  <thead>
                    <tr>
                      {Object.keys(review.parsedRows[0]).map((header) => (
                        <th className="px-3 py-2 border-b border-[var(--gx-border)] text-left" key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {review.parsedRows.map((row, index) => (
                      <tr key={index}>
                        {Object.keys(review.parsedRows[0]).map((header) => (
                          <td className="px-3 py-2 border-b border-[var(--gx-border)]" key={header}>{row[header]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p>No parsed rows are available.</p>}
          </details>
          <details className="mb-4">
            <summary className="font-semibold cursor-pointer">Automatic field-level scoring</summary>
            <div className="overflow-x-auto mt-3">
              <table className="w-full border-collapse min-w-max text-sm">
                <thead>
                  <tr>
                    {['Sample', 'Field', 'Submitted', 'Expected', 'Result', 'Weight'].map((header) => (
                      <th className="px-3 py-2 border-b border-[var(--gx-border)] text-left" key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {review.details.items.map((item) => (
                    <tr key={`${item.sampleId}-${item.field}`}>
                      <td className="px-3 py-2 border-b border-[var(--gx-border)]">{item.sampleId}</td>
                      <td className="px-3 py-2 border-b border-[var(--gx-border)]">{item.field}</td>
                      <td className="px-3 py-2 border-b border-[var(--gx-border)]">{item.submitted || '—'}</td>
                      <td className="px-3 py-2 border-b border-[var(--gx-border)]">{item.expected || '—'}</td>
                      <td className="px-3 py-2 border-b border-[var(--gx-border)]">{item.correct ? 'Correct' : 'Incorrect'}</td>
                      <td className="px-3 py-2 border-b border-[var(--gx-border)]">{item.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <details className="mb-5">
            <summary className="font-semibold cursor-pointer">
              Previous submissions and audit trail
            </summary>
            <div className="mt-3">
              {review.previousSubmissions.length ? (
                <ul>
                  {review.previousSubmissions.map((submission) => (
                    <li key={`${submission.id}-${submission.review_status ?? ''}`}>
                      Attempt {submission.attempt_number}: {submission.earned}/{submission.possible}
                      {' '}({submission.passed ? 'pass' : 'fail'})
                      {submission.review_status ? ` · review ${submission.review_status}` : ''}
                      {submission.resolution ? ` · ${submission.resolution}` : ''}
                    </li>
                  ))}
                </ul>
              ) : <p>No previous submissions.</p>}
              <h3 className="text-base">Audit events</h3>
              <ul>
                {review.auditTrail.map((event, index) => (
                  <li key={`${event.action}-${event.created_at}-${index}`}>
                    {event.created_at}: {event.action}
                    {event.actor_user_id ? ` by ${event.actor_user_id}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          </details>
          <form className="flex flex-col gap-4" onSubmit={(event) => decide(event, review)}>
            <label className="label">Decision
              <select className="gx-input mt-2 w-full" name="status" defaultValue="upheld">
                <option value="upheld">Uphold automatic result</option>
                <option value="overruled">Override result</option>
              </select>
            </label>
            <label className="label">Earned points
              <input className="gx-input mt-2 w-full" name="earned" type="number" min="0" defaultValue={review.earned} />
            </label>
            <label className="label">Possible points
              <input className="gx-input mt-2 w-full" name="possible" type="number" min="1" defaultValue={review.possible} />
            </label>
            <label><input name="passed" type="checkbox" defaultChecked={Boolean(review.passed)} /> Passing result</label>
            <label className="label">Required reason
              <textarea className="gx-input mt-2 min-h-28 w-full" name="resolution" required maxLength={2000} />
            </label>
            <button className="gx-btn gx-btn-primary self-start" type="submit">Record decision</button>
          </form>
        </article>
      ))}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
