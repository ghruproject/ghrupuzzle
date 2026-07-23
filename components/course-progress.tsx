'use client';

import Link from 'next/link';
import { ProgressBar } from '@genomicx/ui';
import { useEffect, useMemo, useState } from 'react';
import {
  buildCourseModules,
  type CourseSubmission,
} from '@/lib/course-progress';

interface SubmissionResponse extends CourseSubmission {
  id: string;
}

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

export function CourseProgress() {
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/submissions')
      .then(async (response) => {
        if (!response.ok) throw new Error('Progress could not be loaded.');
        return response.json() as Promise<{ submissions: SubmissionResponse[] }>;
      })
      .then((result) => setSubmissions(result.submissions ?? []))
      .catch(() => setMessage('Your module progress could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  const modules = useMemo(() => buildCourseModules(submissions), [submissions]);
  const submittedCount = modules.filter((module) => module.submitted).length;
  const progress = (submittedCount / modules.length) * 100;

  return (
    <section className="card mb-8" aria-labelledby="course-progress-title">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <div className="inline-flex mb-2 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">
            Your learning pathway
          </div>
          <h2 id="course-progress-title" className="text-2xl font-bold text-[var(--gx-text)] mt-0 mb-2">
            Complete the four genomics modules
          </h2>
          <p className="text-[var(--gx-text-muted)] m-0">
            Submit a result sheet for each module to complete your pathway.
          </p>
        </div>
        <span className="inline-flex self-start items-center px-3 py-1 rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)] text-sm font-semibold">
          {loading ? 'Loading progress…' : `${submittedCount} of ${modules.length} submitted`}
        </span>
      </div>

      <ProgressBar
        value={progress}
        label={loading ? 'Loading your progress…' : `${Math.round(progress)}% of the pathway submitted`}
      />

      <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-0 list-none">
        {modules.map((module, index) => (
          <li
            key={module.exercise}
            className={`rounded-2xl border p-5 flex flex-col gap-3 ${
              module.submitted
                ? 'border-[var(--gx-success)] bg-[color-mix(in_srgb,var(--gx-success)_8%,var(--gx-surface))]'
                : 'border-[var(--gx-border)] bg-[var(--gx-surface)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`w-9 h-9 rounded-full flex shrink-0 items-center justify-center font-bold ${
                  module.submitted
                    ? 'bg-[var(--gx-success)] text-white'
                    : 'bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)]'
                }`}
                aria-label={module.submitted ? 'Submitted' : `Module ${index + 1}`}
              >
                {module.submitted ? <CheckIcon /> : index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-[var(--gx-text)] m-0">{module.title}</h3>
                <p className="text-sm text-[var(--gx-text-muted)] mt-1 mb-0">{module.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-auto">
              {module.submitted ? (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-[var(--gx-success)]">
                  <CheckIcon />
                  {module.passed ? 'Passed' : 'Submitted'}
                </span>
              ) : (
                <span className="text-sm font-semibold text-[var(--gx-text-muted)]">Not yet submitted</span>
              )}
              {module.latestSubmission?.earned != null && module.latestSubmission.possible != null ? (
                <span className="text-sm text-[var(--gx-text-muted)]">
                  Score {module.latestSubmission.earned}/{module.latestSubmission.possible}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link className={module.submitted ? 'gx-btn gx-btn-secondary' : 'gx-btn gx-btn-primary'} href={module.href}>
                {module.submitted ? 'Revisit module' : 'Start module'}
              </Link>
              {module.submitted ? (
                <a className="gx-btn gx-btn-secondary" href="#submissions">
                  View submission
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {message ? <p role="status" className="text-sm text-[var(--gx-text-muted)] mt-4 mb-0">{message}</p> : null}
    </section>
  );
}
