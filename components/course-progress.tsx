'use client';

import Link from 'next/link';
import { ProgressBar } from '@genomicx/ui';
import { useMemo } from 'react';
import {
  buildCourseModules,
  type SubmissionMode,
} from '@/lib/course-progress';
import {
  activeEnrolledChallenge,
  type DashboardRound,
  type DashboardSubmission,
} from '@/lib/dashboard';

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="m5 12.5 4.2 4.2L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CourseProgress({
  submissions,
  rounds,
  loading,
}: {
  submissions: DashboardSubmission[];
  rounds: DashboardRound[];
  loading: boolean;
}) {
  const challengeActive = activeEnrolledChallenge(rounds) !== null;
  const mode: SubmissionMode = challengeActive ? 'challenge' : 'practice';
  const modules = useMemo(
    () => buildCourseModules(submissions, mode),
    [mode, submissions],
  );
  const submittedCount = modules.filter((module) => module.submitted).length;
  const progress = (submittedCount / modules.length) * 100;
  const modeLabel = challengeActive ? 'challenge' : 'practice';

  return (
    <section className="card mb-8" aria-labelledby="submission-progress-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex text-xs font-extrabold uppercase tracking-widest text-[var(--gx-accent)]">
            Your progress
          </div>
          <h2
            id="submission-progress-title"
            className="m-0 text-2xl font-bold text-[var(--gx-text)]"
          >
            {challengeActive ? 'Challenge progress' : 'Practice progress'}
          </h2>
          <p className="mb-0 mt-2 text-[var(--gx-text-muted)]">
            {challengeActive
              ? 'Complete each challenge exercise before the round closes.'
              : 'A green check appears when you have submitted practice results.'}
          </p>
        </div>
        <span className="inline-flex self-start items-center rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] px-3 py-1 text-sm font-semibold text-[var(--gx-text-bright)]">
          {loading
            ? 'Loading progress…'
            : `${submittedCount} of ${modules.length} submitted`}
        </span>
      </div>

      <div className="mt-5">
        <ProgressBar
          value={progress}
          label={
            loading
              ? 'Loading your progress…'
              : `${Math.round(progress)}% of ${modeLabel} exercises submitted`
          }
        />
      </div>

      <ol className="mt-6 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
        {modules.map((module, index) => (
          <li
            key={module.exercise}
            className={`flex flex-col gap-3 rounded-2xl border p-5 ${
              module.submitted
                ? 'border-[var(--gx-success)] bg-[color-mix(in_srgb,var(--gx-success)_8%,var(--gx-surface))]'
                : 'border-[var(--gx-border)] bg-[var(--gx-surface)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${
                  module.submitted
                    ? 'bg-[var(--gx-success)] text-white'
                    : 'bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)]'
                }`}
                aria-label={
                  module.submitted ? 'Submitted' : `Exercise ${index + 1}`
                }
              >
                {module.submitted ? <CheckIcon /> : index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="m-0 text-lg font-bold text-[var(--gx-text)]">
                  {module.title}
                </h3>
                <p className="mb-0 mt-1 text-sm text-[var(--gx-text-muted)]">
                  {module.description}
                </p>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-2">
              {module.submitted ? (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-[var(--gx-success)]">
                  <CheckIcon />
                  {module.passed ? 'Passed' : 'Submitted'}
                </span>
              ) : (
                <span className="text-sm font-semibold text-[var(--gx-text-muted)]">
                  Not yet submitted
                </span>
              )}
              {module.latestSubmission?.earned != null &&
              module.latestSubmission.possible != null ? (
                <span className="text-sm text-[var(--gx-text-muted)]">
                  Score {module.latestSubmission.earned}/
                  {module.latestSubmission.possible}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                className={
                  module.submitted
                    ? 'gx-btn gx-btn-secondary'
                    : 'gx-btn gx-btn-primary'
                }
                href={
                  challengeActive ? module.challengeHref : module.practiceHref
                }
              >
                {module.submitted
                  ? `Open ${modeLabel}`
                  : `Start ${modeLabel}`}
              </Link>
              {module.submitted ? (
                <a
                  className="self-center text-sm font-semibold"
                  href="#submissions"
                >
                  View results
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
