'use client';

import { useEffect, useState } from 'react';
import { DEMO_MODE } from '@/lib/demo';

interface Round {
  id: string;
  title: string;
  opens_at: string;
  closes_at: string;
  enrolment_status: string | null;
}

export function RoundList() {
  const [rounds, setRounds] = useState<Round[]>(
    DEMO_MODE
      ? [{
          id: 'demo-round',
          title: '2026 GHRU Puzzles Preview Round',
          opens_at: '2026-07-20T09:00:00Z',
          closes_at: '2026-08-20T17:00:00Z',
          enrolment_status: null,
        }]
      : [],
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (DEMO_MODE) return;
    fetch('/api/rounds')
      .then((response) => response.json() as Promise<{ rounds?: Round[] }>)
      .then((result) => setRounds(result.rounds ?? []))
      .catch(() => setMessage('Rounds could not be loaded.'));
  }, []);

  async function enrol(roundId: string) {
    if (DEMO_MODE) {
      setRounds((current) =>
        current.map((round) =>
          round.id === roundId ? { ...round, enrolment_status: 'active' } : round,
        ),
      );
      setMessage('Preview enrolment complete.');
      return;
    }
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
    <section className="card gx-panel">
      <h2>Challenge rounds</h2>
      {rounds.length ? (
        <div className="gx-stack-sm">
          {rounds.map((round) => (
            <article key={round.id}>
              <h3>{round.title}</h3>
              <p className="gx-muted">
                {new Date(round.opens_at).toLocaleString()} – {new Date(round.closes_at).toLocaleString()}
              </p>
              {round.enrolment_status === 'active' ? (
                <span className="gx-tag">Enrolled</span>
              ) : (
                <button className="gx-button" onClick={() => enrol(round.id)}>Enrol</button>
              )}
            </article>
          ))}
        </div>
      ) : <p className="gx-muted">No challenge rounds are currently published.</p>}
      {message ? <p role="status" className="gx-muted">{message}</p> : null}
    </section>
  );
}
