'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  dashboardRoundDate,
  dashboardRoundPhase,
  selectDashboardRound,
  type DashboardRound,
} from '@/lib/dashboard';

export function RoundList({
  rounds,
  certificateCount,
  loading,
  onRoundChange,
}: {
  rounds: DashboardRound[];
  certificateCount: number;
  loading: boolean;
  onRoundChange: (round: DashboardRound) => void;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const round = selectDashboardRound(rounds);

  async function updateSignup(method: 'POST' | 'DELETE') {
    if (!round) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/rounds/${round.id}/enrol`, { method });
      const result = (await response.json()) as {
        error?: string;
        openingReminder?: boolean;
      };
      if (!response.ok) {
        setMessage(
          result.error ??
            (method === 'POST'
              ? 'Challenge signup failed.'
              : 'Signup cancellation failed.'),
        );
        return;
      }
      onRoundChange({
        ...round,
        enrolment_status: method === 'POST' ? 'active' : 'withdrawn',
      });
      setMessage(
        method === 'POST'
          ? result.openingReminder
            ? 'You are signed up. We will email you when the challenge opens.'
            : 'You are signed up.'
          : 'Your signup has been cancelled.',
      );
    } catch {
      setMessage('The challenge signup could not be updated. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const phase = round ? dashboardRoundPhase(round) : null;
  const signedUp = round?.enrolment_status === 'active';
  const registrationOpen =
    round &&
    (!round.registration_opens_at ||
      Date.now() >= new Date(round.registration_opens_at).getTime());

  return (
    <section
      id="challenge-status"
      className="card mb-8 scroll-mt-24"
      aria-labelledby="challenge-status-title"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex text-xs font-extrabold uppercase tracking-widest text-[var(--gx-accent)]">
            Challenge status
          </div>
          <h2
            id="challenge-status-title"
            className="m-0 text-xl font-bold text-[var(--gx-text)]"
          >
            {loading
              ? 'Loading challenge…'
              : round
                ? `${round.title} · ${dashboardRoundDate(round)}`
                : 'No challenge currently scheduled'}
          </h2>
          {round ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] px-2.5 py-1 text-xs font-semibold text-[var(--gx-text-bright)]">
                {phase === 'open'
                  ? 'Open now'
                  : phase === 'upcoming'
                    ? 'Upcoming'
                    : 'Closed'}
              </span>
              {signedUp ? (
                <span className="text-sm font-bold text-[var(--gx-success)]">
                  ✓ Signed up
                </span>
              ) : null}
            </div>
          ) : (
            <p className="mb-0 mt-2 text-sm text-[var(--gx-text-muted)]">
              Practice exercises remain available at any time.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {round && phase === 'open' && signedUp ? (
            <Link className="gx-btn gx-btn-primary" href="/challenge">
              Start challenge
            </Link>
          ) : null}
          {round &&
          !signedUp &&
          phase !== 'closed' &&
          registrationOpen ? (
            <button
              className="gx-btn gx-btn-primary"
              type="button"
              disabled={busy}
              onClick={() => updateSignup('POST')}
            >
              {busy ? 'Signing up…' : 'Sign up'}
            </button>
          ) : null}
          {round && signedUp && phase === 'upcoming' ? (
            <button
              className="gx-btn gx-btn-secondary"
              type="button"
              disabled={busy}
              onClick={() => updateSignup('DELETE')}
            >
              {busy ? 'Cancelling…' : 'Cancel signup'}
            </button>
          ) : null}
          <Link className="gx-btn gx-btn-secondary" href="/challenge">
            View details
          </Link>
        </div>
      </div>

      {!loading && certificateCount === 0 ? (
        <p className="mb-0 mt-4 border-t border-[var(--gx-border)] pt-4 text-sm text-[var(--gx-text-muted)]">
          Certificates will appear here after a completed challenge has been
          assessed.
        </p>
      ) : null}
      {message ? (
        <p
          className="mb-0 mt-3 text-sm text-[var(--gx-text-muted)]"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
