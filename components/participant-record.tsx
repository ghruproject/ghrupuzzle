'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeZone: 'Europe/London',
});

interface Submission {
  id: string;
  original_filename: string;
  submitted_at: string;
  status: string;
  earned: number | null;
  possible: number | null;
  passed: number | null;
  provisional: number | null;
}

interface Certificate {
  id: string;
  public_code: string;
  issued_at: string;
  revoked_at: string | null;
  round_title: string;
}

export function ParticipantRecord() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [reviewSubmissionId, setReviewSubmissionId] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/submissions').then((response) => response.json() as Promise<{ submissions: Submission[] }>),
      fetch('/api/certificates').then((response) => response.json() as Promise<{ certificates: Certificate[] }>),
    ]).then(([submissionResult, certificateResult]) => {
      setSubmissions(submissionResult.submissions ?? []);
      setCertificates(certificateResult.certificates ?? []);
    });
  }, []);

  useEffect(() => {
    if (!reviewSubmissionId) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !reviewBusy) {
        setReviewSubmissionId(null);
        setReviewReason('');
        setReviewError('');
      }
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [reviewBusy, reviewSubmissionId]);

  function openReviewDialog(submissionId: string) {
    setReviewSubmissionId(submissionId);
    setReviewReason('');
    setReviewError('');
  }

  function closeReviewDialog() {
    if (reviewBusy) return;
    setReviewSubmissionId(null);
    setReviewReason('');
    setReviewError('');
  }

  async function requestReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewSubmissionId) return;

    setReviewBusy(true);
    setReviewError('');
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        submissionId: reviewSubmissionId,
        reason: reviewReason.trim(),
      }),
    });
    if (response.ok) {
      setSubmissions((current) =>
        current.map((item) =>
          item.id === reviewSubmissionId ? { ...item, status: 'flagged' } : item,
        ),
      );
      setReviewSubmissionId(null);
      setReviewReason('');
      setReviewError('');
    } else {
      const result = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setReviewError(
        result?.error ?? 'The review request could not be submitted. Please try again.',
      );
    }
    setReviewBusy(false);
  }

  return (
    <>
      <section id="submissions" className="card mb-8 scroll-mt-24">
        <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">Your submissions</h2>
        {submissions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr>
                  {['File', 'Submitted', 'Score', 'Status', ''].map((label) => (
                    <th
                      key={label || 'actions'}
                      className="px-4 py-3 border-b border-[var(--gx-border)] text-left text-xs uppercase tracking-wider text-[var(--gx-text-muted)]"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td className="px-4 py-3 border-b border-[var(--gx-border)]">{submission.original_filename}</td>
                    <td className="px-4 py-3 border-b border-[var(--gx-border)]">{dateTimeFormatter.format(new Date(submission.submitted_at))}</td>
                    <td className="px-4 py-3 border-b border-[var(--gx-border)]">{submission.earned == null ? '—' : `${submission.earned}/${submission.possible}`}</td>
                    <td className="px-4 py-3 border-b border-[var(--gx-border)]">
                      <span className="inline-flex items-center gap-1 font-semibold text-[var(--gx-success)]">
                        ✓ {submission.provisional ? 'Submitted — provisional' : submission.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-[var(--gx-border)]">
                      {!['flagged', 'reviewed'].includes(submission.status) ? (
                        <button
                          className="gx-btn gx-btn-secondary"
                          type="button"
                          onClick={() => openReviewDialog(submission.id)}
                        >
                          Request review
                        </button>
                      ) : submission.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[var(--gx-text-muted)]">
            No submissions yet. Choose a <Link href="/#practice">practice exercise</Link> to get started.
          </p>
        )}
      </section>
      {reviewSubmissionId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReviewDialog();
          }}
        >
          <form
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-dialog-title"
            aria-describedby="review-dialog-description"
            onSubmit={requestReview}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--gx-border)] bg-[var(--gx-bg-alt)] px-6 py-5">
              <div>
                <p className="mb-1 mt-0 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gx-accent)]">
                  Submission support
                </p>
                <h2
                  id="review-dialog-title"
                  className="m-0 text-xl font-bold text-[var(--gx-text)]"
                >
                  Request a review
                </h2>
              </div>
              <button
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--gx-border)] bg-[var(--gx-surface)] text-xl leading-none text-[var(--gx-text-muted)] transition hover:border-[var(--gx-accent)] hover:text-[var(--gx-text)]"
                type="button"
                onClick={closeReviewDialog}
                disabled={reviewBusy}
                aria-label="Close review request"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5">
              <p
                id="review-dialog-description"
                className="mt-0 text-sm leading-6 text-[var(--gx-text-muted)]"
              >
                Tell the review team what you would like them to check. This is
                optional—you can submit the request without an explanation.
              </p>
              <label
                className="mt-5 block text-sm font-semibold text-[var(--gx-text)]"
                htmlFor="review-reason"
              >
                Explanation <span className="font-normal text-[var(--gx-text-muted)]">(optional)</span>
              </label>
              <textarea
                id="review-reason"
                className="gx-input mt-2 min-h-32 w-full resize-y"
                value={reviewReason}
                onChange={(event) => setReviewReason(event.target.value)}
                placeholder="For example: Please check the score for Sample_TP003."
                maxLength={2000}
                disabled={reviewBusy}
                autoFocus
              />
              <div className="mt-2 flex items-start justify-between gap-4">
                <p className="m-0 text-xs text-[var(--gx-text-muted)]">
                  Do not include passwords or confidential data.
                </p>
                <span className="shrink-0 text-xs text-[var(--gx-text-muted)]">
                  {reviewReason.length}/2,000
                </span>
              </div>

              {reviewError ? (
                <p
                  className="mt-4 rounded-lg border px-3 py-2 text-sm font-medium text-[var(--gx-error)]"
                  style={{
                    borderColor: 'var(--gx-error)',
                    background:
                      'color-mix(in srgb, var(--gx-error) 8%, transparent)',
                  }}
                  role="alert"
                >
                  {reviewError}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--gx-border)] bg-[var(--gx-bg-alt)] px-6 py-4 sm:flex-row sm:justify-end">
              <button
                className="gx-btn gx-btn-secondary"
                type="button"
                onClick={closeReviewDialog}
                disabled={reviewBusy}
              >
                Cancel
              </button>
              <button
                className="gx-btn gx-btn-primary"
                type="submit"
                disabled={reviewBusy}
              >
                {reviewBusy ? 'Submitting…' : 'Submit review request'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      <section className="card">
        <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">Your certificates</h2>
        {certificates.length ? certificates.map((certificate) => (
          <article key={certificate.id}>
            <h3 className="text-lg font-semibold text-[var(--gx-text)]">{certificate.round_title}</h3>
            <p className="text-[var(--gx-text-muted)]">Issued {dateFormatter.format(new Date(certificate.issued_at))}</p>
            {certificate.revoked_at ? <span className="inline-flex items-center px-3 py-1 rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)] text-xs font-semibold">Revoked</span> : (
              <div className="flex flex-wrap gap-3 mt-4">
                <a className="gx-btn gx-btn-primary" href={`/api/certificates/${certificate.id}/download`}>Download PDF</a>
                <Link className="gx-btn gx-btn-secondary" href={`/verify/${certificate.public_code}`}>Verify</Link>
              </div>
            )}
          </article>
        )) : (
          <p className="text-[var(--gx-text-muted)]">
            Official certificates will appear here after a completed challenge has been assessed.
          </p>
        )}
      </section>
    </>
  );
}
