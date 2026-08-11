'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

export function PasswordSetupForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const candidate = new URLSearchParams(window.location.search).get('email');
    if (candidate) setEmail(candidate);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (password !== confirmation) {
      setMessage('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/password/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Your password could not be set.');
      setPassword('');
      setConfirmation('');
      setCode('');
      setComplete(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Your password could not be set.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="card mx-auto max-w-xl">
        <div className="mb-3 inline-flex text-xs font-extrabold uppercase tracking-widest text-[var(--gx-accent)]">
          Participant account
        </div>
        <h1 className="mb-4 mt-0 text-3xl font-bold leading-tight text-[var(--gx-text)]">
          Set your password
        </h1>
        {complete ? (
          <div role="status">
            <p className="text-[var(--gx-text-muted)]">
              Your password is ready. The setup code has been used and any older sessions have
              been signed out.
            </p>
            <Link className="gx-btn gx-btn-primary mt-2" href="/sign-in">
              Continue to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[var(--gx-text-muted)]">
              Enter the one-time code supplied by a GHRU Puzzles administrator. Codes expire
              after 24 hours and work only once.
            </p>
            <form className="mt-5 flex flex-col gap-4" onSubmit={submit}>
              <label className="label" htmlFor="setup-email">Email address</label>
              <input
                id="setup-email"
                className="gx-input w-full"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <label className="label" htmlFor="setup-code">One-time setup code</label>
              <input
                id="setup-code"
                className="gx-input w-full font-mono uppercase tracking-wider"
                type="text"
                autoComplete="one-time-code"
                inputMode="text"
                required
                maxLength={32}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <label className="label" htmlFor="new-password">New password</label>
              <input
                id="new-password"
                className="gx-input w-full"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <p className="-mt-2 mb-0 text-xs text-[var(--gx-text-muted)]">
                Use at least 12 characters. A long, unique passphrase is recommended.
              </p>
              <label className="label" htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                className="gx-input w-full"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
              <button className="gx-btn gx-btn-primary w-full" disabled={busy} type="submit">
                {busy ? 'Setting password…' : 'Set password'}
              </button>
            </form>
            {message ? <p className="text-sm text-red-700 dark:text-red-300" role="alert">{message}</p> : null}
            <p className="mb-0 mt-5 text-sm text-[var(--gx-text-muted)]">
              No setup code? Contact a GHRU Puzzles administrator. Codes are not sent by email.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
