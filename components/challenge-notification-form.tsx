'use client';

import { FormEvent, useState } from 'react';
import type { PublicChallengeRound } from '@/lib/challenge';

export function ChallengeNotificationForm({ challenge }: { challenge: PublicChallengeRound }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/challenge-notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, challengeSlug: challenge.slug }),
    });
    const result = (await response.json()) as { error?: string; message?: string };
    setBusy(false);
    setMessage(result.error ?? result.message ?? 'Registration could not be completed.');
    if (response.ok) {
      setRegistered(true);
      setEmail('');
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={register}>
      <label className="label" htmlFor="challenge-reminder-email">
        Email address
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          id="challenge-reminder-email"
          className="gx-input w-full"
          type="email"
          autoComplete="email"
          required
          disabled={busy || registered}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.org"
        />
        <button className="gx-btn gx-btn-primary whitespace-nowrap" type="submit" disabled={busy || registered}>
          {busy ? 'Registering…' : registered ? 'Reminder registered' : 'Register for reminder'}
        </button>
      </div>
      <p className="text-sm text-[var(--gx-text-muted)] m-0">
        We will use this address only for one opening-day reminder for {challenge.title}.
      </p>
      {message ? <p role="status" className="text-sm text-[var(--gx-text-muted)] m-0">{message}</p> : null}
    </form>
  );
}
