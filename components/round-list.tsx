'use client';

import { useEffect, useState } from 'react';

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});

interface Round {
  id: string;
  title: string;
  opens_at: string;
  closes_at: string;
  enrolment_status: string | null;
}

export function RoundList() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/rounds')
      .then((response) => response.json() as Promise<{ rounds?: Round[] }>)
      .then((result) => setRounds(result.rounds ?? []))
      .catch(() => setMessage('Rounds could not be loaded.'));
  }, []);

  async function enrol(roundId: string) {
    setMessage('');
    const response = await fetch(`/api/rounds/${roundId}/enrol`, { method: 'POST' });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? 'Enrolment failed.');
      return;
    }
    setRounds((current) =>
      current.map((round) =>
        round.id === roundId ? { ...round, enrolment_status: 'active' } : round,
      ),
    );
    setMessage('You are enrolled.');
  }

  return (
    <section className="card">
      <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-3">Challenge rounds</h2>
      {rounds.length ? (
        <div className="flex flex-col gap-3 mt-3">
          {rounds.map((round) => (
            <article key={round.id}>
              <h3 className="text-lg font-semibold text-[var(--gx-text)]">{round.title}</h3>
              <p className="text-[var(--gx-text-muted)]">
                {dateTimeFormatter.format(new Date(round.opens_at))} – {dateTimeFormatter.format(new Date(round.closes_at))}
              </p>
              {round.enrolment_status === 'active' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)] text-xs font-semibold">Enrolled</span>
              ) : (
                <button className="gx-btn gx-btn-primary" onClick={() => enrol(round.id)}>Enrol</button>
              )}
            </article>
          ))}
        </div>
      ) : <p className="text-[var(--gx-text-muted)]">No challenge rounds are currently published.</p>}
      {message ? <p role="status" className="text-[var(--gx-text-muted)]">{message}</p> : null}
    </section>
  );
}
