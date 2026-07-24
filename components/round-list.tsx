'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});

interface Round {
  id: string;
  title: string;
  registration_mode: 'open' | 'invite';
  registration_opens_at: string | null;
  opens_at: string;
  closes_at: string;
  status: string;
  enrolment_status: string | null;
}

function roundPhase(round: Round): 'upcoming' | 'open' | 'closed' {
  const now = Date.now();
  if (now < new Date(round.opens_at).getTime()) return 'upcoming';
  if (now <= new Date(round.closes_at).getTime()) return 'open';
  return 'closed';
}

export function RoundList() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [message, setMessage] = useState('');
  const [busyRoundId, setBusyRoundId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/rounds')
      .then((response) => response.json() as Promise<{ rounds?: Round[] }>)
      .then((result) => setRounds(result.rounds ?? []))
      .catch(() => setMessage('Challenge dates could not be loaded.'));
  }, []);

  const orderedRounds = useMemo(
    () =>
      [...rounds].sort((left, right) => {
        const order = { open: 0, upcoming: 1, closed: 2 };
        const phaseDifference = order[roundPhase(left)] - order[roundPhase(right)];
        if (phaseDifference) return phaseDifference;
        return new Date(left.opens_at).getTime() - new Date(right.opens_at).getTime();
      }),
    [rounds],
  );

  async function signUp(roundId: string) {
    setMessage('');
    setBusyRoundId(roundId);
    try {
      const response = await fetch(`/api/rounds/${roundId}/enrol`, { method: 'POST' });
      const result = (await response.json()) as { error?: string; openingReminder?: boolean };
      if (!response.ok) {
        setMessage(result.error ?? 'Challenge signup failed.');
        return;
      }
      setRounds((current) =>
        current.map((round) =>
          round.id === roundId ? { ...round, enrolment_status: 'active' } : round,
        ),
      );
      setMessage(
        result.openingReminder
          ? 'You are signed up. We will email you when the challenge opens.'
          : 'You are signed up.',
      );
    } catch {
      setMessage('Challenge signup failed. Please try again.');
    } finally {
      setBusyRoundId(null);
    }
  }

  async function cancelSignup(roundId: string) {
    setMessage('');
    setBusyRoundId(roundId);
    try {
      const response = await fetch(`/api/rounds/${roundId}/enrol`, { method: 'DELETE' });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? 'Signup cancellation failed.');
        return;
      }
      setRounds((current) =>
        current.map((round) =>
          round.id === roundId ? { ...round, enrolment_status: 'withdrawn' } : round,
        ),
      );
      setMessage(
        'Your signup has been cancelled. You will not receive the opening-day email.',
      );
    } catch {
      setMessage('Signup cancellation failed. Please try again.');
    } finally {
      setBusyRoundId(null);
    }
  }

  return (
    <section className="card h-full">
      <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-2">Challenge calendar</h2>
      <p className="text-sm text-[var(--gx-text-muted)] mt-0 mb-4">
        Published challenge dates and your signup status. Signing up for an upcoming challenge
        includes one opening-day email. You can cancel before the challenge opens.
      </p>
      {orderedRounds.length ? (
        <div className="divide-y divide-[var(--gx-border)]">
          {orderedRounds.map((round) => {
            const phase = roundPhase(round);
            const signedUp = round.enrolment_status === 'active';
            const registrationOpen =
              !round.registration_opens_at ||
              Date.now() >= new Date(round.registration_opens_at).getTime();
            return (
              <article key={round.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--gx-text)] m-0">{round.title}</h3>
                    <p className="text-sm text-[var(--gx-text-muted)] mt-1 mb-3">
                      {dateTimeFormatter.format(new Date(round.opens_at))} –{' '}
                      {dateTimeFormatter.format(new Date(round.closes_at))}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)] text-xs font-semibold">
                    {phase === 'open' ? 'Open now' : phase === 'upcoming' ? 'Upcoming' : 'Closed'}
                  </span>
                </div>
                {signedUp ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-bold text-[var(--gx-success)]">✓ Signed up</span>
                    {phase === 'upcoming' ? (
                      <button
                        className="gx-btn gx-btn-secondary"
                        disabled={busyRoundId === round.id}
                        onClick={() => cancelSignup(round.id)}
                      >
                        {busyRoundId === round.id ? 'Cancelling…' : 'Cancel signup'}
                      </button>
                    ) : null}
                    {phase === 'open' ? <Link href="/challenge" className="font-semibold text-sm">Start challenge →</Link> : null}
                  </div>
                ) : phase !== 'closed' && registrationOpen ? (
                  <button
                    className="gx-btn gx-btn-primary"
                    disabled={busyRoundId === round.id}
                    onClick={() => signUp(round.id)}
                  >
                    {busyRoundId === round.id ? 'Signing up…' : 'Sign up'}
                  </button>
                ) : phase === 'upcoming' ? (
                  <span className="text-sm text-[var(--gx-text-muted)]">Signup opens later</span>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[var(--gx-text-muted)] m-0">No challenge dates are currently published.</p>
          <Link className="font-semibold self-start" href="/challenge">
            View challenge information →
          </Link>
        </div>
      )}
      {message ? <p role="status" className="text-sm text-[var(--gx-text-muted)] mt-4 mb-0">{message}</p> : null}
    </section>
  );
}
