'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  EXERCISE_LABELS,
  partitionSubmissionHistory,
  submissionModeLabel,
  submissionStatusLabel,
  type DashboardSubmission,
} from '@/lib/dashboard';

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});

const exercisePaths = {
  assembly: '/assembly',
  hybrid: '/hybrid-assembly',
  typing: '/typing',
  outbreak: '/outbreak',
} as const;

function submissionHref(submission: DashboardSubmission): string {
  const path = exercisePaths[submission.exercise];
  return submission.mode === 'practice' ? `${path}/practice` : path;
}

function statusColours(status: ReturnType<typeof submissionStatusLabel>) {
  if (status === 'Passed') {
    return {
      colour: 'var(--gx-success)',
      background: 'color-mix(in srgb, var(--gx-success) 10%, transparent)',
    };
  }
  if (status === 'Under review') {
    return {
      colour: 'var(--gx-warning)',
      background: 'color-mix(in srgb, var(--gx-warning) 12%, transparent)',
    };
  }
  return {
    colour: 'var(--gx-text-bright)',
    background: 'var(--gx-accent-dim)',
  };
}

function SubmissionCard({
  submission,
  onView,
  onReview,
  compact = false,
}: {
  submission: DashboardSubmission;
  onView: () => void;
  onReview: () => void;
  compact?: boolean;
}) {
  const status = submissionStatusLabel(submission);
  const colours = statusColours(status);
  const canRequestReview = !['flagged', 'reviewed'].includes(submission.status);

  return (
    <article
      className={`rounded-xl border border-[var(--gx-border)] bg-[var(--gx-surface)] ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--gx-accent)]">
              {submissionModeLabel(submission.mode)}
            </span>
            <span className="text-xs text-[var(--gx-text-muted)]">
              Attempt {submission.attempt_number}
            </span>
          </div>
          <h3 className="m-0 text-lg font-bold text-[var(--gx-text)]">
            {EXERCISE_LABELS[submission.exercise]}
          </h3>
          <p className="mb-0 mt-1 text-sm text-[var(--gx-text-muted)]">
            {dateTimeFormatter.format(new Date(submission.submitted_at))}
          </p>
        </div>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold"
          style={{
            color: colours.colour,
            background: colours.background,
          }}
        >
          {status === 'Passed' ? '✓ ' : ''}
          {status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div>
          <span className="block text-xs uppercase tracking-wider text-[var(--gx-text-muted)]">
            Score
          </span>
          <span className="font-bold text-[var(--gx-text)]">
            {submission.earned == null || submission.possible == null
              ? 'Pending assessment'
              : `${submission.earned}/${submission.possible}`}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            className="gx-btn gx-btn-secondary"
            type="button"
            onClick={onView}
          >
            View results
          </button>
          {canRequestReview ? (
            <button
              className="gx-btn gx-btn-secondary"
              type="button"
              onClick={onReview}
            >
              Request review
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ParticipantRecord({
  submissions,
  loading,
  onSubmissionChange,
}: {
  submissions: DashboardSubmission[];
  loading: boolean;
  onSubmissionChange: (submission: DashboardSubmission) => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedResult, setSelectedResult] =
    useState<DashboardSubmission | null>(null);
  const [reviewSubmission, setReviewSubmission] =
    useState<DashboardSubmission | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const history = useMemo(
    () => partitionSubmissionHistory(submissions),
    [submissions],
  );

  useEffect(() => {
    if (!selectedResult && !reviewSubmission) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || reviewBusy) return;
      setSelectedResult(null);
      setReviewSubmission(null);
      setReviewReason('');
      setReviewError('');
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [reviewBusy, reviewSubmission, selectedResult]);

  function openReview(submission: DashboardSubmission) {
    setSelectedResult(null);
    setReviewSubmission(submission);
    setReviewReason('');
    setReviewError('');
  }

  function closeModals() {
    if (reviewBusy) return;
    setSelectedResult(null);
    setReviewSubmission(null);
    setReviewReason('');
    setReviewError('');
  }

  async function requestReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewSubmission) return;

    setReviewBusy(true);
    setReviewError('');
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        submissionId: reviewSubmission.id,
        reason: reviewReason.trim(),
      }),
    });
    if (response.ok) {
      onSubmissionChange({ ...reviewSubmission, status: 'flagged' });
      setReviewSubmission(null);
      setReviewReason('');
    } else {
      const result = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setReviewError(
        result?.error ??
          'The review request could not be submitted. Please try again.',
      );
    }
    setReviewBusy(false);
  }

  return (
    <>
      <section
        id="submissions"
        className="card mb-8 scroll-mt-24"
        aria-labelledby="submission-history-title"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex text-xs font-extrabold uppercase tracking-widest text-[var(--gx-accent)]">
              Results
            </div>
            <h2
              id="submission-history-title"
              className="m-0 text-2xl font-bold text-[var(--gx-text)]"
            >
              Latest submissions
            </h2>
            <p className="mb-0 mt-2 text-[var(--gx-text-muted)]">
              Your most recent attempt for each exercise is shown first.
            </p>
          </div>
          {history.earlier.length ? (
            <button
              className="gx-btn gx-btn-secondary self-start"
              type="button"
              onClick={() => setHistoryOpen((current) => !current)}
              aria-expanded={historyOpen}
            >
              {historyOpen
                ? 'Hide attempt history'
                : `View attempt history (${history.earlier.length})`}
            </button>
          ) : null}
        </div>

        {loading ? (
          <p className="mb-0 mt-5 text-[var(--gx-text-muted)]">
            Loading submissions…
          </p>
        ) : history.latest.length ? (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {history.latest.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onView={() => setSelectedResult(submission)}
                onReview={() => openReview(submission)}
              />
            ))}
          </div>
        ) : (
          <p className="mb-0 mt-5 text-[var(--gx-text-muted)]">
            No submissions yet. Choose a{' '}
            <Link href="/#practice">practice exercise</Link> to get started.
          </p>
        )}

        {historyOpen && history.earlier.length ? (
          <div className="mt-6 border-t border-[var(--gx-border)] pt-6">
            <h3 className="mt-0 text-lg font-bold text-[var(--gx-text)]">
              Earlier attempts
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {history.earlier.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  onView={() => setSelectedResult(submission)}
                  onReview={() => openReview(submission)}
                  compact
                />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {selectedResult ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModals();
          }}
        >
          <section
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-dialog-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--gx-border)] bg-[var(--gx-bg-alt)] px-6 py-5">
              <div>
                <p className="mb-1 mt-0 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gx-accent)]">
                  {submissionModeLabel(selectedResult.mode)} result
                </p>
                <h2
                  id="result-dialog-title"
                  className="m-0 text-xl font-bold text-[var(--gx-text)]"
                >
                  {EXERCISE_LABELS[selectedResult.exercise]}
                </h2>
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gx-border)] bg-[var(--gx-surface)] text-xl text-[var(--gx-text-muted)]"
                type="button"
                onClick={closeModals}
                aria-label="Close result summary"
              >
                ×
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-4 px-6 py-5 text-sm">
              <div>
                <dt className="text-[var(--gx-text-muted)]">Attempt</dt>
                <dd className="m-0 mt-1 font-bold text-[var(--gx-text)]">
                  {selectedResult.attempt_number}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--gx-text-muted)]">Status</dt>
                <dd className="m-0 mt-1 font-bold text-[var(--gx-text)]">
                  {submissionStatusLabel(selectedResult)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--gx-text-muted)]">Score</dt>
                <dd className="m-0 mt-1 font-bold text-[var(--gx-text)]">
                  {selectedResult.earned == null ||
                  selectedResult.possible == null
                    ? 'Pending assessment'
                    : `${selectedResult.earned}/${selectedResult.possible}`}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--gx-text-muted)]">Submitted</dt>
                <dd className="m-0 mt-1 font-bold text-[var(--gx-text)]">
                  {dateTimeFormatter.format(
                    new Date(selectedResult.submitted_at),
                  )}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[var(--gx-text-muted)]">Result sheet</dt>
                <dd className="m-0 mt-1 break-all font-mono text-[var(--gx-text)]">
                  {selectedResult.original_filename}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--gx-border)] bg-[var(--gx-bg-alt)] px-6 py-4">
              <Link
                className="gx-btn gx-btn-secondary"
                href={submissionHref(selectedResult)}
              >
                Open exercise
              </Link>
              <button
                className="gx-btn gx-btn-primary"
                type="button"
                onClick={closeModals}
              >
                Done
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {reviewSubmission ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModals();
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gx-border)] bg-[var(--gx-surface)] text-xl text-[var(--gx-text-muted)]"
                type="button"
                onClick={closeModals}
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
                Explanation{' '}
                <span className="font-normal text-[var(--gx-text-muted)]">
                  (optional)
                </span>
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
              <div className="mt-2 flex justify-between gap-4 text-xs text-[var(--gx-text-muted)]">
                <span>Do not include passwords or confidential data.</span>
                <span className="shrink-0">{reviewReason.length}/2,000</span>
              </div>
              {reviewError ? (
                <p className="mt-4 text-sm text-[var(--gx-error)]" role="alert">
                  {reviewError}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--gx-border)] bg-[var(--gx-bg-alt)] px-6 py-4 sm:flex-row sm:justify-end">
              <button
                className="gx-btn gx-btn-secondary"
                type="button"
                onClick={closeModals}
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
    </>
  );
}
